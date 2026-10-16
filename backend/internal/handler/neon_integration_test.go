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
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestNeonPartnerIntegration(t *testing.T) {
	if os.Getenv("TIENTON_NEON_INTEGRATION") != "1" {
		t.Skip("set TIENTON_NEON_INTEGRATION=1 to verify on Neon")
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
	pc.MaxConns = 2
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	pool, err := pgxpool.NewWithConfig(ctx, pc)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	schema := "verify_partner_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	quoted := pgx.Identifier{schema}.Sanitize()
	if _, err = pool.Exec(ctx, "CREATE SCHEMA "+quoted); err != nil {
		t.Fatal(err)
	}
	defer func() {
		cleanup, stop := context.WithTimeout(context.Background(), 20*time.Second)
		defer stop()
		if _, err := pool.Exec(cleanup, "DROP SCHEMA "+quoted+" CASCADE"); err != nil {
			t.Errorf("schema cleanup failed (%s): %v", schema, err)
		}
	}()
	begin := func() pgx.Tx {
		t.Helper()
		tx, err := pool.Begin(ctx)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = tx.Exec(ctx, "SET LOCAL search_path TO "+quoted+", public"); err != nil {
			_ = tx.Rollback(ctx)
			t.Fatal(err)
		}
		return tx
	}
	setup := begin()
	if _, err = setup.Exec(ctx, `CREATE TABLE users (LIKE public.users INCLUDING ALL); CREATE TABLE stories (LIKE public.stories INCLUDING ALL); CREATE TABLE chapters (LIKE public.chapters INCLUDING ALL);`); err != nil {
		_ = setup.Rollback(ctx)
		t.Fatal(err)
	}
	if err = setup.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	owner, other := uuid.New(), uuid.New()
	for _, role := range []string{"user", "partner", "creator", "narrator", "admin"} {
		t.Run(role, func(t *testing.T) {
			tx := begin()
			defer tx.Rollback(context.Background())
			id := uuid.New()
			if role == "user" {
				id = owner
			}
			if _, err := tx.Exec(ctx, `INSERT INTO users (id,username,email,role) VALUES ($1,$2,$3,$4)`, id, "verify_"+id.String()[:12], id.String()+"@example.invalid", role); err != nil {
				t.Fatal(err)
			}
			h := NewPartnerHandler(tx, nil, nil, nil)
			req := httptest.NewRequest(http.MethodPost, "/partner/become-partner", nil)
			req = req.WithContext(auth.SetClaimsToContext(ctx, &auth.AccessTokenClaims{UserID: id, Role: role}))
			response := httptest.NewRecorder()
			h.BecomePartner(response, req)
			if response.Code != http.StatusOK {
				t.Fatalf("activation failed: %d %s", response.Code, response.Body.String())
			}
			want := role
			if role == "user" {
				want = "partner"
			}
			var stored string
			if err := tx.QueryRow(ctx, `SELECT role FROM users WHERE id=$1`, id).Scan(&stored); err != nil || stored != want {
				t.Fatalf("stored role: %s, error: %v", stored, err)
			}
			if err := tx.Commit(ctx); err != nil {
				t.Fatal(err)
			}
		})
	}
	t.Run("owned and global statistics", func(t *testing.T) {
		tx := begin()
		defer tx.Rollback(context.Background())
		if _, err := tx.Exec(ctx, `INSERT INTO users (id,username,email) VALUES ($1,'other_stats','other_stats@example.invalid')`, other); err != nil {
			t.Fatal(err)
		}
		first, second := uuid.New(), uuid.New()
		if _, err := tx.Exec(ctx, `INSERT INTO stories (id,title,slug,created_by,view_count) VALUES ($1,'Owned',$3,$5,100),($2,'Other',$4,$6,400)`, first, second, first.String(), second.String(), owner, other); err != nil {
			t.Fatal(err)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO chapters (story_id,chapter_number,title,listen_count) VALUES ($1,1,'A',10),($1,2,'B',20),($2,1,'C',70)`, first, second); err != nil {
			t.Fatal(err)
		}
		h := NewPartnerHandler(tx, nil, nil, nil)
		for _, role := range []string{"partner", "admin"} {
			req := httptest.NewRequest(http.MethodGet, "/partner/stats", nil)
			req = req.WithContext(auth.SetClaimsToContext(ctx, &auth.AccessTokenClaims{UserID: owner, Role: role}))
			response := httptest.NewRecorder()
			h.GetPartnerStats(response, req)
			if response.Code != 200 {
				t.Fatalf("stats: %d %s", response.Code, response.Body.String())
			}
			var payload struct {
				Data struct {
					Stories  int64 `json:"total_stories"`
					Chapters int64 `json:"total_chapters"`
					Views    int64 `json:"total_views"`
					Listens  int64 `json:"total_listens"`
				} `json:"data"`
			}
			if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
				t.Fatal(err)
			}
			wantStories, wantChapters, wantViews, wantListens := int64(1), int64(2), int64(100), int64(30)
			if role == "admin" {
				wantStories, wantChapters, wantViews, wantListens = 2, 3, 500, 100
			}
			got := payload.Data
			if got.Stories != wantStories || got.Chapters != wantChapters || got.Views != wantViews || got.Listens != wantListens {
				t.Fatalf("%s stats: %+v", role, got)
			}
		}
	})
}
