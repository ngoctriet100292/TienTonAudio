package repository

import (
	"context"
	"errors"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/IREAKING/tientonaudio/backend/config"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Opt-in only: temporary schema on the selected Neon database. Every operation
// sets search_path inside its own transaction, including on transaction poolers.
func TestNeonListeningIntegration(t *testing.T) {
	if os.Getenv("TIENTON_NEON_INTEGRATION") != "1" {
		t.Skip("set TIENTON_NEON_INTEGRATION=1 to verify on Neon")
	}
	cfg, err := config.LoadConfig("../../app.env")
	if err != nil {
		t.Fatal(err)
	}
	poolConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		t.Fatal("invalid database configuration")
	}
	if !strings.HasSuffix(poolConfig.ConnConfig.Host, ".neon.tech") {
		t.Fatal("integration test requires the selected Neon endpoint")
	}
	poolConfig.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	poolConfig.MaxConns = 6
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()
	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	if err = pool.Ping(ctx); err != nil {
		t.Fatal(err)
	}
	var migrated bool
	if err = pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_listening_reward_at')`).Scan(&migrated); err != nil || !migrated {
		t.Fatalf("Neon migration not available: %v", err)
	}

	schema := "verify_listening_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	quoted := pgx.Identifier{schema}.Sanitize()
	if _, err = pool.Exec(ctx, "CREATE SCHEMA "+quoted); err != nil {
		t.Fatal(err)
	}
	defer func() {
		cleanup, stop := context.WithTimeout(context.Background(), 20*time.Second)
		defer stop()
		if _, err := pool.Exec(cleanup, "DROP SCHEMA "+quoted+" CASCADE"); err != nil {
			t.Errorf("temporary schema cleanup failed (%s): %v", schema, err)
		}
	}()
	begin := func() (pgx.Tx, error) {
		tx, err := pool.Begin(ctx)
		if err != nil {
			return nil, err
		}
		if _, err = tx.Exec(ctx, "SET LOCAL search_path TO "+quoted+", public"); err != nil {
			_ = tx.Rollback(context.Background())
			return nil, err
		}
		return tx, nil
	}
	run := func(fn func(pgx.Tx) error) {
		t.Helper()
		tx, err := begin()
		if err != nil {
			t.Fatal(err)
		}
		defer tx.Rollback(context.Background())
		if err = fn(tx); err != nil {
			t.Fatal(err)
		}
		if err = tx.Commit(ctx); err != nil {
			t.Fatal(err)
		}
	}
	source, err := os.ReadFile("../../db/migrations/schema.sql")
	if err != nil {
		t.Fatal(err)
	}
	run(func(tx pgx.Tx) error { _, err := tx.Exec(ctx, string(source)); return err })
	t.Run("explicit OAuth linking cannot claim another account", func(t *testing.T) {
		first, second := uuid.New(), uuid.New()
		subject := uuid.NewString()
		run(func(tx pgx.Tx) error {
			_, err := tx.Exec(ctx, `INSERT INTO users(id,username,email,is_email_verified)VALUES($1,$3,$5,TRUE),($2,$4,$6,TRUE)`, first, second, first.String(), second.String(), first.String()+"@example.invalid", second.String()+"@example.invalid")
			return err
		})
		identity := domain.OAuthIdentity{Provider: "google", Subject: subject, Email: first.String() + "@example.invalid", EmailVerified: true}
		tx, err := begin()
		if err != nil {
			t.Fatal(err)
		}
		if err = linkOAuthIdentity(ctx, first, identity, tx); err != nil {
			t.Fatal(err)
		}
		tx, err = begin()
		if err != nil {
			t.Fatal(err)
		}
		if err = linkOAuthIdentity(ctx, second, identity, tx); !errors.Is(err, ErrOAuthEmailConflict) {
			t.Fatalf("expected link conflict: %v", err)
		}
	})

	t.Run("refresh rotation rolls back on failure and commits replay revocation", func(t *testing.T) {
		tx, err := begin()
		if err != nil {
			t.Fatal(err)
		}
		defer tx.Rollback(context.Background())
		id := uuid.New()
		if _, err = tx.Exec(ctx, `INSERT INTO users(id,username,email,is_email_verified)VALUES($1,$2,$3,TRUE)`, id, id.String(), id.String()+"@example.invalid"); err != nil {
			t.Fatal(err)
		}
		if _, err = tx.Exec(ctx, `INSERT INTO refresh_tokens(user_id,token_hash,expires_at)VALUES($1,'old-refresh-fixture',CURRENT_TIMESTAMP+INTERVAL '1 day')`, id); err != nil {
			t.Fatal(err)
		}
		repo := NewUserRepository(db.New(tx), tx).(*userRepo)
		fail := errors.New("simulated replacement persistence failure")
		err = repo.WithRefreshTransaction(ctx, "old-refresh-fixture", func(r UserRepository) error {
			if e := r.RevokeRefreshToken(ctx, "old-refresh-fixture"); e != nil {
				return e
			}
			return fail
		})
		if !errors.Is(err, fail) {
			t.Fatal(err)
		}
		var revoked bool
		if err = tx.QueryRow(ctx, `SELECT revoked FROM refresh_tokens WHERE token_hash='old-refresh-fixture'`).Scan(&revoked); err != nil || revoked {
			t.Fatal("failed rotation revoked valid session")
		}
		err = repo.WithRefreshTransaction(ctx, "old-refresh-fixture", func(r UserRepository) error {
			if e := r.RevokeRefreshToken(ctx, "old-refresh-fixture"); e != nil {
				return e
			}
			_, e := r.CreateRefreshToken(ctx, db.CreateRefreshTokenParams{UserID: id, TokenHash: "new-refresh-fixture", ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(time.Hour), Valid: true}})
			return e
		})
		if err != nil {
			t.Fatal(err)
		}
		err = repo.WithRefreshTransaction(ctx, "old-refresh-fixture", func(r UserRepository) error {
			if e := r.RevokeAllUserRefreshTokens(ctx, id); e != nil {
				return e
			}
			return domain.ErrInvalidSession
		})
		if !errors.Is(err, domain.ErrInvalidSession) {
			t.Fatal(err)
		}
		if err = tx.QueryRow(ctx, `SELECT revoked FROM refresh_tokens WHERE token_hash='new-refresh-fixture'`).Scan(&revoked); err != nil || !revoked {
			t.Fatal("replay revocation rolled back")
		}
	})

	t.Run("database catalogue edits and idempotent seed", func(t *testing.T) {
		tx, err := begin()
		if err != nil {
			t.Fatal(err)
		}
		defer tx.Rollback(context.Background())
		sql, err := os.ReadFile("../../db/migrations/20261014_cultivation_catalogue.sql")
		if err != nil {
			t.Fatal(err)
		}
		seed := strings.ReplaceAll(strings.ReplaceAll(string(sql), "BEGIN;", ""), "COMMIT;", "")
		if _, err = tx.Exec(ctx, seed); err != nil {
			t.Fatal(err)
		}
		realms, err := LoadCultivationRealms(ctx, tx)
		if err != nil || len(realms) != 34 {
			t.Fatalf("initial catalogue: %d, %v", len(realms), err)
		}
		original := domain.GetCultivationRealms()
		defer domain.SetCultivationRealms(original)
		if _, err = tx.Exec(ctx, `UPDATE cultivation_realms SET min_exp = 330000, name = 'Kết Đan kiểm thử' WHERE level = 12`); err != nil {
			t.Fatal(err)
		}
		if _, err = tx.Exec(ctx, seed); err != nil {
			t.Fatal(err)
		}
		if err = RefreshCultivationRealms(ctx, tx); err != nil {
			t.Fatal(err)
		}
		name, _, _, _, _, _ := domain.CalculateCultivationRealm(310000)
		if name != "Trúc Cơ" {
			t.Fatalf("edited threshold not applied: %s", name)
		}
		name, _, _, _, _, _ = domain.CalculateCultivationRealm(330000)
		if name != "Kết Đan kiểm thử" {
			t.Fatalf("seed overwrote custom name: %s", name)
		}
		if _, err = tx.Exec(ctx, `DELETE FROM cultivation_realms WHERE level = 12`); err != nil {
			t.Fatal(err)
		}
		if err = RefreshCultivationRealms(ctx, tx); err == nil {
			t.Fatal("invalid catalogue was accepted")
		}
		name, _, _, _, _, _ = domain.CalculateCultivationRealm(330000)
		if name != "Kết Đan kiểm thử" {
			t.Fatalf("invalid refresh replaced valid snapshot: %s", name)
		}
	})
	t.Run("plan normalization preserves commercial values", func(t *testing.T) {
		tx, err := begin()
		if err != nil {
			t.Fatal(err)
		}
		defer tx.Rollback(context.Background())
		if _, err = tx.Exec(ctx, `UPDATE subscription_plans SET name = 'Tên cũ', description = 'Mô tả cũ' WHERE id IN (1,2,3); UPDATE subscription_plans SET price = 51000 WHERE id = 1`); err != nil {
			t.Fatal(err)
		}
		sql, err := os.ReadFile("../../db/migrations/20261014_subscription_plans.sql")
		if err != nil {
			t.Fatal(err)
		}
		migration := strings.ReplaceAll(strings.ReplaceAll(string(sql), "BEGIN;", ""), "COMMIT;", "")
		for i := 0; i < 2; i++ {
			if _, err = tx.Exec(ctx, migration); err != nil {
				t.Fatal(err)
			}
		}
		for i, want := range []string{"Kết Đan (30 ngày)", "Nguyên Anh (90 ngày)", "Tiên Vương (365 ngày)"} {
			plan, err := db.New(tx).GetSubscriptionPlanByID(ctx, int32(i+1))
			if err != nil {
				t.Fatal(err)
			}
			if plan.Name != want || plan.DurationDays != []int32{30, 90, 365}[i] || plan.Description == nil || strings.Contains(*plan.Description, "Mô tả cũ") {
				t.Fatalf("invalid normalized plan: %+v", plan)
			}
			var price int
			if err = tx.QueryRow(ctx, `SELECT price::integer FROM subscription_plans WHERE id = $1`, i+1).Scan(&price); err != nil {
				t.Fatal(err)
			}
			if price != []int{51000, 129000, 449000}[i] {
				t.Fatalf("price changed: %d", price)
			}
		}
	})
	t.Run("OAuth identity and browser-bound one-use sessions", func(t *testing.T) {
		tx, err := begin()
		if err != nil {
			t.Fatal(err)
		}
		defer tx.Rollback(context.Background())
		suffix := uuid.NewString()
		identity := domain.OAuthIdentity{Provider: "google", Subject: "subject-" + suffix, Email: suffix + "@example.invalid", EmailVerified: true}
		id, created, err := resolveOAuthIdentity(ctx, tx, identity)
		if err != nil || !created {
			t.Fatalf("first OAuth login: %v", err)
		}
		profile, err := db.New(tx).GetUserByID(ctx, id)
		if err != nil || !profile.IsEmailVerified || profile.PasswordHash != nil || profile.Role == nil || *profile.Role != "user" {
			t.Fatalf("invalid OAuth user: %+v %v", profile, err)
		}
		linked := identity
		linked.Email = "different@example.invalid"
		sameID, created, err := resolveOAuthIdentity(ctx, tx, linked)
		if err != nil || created || sameID != id {
			t.Fatal("linked subject did not resolve to original account")
		}
		other := identity
		other.Provider = "facebook"
		other.Subject = "different-subject"
		if _, _, err = resolveOAuthIdentity(ctx, tx, other); !errors.Is(err, ErrOAuthEmailConflict) {
			t.Fatalf("email alone claimed account: %v", err)
		}
		other.Email = "fb-" + identity.Email
		fbID, _, err := resolveOAuthIdentity(ctx, tx, other)
		if err != nil {
			t.Fatal(err)
		}
		fb, err := db.New(tx).GetUserByID(ctx, fbID)
		if err != nil || fb.IsEmailVerified {
			t.Fatal("Facebook email auto-verified")
		}
		store := &oauthRepo{store: tx}
		flow := OAuthFlow{Provider: "google", BrowserHash: "bound-browser", SessionData: "goth-session", RedirectPath: "/settings"}
		if err = store.SaveFlow(ctx, "state-hash", flow); err != nil {
			t.Fatal(err)
		}
		if _, err = store.ConsumeFlow(ctx, "state-hash", "wrong-browser", "google"); err == nil {
			t.Fatal("wrong browser consumed flow")
		}
		if _, err = store.ConsumeFlow(ctx, "state-hash", "bound-browser", "facebook"); err == nil {
			t.Fatal("wrong provider consumed flow")
		}
		if _, err = store.ConsumeFlow(ctx, "state-hash", "bound-browser", "google"); err != nil {
			t.Fatal(err)
		}
		if _, err = store.ConsumeFlow(ctx, "state-hash", "bound-browser", "google"); err == nil {
			t.Fatal("state replay accepted")
		}
		code := OAuthCode{Provider: "google", BrowserHash: "bound-browser", UserID: id, RedirectPath: "/settings"}
		if err = store.SaveCode(ctx, "code-hash", code); err != nil {
			t.Fatal(err)
		}
		if _, err = store.ConsumeCode(ctx, "code-hash", "wrong-browser", "google"); err == nil {
			t.Fatal("wrong browser consumed code")
		}
		if _, err = store.ConsumeCode(ctx, "code-hash", "bound-browser", "google"); err != nil {
			t.Fatal(err)
		}
		if _, err = store.ConsumeCode(ctx, "code-hash", "bound-browser", "google"); err == nil {
			t.Fatal("login code replay accepted")
		}
		if err = store.SaveCode(ctx, "expired-code", code); err != nil {
			t.Fatal(err)
		}
		if _, err = tx.Exec(ctx, `UPDATE oauth_login_codes SET expires_at=CURRENT_TIMESTAMP-INTERVAL '1 second' WHERE code_hash='expired-code'`); err != nil {
			t.Fatal(err)
		}
		if _, err = store.ConsumeCode(ctx, "expired-code", "bound-browser", "google"); err == nil {
			t.Fatal("expired code accepted")
		}
		token := "email-proof"
		hashed := auth.HashTokenSHA256(token)
		if _, err = tx.Exec(ctx, `INSERT INTO email_verification_tokens(user_id,token,expires_at)VALUES($1,$2,CURRENT_TIMESTAMP+INTERVAL '1 minute')`, fbID, hashed); err != nil {
			t.Fatal(err)
		}
		repo := NewUserRepository(db.New(tx))
		if _, err = repo.ConsumeEmailVerificationToken(ctx, hashed); err == nil {
			t.Fatal("token hash accepted as email proof")
		}
		if _, err = repo.ConsumeEmailVerificationToken(ctx, token); err != nil {
			t.Fatal(err)
		}
		if _, err = repo.ConsumeEmailVerificationToken(ctx, token); err == nil {
			t.Fatal("email token replay accepted")
		}
	})
	user, story, free, premium := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	createUser := func(tx pgx.Tx, id uuid.UUID, startClock bool) error {
		_, err := tx.Exec(ctx, `INSERT INTO users (id, username, email, last_listening_reward_at) VALUES ($1,$2,$3,CASE WHEN $4 THEN clock_timestamp() - INTERVAL '10 minutes' ELSE NULL END)`, id, "verify_"+id.String()[:12], id.String()+"@example.invalid", startClock)
		return err
	}
	run(func(tx pgx.Tx) error {
		if err := createUser(tx, user, false); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO stories (id,title,slug,created_by) VALUES ($1,'Integration verification',$2,$3)`, story, "verify_"+story.String(), user); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `INSERT INTO chapters (id,story_id,chapter_number,title,duration_seconds,is_premium) VALUES ($1,$3,1,'Free',100,FALSE),($2,$3,2,'Premium',100,TRUE)`, free, premium, story)
		return err
	})
	save := func(id uuid.UUID, req domain.ListeningProgressReq) error {
		tx, err := begin()
		if err != nil {
			return err
		}
		return saveListeningProgressTransaction(ctx, tx, id, req)
	}
	read := func(id uuid.UUID, chapter uuid.UUID) (int64, int32, bool) {
		t.Helper()
		var exp int64
		var position int32
		var completed bool
		run(func(tx pgx.Tx) error {
			return tx.QueryRow(ctx, `SELECT u.cultivation_exp,COALESCE(h.last_position_seconds,0),COALESCE(h.is_completed,FALSE) FROM users u LEFT JOIN listening_history h ON h.user_id=u.id AND h.chapter_id=$2 WHERE u.id=$1`, id, chapter).Scan(&exp, &position, &completed)
		})
		return exp, position, completed
	}

	t.Run("first event and SQLC user scan", func(t *testing.T) {
		if err := save(user, domain.ListeningProgressReq{ChapterID: free, LastPositionSeconds: 1, IsCompleted: true}); err != nil {
			t.Fatal(err)
		}
		exp, _, done := read(user, free)
		if exp != 0 || done {
			t.Fatalf("first event: exp=%d completed=%v", exp, done)
		}
		run(func(tx pgx.Tx) error {
			row, err := db.New(tx).GetUserByID(ctx, user)
			if err == nil && !row.LastListeningRewardAt.Valid {
				return errors.New("SQLC reward timestamp missing")
			}
			return err
		})
	})

	t.Run("realm migration preserves EXP", func(t *testing.T) {
		source, err := os.ReadFile("../../db/migrations/20261014_expanded_cultivation.sql")
		if err != nil {
			t.Fatal(err)
		}
		sql := strings.Replace(string(source), "BEGIN;\n", "", 1)
		sql = strings.Replace(sql, "COMMIT;\n", "", 1)
		ids := []uuid.UUID{uuid.New(), uuid.New(), uuid.New(), uuid.New()}
		exps := []int64{0, 300000, 8500000, 20000000}
		names := []string{"Phàm Nhân", "Kết Đan", "Tiên Quân", "Tiên Đế"}
		run(func(tx pgx.Tx) error {
			for i, id := range ids {
				if err := createUser(tx, id, false); err != nil {
					return err
				}
				if _, err := tx.Exec(ctx, `UPDATE users SET cultivation_exp = $2, cultivation_realm = 'Luyện Khí' WHERE id = $1`, id, exps[i]); err != nil {
					return err
				}
			}
			if _, err := tx.Exec(ctx, sql); err != nil {
				return err
			}
			for i, id := range ids {
				row, err := db.New(tx).GetUserByID(ctx, id)
				if err != nil {
					return err
				}
				if row.CultivationExp == nil || *row.CultivationExp != exps[i] || row.CultivationRealm == nil || *row.CultivationRealm != names[i] {
					return errors.New("realm migration changed EXP or selected an incorrect realm")
				}
			}
			return nil
		})
	})

	t.Run("concurrent reward and replay", func(t *testing.T) {
		run(func(tx pgx.Tx) error {
			_, err := tx.Exec(ctx, `UPDATE users SET last_listening_reward_at=clock_timestamp()-INTERVAL '10 minutes' WHERE id=$1`, user)
			return err
		})
		var wg sync.WaitGroup
		errs := make(chan error, 18)
		for i := 0; i < 18; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				errs <- save(user, domain.ListeningProgressReq{ChapterID: free, StoryID: story, LastPositionSeconds: 50})
			}()
		}
		wg.Wait()
		close(errs)
		for err := range errs {
			if err != nil {
				t.Fatal(err)
			}
		}
		exp, position, _ := read(user, free)
		if exp != 5 || position != 50 {
			t.Fatalf("concurrent update: exp=%d position=%d", exp, position)
		}
		for i := 0; i < 3; i++ {
			if err := save(user, domain.ListeningProgressReq{ChapterID: free, StoryID: story, LastPositionSeconds: 100, IsCompleted: true}); err != nil {
				t.Fatal(err)
			}
		}
		if err := save(user, domain.ListeningProgressReq{ChapterID: free, LastPositionSeconds: 0}); err != nil {
			t.Fatal(err)
		}
		exp, _, done := read(user, free)
		if exp != 5 || !done {
			t.Fatalf("replay: exp=%d completion=%v", exp, done)
		}
	})
	t.Run("story association and premium expiry", func(t *testing.T) {
		if err := save(user, domain.ListeningProgressReq{ChapterID: free, StoryID: uuid.New(), LastPositionSeconds: 20}); !errors.Is(err, domain.ErrInvalidListeningProgress) {
			t.Fatalf("wrong story accepted: %v", err)
		}
		run(func(tx pgx.Tx) error {
			_, err := tx.Exec(ctx, `INSERT INTO subscriptions (user_id,plan_id,expires_at,status) VALUES ($1,1,clock_timestamp()-INTERVAL '1 hour','active')`, user)
			return err
		})
		if err := save(user, domain.ListeningProgressReq{ChapterID: premium, LastPositionSeconds: 20}); !errors.Is(err, domain.ErrProgressPremiumRequired) {
			t.Fatalf("expired VIP accepted: %v", err)
		}
		run(func(tx pgx.Tx) error {
			if _, err := tx.Exec(ctx, `UPDATE subscriptions SET expires_at=clock_timestamp()+INTERVAL '1 day' WHERE user_id=$1`, user); err != nil {
				return err
			}
			_, err := tx.Exec(ctx, `UPDATE users SET last_listening_reward_at=clock_timestamp()-INTERVAL '10 minutes' WHERE id=$1`, user)
			return err
		})
		if err := save(user, domain.ListeningProgressReq{ChapterID: premium, LastPositionSeconds: 20}); err != nil {
			t.Fatal(err)
		}
		exp, _, _ := read(user, premium)
		if exp != 15 {
			t.Fatalf("VIP gain: got %d", exp)
		}
	})
	t.Run("reward failure rolls back progress", func(t *testing.T) {
		other := uuid.New()
		run(func(tx pgx.Tx) error {
			if err := createUser(tx, other, true); err != nil {
				return err
			}
			_, err := tx.Exec(ctx, `CREATE FUNCTION reject_reward() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.cultivation_exp > OLD.cultivation_exp THEN RAISE EXCEPTION 'injected reward failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_reward_update BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION reject_reward();`)
			return err
		})
		if err := save(other, domain.ListeningProgressReq{ChapterID: free, LastPositionSeconds: 50}); err == nil {
			t.Fatal("reward failure accepted")
		}
		exp, position, _ := read(other, free)
		if exp != 0 || position != 0 {
			t.Fatalf("rollback: exp=%d progress=%d", exp, position)
		}
		var rows int64
		run(func(tx pgx.Tx) error {
			return tx.QueryRow(ctx, `SELECT COUNT(*) FROM listening_history WHERE user_id=$1`, other).Scan(&rows)
		})
		if rows != 0 {
			t.Fatal("failed transaction kept a progress row")
		}
	})
	t.Log("Neon verification complete; temporary schema removed on cleanup")
}
