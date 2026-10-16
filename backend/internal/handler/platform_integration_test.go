package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/IREAKING/tientonaudio/backend/config"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Every feature is exercised in an isolated schema and rolled back. Production rows are never used.
func TestNeonPlatformIntegration(t *testing.T) {
	if os.Getenv("TIENTON_NEON_INTEGRATION") != "1" {
		t.Skip("opt-in Neon integration")
	}
	cfg, err := config.LoadConfig("../../app.env")
	if err != nil {
		t.Fatal(err)
	}
	pc, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		t.Fatal("invalid database configuration")
	}
	if !strings.HasSuffix(pc.ConnConfig.Host, ".neon.tech") {
		t.Fatal("Neon endpoint required")
	}
	pc.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	pool, err := pgxpool.NewWithConfig(ctx, pc)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(context.Background())
	schema := pgx.Identifier{"verify_platform_" + strings.ReplaceAll(uuid.NewString(), "-", "")}.Sanitize()
	if _, err = tx.Exec(ctx, "CREATE SCHEMA "+schema+"; SET LOCAL search_path TO "+schema+", public"); err != nil {
		t.Fatal(err)
	}
	source, err := os.ReadFile("../../db/migrations/schema.sql")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(ctx, string(source)); err != nil {
		t.Fatal(err)
	}
	h := NewPlatformHandler(tx)
	owner, other, admin, story, chapter := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := tx.Exec(ctx, sql, args...); err != nil {
			t.Fatal(err)
		}
	}
	for _, u := range []struct {
		id   uuid.UUID
		role string
	}{{owner, "partner"}, {other, "user"}, {admin, "admin"}} {
		exec(`INSERT INTO users(id,username,email,role,is_email_verified)VALUES($1,$2,$3,$4,TRUE)`, u.id, u.id.String(), u.id.String()+"@example.invalid", u.role)
	}
	exec(`INSERT INTO stories(id,title,slug,created_by,publication_status)VALUES($1,$2,'verify-platform',$3,'published')`, story, strings.Repeat("a", 255), owner)
	exec(`INSERT INTO chapters(id,story_id,chapter_number,title,publication_status)VALUES($1,$2,1,'Draft chapter','draft')`, chapter, story)
	call := func(method, path, body, role string, user uuid.UUID, fn http.HandlerFunc, params ...string) *httptest.ResponseRecorder {
		t.Helper()
		r := httptest.NewRequest(method, path, strings.NewReader(body))
		ctx := auth.SetClaimsToContext(ctx, &auth.AccessTokenClaims{UserID: user, Role: role})
		route := chi.NewRouteContext()
		for i := 0; i < len(params); i += 2 {
			route.URLParams.Add(params[i], params[i+1])
		}
		r = r.WithContext(context.WithValue(ctx, chi.RouteCtxKey, route))
		w := httptest.NewRecorder()
		fn(w, r)
		return w
	}
	expect := func(w *httptest.ResponseRecorder, status int) {
		t.Helper()
		if w.Code != status {
			t.Errorf("status=%d want=%d body=%s", w.Code, status, w.Body.String())
		}
	}
	t.Run("draft privacy and publication permissions", func(t *testing.T) {
		expect(call("GET", "/chapter", "", "user", other, func(w http.ResponseWriter, r *http.Request) {
			h.PublicChapter(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(204) })).ServeHTTP(w, r)
		}, "id", chapter.String()), 404)
		expect(call("PUT", "/publication", `{"status":"published"}`, "partner", owner, h.ChapterPublication, "id", chapter.String()), 403)
		expect(call("GET", "/draft", "", "partner", other, h.DraftChapter, "id", chapter.String()), 404)
	})
	t.Run("followers notified once and public chapter visible", func(t *testing.T) {
		expect(call("PUT", "/follow", "", "user", other, h.FollowStory, "id", story.String()), 200)
		expect(call("PUT", "/publication", `{"status":"published"}`, "admin", admin, h.ChapterPublication, "id", chapter.String()), 200)
		expect(call("PUT", "/publication", `{"status":"published"}`, "admin", admin, h.ChapterPublication, "id", chapter.String()), 200)
		var count int
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM notifications WHERE user_id=$1 AND reference_id=$2`, other, chapter).Scan(&count); err != nil || count != 1 {
			t.Fatalf("notifications=%d err=%v", count, err)
		}
		expect(call("GET", "/chapter", "", "user", other, func(w http.ResponseWriter, r *http.Request) {
			h.PublicChapter(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(204) })).ServeHTTP(w, r)
		}, "id", chapter.String()), 204)
	})
	t.Run("bulk import rollback and ownership", func(t *testing.T) {
		body := `{"chapters":[{"chapter_number":2,"title":"new","content":"text","is_premium":false},{"chapter_number":1,"title":"duplicate","content":"text","is_premium":false}]}`
		expect(call("POST", "/bulk", body, "partner", owner, h.BulkDraftChapters, "id", story.String()), 409)
		var count int
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM chapters WHERE story_id=$1 AND chapter_number=2`, story).Scan(&count); err != nil || count != 0 {
			t.Fatal("partial bulk import")
		}
		expect(call("POST", "/bulk", `{"chapters":[{"chapter_number":2,"title":"new","content":"text","is_premium":false}]}`, "partner", other, h.BulkDraftChapters, "id", story.String()), 404)
	})
	t.Run("successful bulk remains private and reviews aggregate correctly", func(t *testing.T) {
		body := `{"chapters":[{"chapter_number":2,"title":"Imported draft","content":"Content","is_premium":false},{"chapter_number":3,"title":"Second draft","content":"More content","is_premium":true}]}`
		expect(call("POST", "/bulk", body, "partner", owner, h.BulkDraftChapters, "id", story.String()), 201)
		var count, publicCount int
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM chapters WHERE story_id=$1 AND publication_status='draft'`, story).Scan(&count); err != nil || count != 2 {
			t.Fatalf("draft count %d %v", count, err)
		}
		if err := tx.QueryRow(ctx, `SELECT total_chapters FROM stories WHERE id=$1`, story).Scan(&publicCount); err != nil || publicCount != 1 {
			t.Fatalf("public count %d %v", publicCount, err)
		}
		expect(call("PUT", "/reviews", `{"rating":5,"content":"Great story"}`, "user", other, h.Reviews, "id", story.String()), 200)
		expect(call("PUT", "/reviews", `{"rating":3,"content":"Updated review"}`, "user", other, h.Reviews, "id", story.String()), 200)
		var rating float64
		if err := tx.QueryRow(ctx, `SELECT rating_avg::float8,rating_count FROM stories WHERE id=$1`, story).Scan(&rating, &count); err != nil || rating != 3 || count != 1 {
			t.Fatalf("review aggregate %v %d %v", rating, count, err)
		}
		expect(call("DELETE", "/reviews", "", "user", other, h.Reviews, "id", story.String()), 200)
	})

	t.Run("support privacy and admin reply", func(t *testing.T) {
		body := `{"subject":"Test support","category":"bug","content":"A reproducible issue for integration test"}`
		expect(call("POST", "/tickets", body, "user", owner, h.Tickets), 201)
		var id uuid.UUID
		if err := tx.QueryRow(ctx, `SELECT id FROM support_tickets WHERE user_id=$1`, owner).Scan(&id); err != nil {
			t.Fatal(err)
		}
		expect(call("GET", "/messages", "", "user", other, h.TicketMessages, "id", id.String()), 404)
		expect(call("POST", "/messages", `{"content":"Resolved in test","status":"resolved"}`, "admin", admin, h.TicketMessages, "id", id.String()), 200)
		expect(call("POST", "/messages", `{"content":"Another reply"}`, "user", owner, h.TicketMessages, "id", id.String()), 409)
	})
	t.Run("achievement eligibility and single grant", func(t *testing.T) {
		expect(call("POST", "/claim", "", "user", other, h.Achievements, "key", "first-hour"), 400)
		exec(`INSERT INTO listening_reward_events(user_id,chapter_id)SELECT $1,$2 FROM generate_series(1,12)`, other, chapter)
		expect(call("POST", "/claim", "", "user", other, h.Achievements, "key", "first-hour"), 200)
		expect(call("POST", "/claim", "", "user", other, h.Achievements, "key", "first-hour"), 409)
		var exp int
		if err := tx.QueryRow(ctx, `SELECT cultivation_exp FROM users WHERE id=$1`, other).Scan(&exp); err != nil || exp != 50 {
			t.Fatalf("unexpected EXP %d %v", exp, err)
		}
	})
	t.Run("payment conditions remain fixed after editing plan", func(t *testing.T) {
		var id int
		if err := tx.QueryRow(ctx, `INSERT INTO subscription_plans(name,price,duration_days)VALUES('Original plan',10000,30)RETURNING id`).Scan(&id); err != nil {
			t.Fatal(err)
		}
		planID := int32(id)
		status := "pending"
		if _, err := db.New(tx).CreatePayment(ctx, db.CreatePaymentParams{UserID: owner, PlanID: &planID, Price: utils.Float64ToNumeric(10000), Provider: "vietqr", Status: &status}); err != nil {
			t.Fatal(err)
		}
		expect(call("PUT", "/plans", `{"name":"Changed plan","price":20000,"duration_days":90,"description":"Updated","is_active":false}`, "admin", admin, h.AdminPlans, "id", jsonNumber(id)), 200)
		var name string
		var days int
		if err := tx.QueryRow(ctx, `SELECT plan_name,duration_days FROM payments WHERE user_id=$1 AND plan_id=$2`, owner, id).Scan(&name, &days); err != nil || name != "Original plan" || days != 30 {
			t.Fatalf("snapshot changed %s %d %v", name, days, err)
		}
	})
	t.Run("scheduled chapters only publish when due", func(t *testing.T) {
		due, future := uuid.New(), uuid.New()
		exec(`INSERT INTO chapters(id,story_id,chapter_number,title,publication_status,scheduled_at)VALUES($1,$3,5,'Due','scheduled',CURRENT_TIMESTAMP-INTERVAL '1 hour'),($2,$3,6,'Future','scheduled',CURRENT_TIMESTAMP+INTERVAL '1 hour')`, due, future, story)
		if err := SchedulePublications(ctx, tx); err != nil {
			t.Fatal(err)
		}
		var a, b string
		if err := tx.QueryRow(ctx, `SELECT a.publication_status,b.publication_status FROM chapters a,chapters b WHERE a.id=$1 AND b.id=$2`, due, future).Scan(&a, &b); err != nil || a != "published" || b != "scheduled" {
			t.Fatalf("schedule %s %s %v", a, b, err)
		}
	})
	t.Run("realm edit conflict and preserving EXP", func(t *testing.T) {
		original := domain.GetCultivationRealms()
		defer domain.SetCultivationRealms(original)
		source, err := os.ReadFile("../../db/migrations/20261014_cultivation_catalogue.sql")
		if err != nil {
			t.Fatal(err)
		}
		exec(strings.ReplaceAll(strings.ReplaceAll(string(source), "BEGIN;", ""), "COMMIT;", ""))
		response := call("GET", "/realms", "", "admin", admin, h.AdminRealms)
		expect(response, 200)
		var envelope struct {
			Data struct {
				Realms  []domain.CultivationRealmInfo `json:"realms"`
				Version string                        `json:"version"`
			} `json:"data"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &envelope); err != nil {
			t.Fatal(err)
		}
		envelope.Data.Realms[0].Description = "Updated in isolated integration test"
		payload, _ := json.Marshal(envelope.Data)
		expect(call("PUT", "/realms", string(payload), "admin", admin, h.AdminRealms), 200)
		expect(call("PUT", "/realms", string(payload), "admin", admin, h.AdminRealms), 409)
		var exp int
		if err := tx.QueryRow(ctx, `SELECT cultivation_exp FROM users WHERE id=$1`, other).Scan(&exp); err != nil || exp != 50 {
			t.Fatal("realm edit altered EXP")
		}
		expect(call("PUT", "/realms", string(payload), "user", other, h.AdminRealms), 403)
	})
	t.Run("unlink refuses last login method", func(t *testing.T) {
		exec(`INSERT INTO oauth_accounts(user_id,provider,provider_user_id)VALUES($1,'google',$2)`, other, uuid.NewString())
		expect(call("DELETE", "/unlink", "", "user", other, h.LinkedAccounts, "provider", "google"), 409)
		exec(`UPDATE users SET password_hash='integration-placeholder' WHERE id=$1`, other)
		expect(call("DELETE", "/unlink", "", "user", other, h.LinkedAccounts, "provider", "google"), 200)
	})

	t.Run("search filters and progress ownership", func(t *testing.T) {
		expect(call("GET", "/catalogue/search?min_chapters=invalid", "", "user", other, h.Search), 400)
		expect(call("GET", "/catalogue/search?min_chapters=1", "", "user", other, h.Search), 200)
		exec(`INSERT INTO listening_history(user_id,chapter_id,story_id,last_position_seconds)VALUES($1,$2,$3,123)`, owner, chapter, story)
		response := call("GET", "/progress", "", "user", other, h.ChapterProgress, "id", chapter.String())
		expect(response, 200)
		if strings.Contains(response.Body.String(), "123") {
			t.Fatal("another account's progress leaked")
		}
		expect(call("GET", "/resume", "", "user", owner, h.ContinueListening), 200)
	})
	t.Run("draft saves require ownership version and draft status", func(t *testing.T) {
		var id uuid.UUID
		if err := tx.QueryRow(ctx, `SELECT id FROM chapters WHERE story_id=$1 AND chapter_number=2`, story).Scan(&id); err != nil {
			t.Fatal(err)
		}
		response := call("GET", "/draft", "", "partner", owner, h.DraftChapter, "id", id.String())
		expect(response, 200)
		var envelope struct {
			Data chapterDraft `json:"data"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &envelope); err != nil {
			t.Fatal(err)
		}
		original := envelope.Data
		payload := func(version int64, title string) string {
			b, _ := json.Marshal(map[string]any{"version": version, "title": title, "content": "New draft content", "chapter_number": 2, "is_premium": false})
			return string(b)
		}
		expect(call("PUT", "/draft", payload(original.Version, "First save"), "partner", other, h.EditDraft, "id", id.String()), 404)
		expect(call("PUT", "/draft", payload(original.Version, "First save"), "partner", owner, h.EditDraft, "id", id.String()), 200)
		stale := call("PUT", "/draft", payload(original.Version, "Stale overwrite"), "partner", owner, h.EditDraft, "id", id.String())
		expect(stale, 409)
		if !strings.Contains(stale.Body.String(), "draft_conflict") {
			t.Fatal("missing conflict code")
		}
		expect(call("PUT", "/publication", `{"status":"pending"}`, "partner", owner, h.ChapterPublication, "id", id.String()), 200)
		expect(call("PUT", "/draft", payload(original.Version+2, "Edit pending"), "partner", owner, h.EditDraft, "id", id.String()), 409)
		expect(call("PUT", "/publication", `{"status":"draft"}`, "admin", admin, h.ChapterPublication, "id", id.String()), 400)
		expect(call("PUT", "/publication", `{"status":"draft","reason":"Please clarify the opening scene"}`, "admin", admin, h.ChapterPublication, "id", id.String()), 200)
		var reason, title string
		var count int
		if err := tx.QueryRow(ctx, `SELECT review_reason,title FROM chapters WHERE id=$1`, id).Scan(&reason, &title); err != nil || title != "First save" || reason != "Please clarify the opening scene" {
			t.Fatalf("draft changed incorrectly %s %s %v", reason, title, err)
		}
		if err := tx.QueryRow(ctx, `SELECT count(*)FROM notifications WHERE user_id=$1 AND reference_id=$2 AND type='publication_review'`, owner, id).Scan(&count); err != nil || count != 1 {
			t.Fatalf("review notification %d %v", count, err)
		}
		expect(call("PUT", "/publication", `{"status":"draft","reason":"Please clarify the opening scene"}`, "admin", admin, h.ChapterPublication, "id", id.String()), 200)
		if err := tx.QueryRow(ctx, `SELECT count(*)FROM notifications WHERE user_id=$1 AND reference_id=$2 AND type='publication_review'`, owner, id).Scan(&count); err != nil || count != 1 {
			t.Fatal("duplicate review notification")
		}
	})
	t.Run("pagination scopes owners and returns old support messages", func(t *testing.T) {
		exec(`INSERT INTO stories(title,slug,created_by,publication_status)SELECT 'Draft '||n,'verify-owner-'||n,$1,'draft'FROM generate_series(1,45)n`, owner)
		exec(`INSERT INTO stories(title,slug,created_by,publication_status)SELECT 'Other '||n,'verify-other-'||n,$1,'draft'FROM generate_series(1,7)n`, other)
		type pageEnvelope struct {
			Data struct {
				Items []struct {
					ID      uuid.UUID `json:"id"`
					Content string    `json:"content"`
				} `json:"items"`
				Total      int `json:"total"`
				Page       int `json:"page"`
				TotalPages int `json:"total_pages"`
			} `json:"data"`
		}
		first := call("GET", "/publications?page=1&limit=20", "", "partner", owner, h.Publications)
		expect(first, 200)
		second := call("GET", "/publications?page=2&limit=20", "", "partner", owner, h.Publications)
		expect(second, 200)
		var a, b pageEnvelope
		if err := json.Unmarshal(first.Body.Bytes(), &a); err != nil {
			t.Fatal(err)
		}
		if err := json.Unmarshal(second.Body.Bytes(), &b); err != nil {
			t.Fatal(err)
		}
		if a.Data.Total != 46 || b.Data.Total != 46 || len(a.Data.Items) != 20 || len(b.Data.Items) != 20 || b.Data.Page != 2 {
			t.Fatalf("invalid page metadata %s %s", first.Body.String(), second.Body.String())
		}
		seen := map[uuid.UUID]bool{}
		for _, v := range a.Data.Items {
			seen[v.ID] = true
		}
		for _, v := range b.Data.Items {
			if seen[v.ID] {
				t.Fatal("duplicate item across stable pages")
			}
		}
		expect(call("GET", "/publications?page=0", "", "partner", owner, h.Publications), 400)
		var ticket uuid.UUID
		if err := tx.QueryRow(ctx, `SELECT id FROM support_tickets WHERE user_id=$1`, owner).Scan(&ticket); err != nil {
			t.Fatal(err)
		}
		exec(`INSERT INTO support_messages(ticket_id,sender_id,content,created_at)SELECT $1,$2,'message '||n,CURRENT_TIMESTAMP+n*INTERVAL '1 second'FROM generate_series(1,525)n`, ticket, owner)
		messages := call("GET", "/messages?page=2&limit=20", "", "partner", owner, h.TicketMessages, "id", ticket.String())
		expect(messages, 200)
		var m pageEnvelope
		if err := json.Unmarshal(messages.Body.Bytes(), &m); err != nil {
			t.Fatal(err)
		}
		if m.Data.Total != 527 || len(m.Data.Items) != 20 || m.Data.Items[0].Content != "message 505" {
			t.Fatalf("older messages missing: %s", messages.Body.String())
		}
		expect(call("GET", "/messages?page=1", "", "user", other, h.TicketMessages, "id", ticket.String()), 404)
		chaptersPage := call("GET", "/chapters?page=1&limit=2", "", "partner", owner, h.PublicationChapters, "id", story.String())
		expect(chaptersPage, 200)
		var c pageEnvelope
		if err := json.Unmarshal(chaptersPage.Body.Bytes(), &c); err != nil || len(c.Data.Items) != 2 {
			t.Fatalf("chapter page %s", chaptersPage.Body.String())
		}
	})

}
func jsonNumber(i int) string { b, _ := json.Marshal(i); return string(b) }
