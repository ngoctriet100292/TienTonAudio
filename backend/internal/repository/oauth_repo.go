package repository

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrOAuthEmailConflict = errors.New("email already belongs to an account; sign in with your existing method")

type OAuthFlow struct {
	Provider, BrowserHash, SessionData, RedirectPath string
	LinkUserID                                       *uuid.UUID
}
type OAuthCode struct {
	Provider, BrowserHash, RedirectPath string
	UserID                              uuid.UUID
}
type OAuthRepository interface {
	SaveFlow(context.Context, string, OAuthFlow) error
	ConsumeFlow(context.Context, string, string, string) (OAuthFlow, error)
	SaveCode(context.Context, string, OAuthCode) error
	ConsumeCode(context.Context, string, string, string) (OAuthCode, error)
	ResolveIdentity(context.Context, domain.OAuthIdentity) (uuid.UUID, bool, error)
}
type oauthDB interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}
type oauthRepo struct {
	pool  *pgxpool.Pool
	store oauthDB
}

func NewOAuthRepository(pool *pgxpool.Pool) OAuthRepository {
	return &oauthRepo{pool: pool, store: pool}
}
func (r *oauthRepo) SaveFlow(ctx context.Context, hash string, f OAuthFlow) error {
	_, err := r.store.Exec(ctx, `INSERT INTO oauth_flows(state_hash,provider,browser_hash,session_data,redirect_path,link_user_id,expires_at) VALUES($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP + INTERVAL '10 minutes')`, hash, f.Provider, f.BrowserHash, f.SessionData, f.RedirectPath, f.LinkUserID)
	return err
}
func (r *oauthRepo) ConsumeFlow(ctx context.Context, hash, binding, provider string) (OAuthFlow, error) {
	var f OAuthFlow
	err := r.store.QueryRow(ctx, `DELETE FROM oauth_flows WHERE state_hash=$1 AND browser_hash=$2 AND provider=$3 AND expires_at>CURRENT_TIMESTAMP RETURNING provider,browser_hash,session_data,redirect_path,link_user_id`, hash, binding, provider).Scan(&f.Provider, &f.BrowserHash, &f.SessionData, &f.RedirectPath, &f.LinkUserID)
	return f, err
}
func (r *oauthRepo) SaveCode(ctx context.Context, hash string, c OAuthCode) error {
	_, err := r.store.Exec(ctx, `INSERT INTO oauth_login_codes(code_hash,provider,browser_hash,user_id,redirect_path,expires_at) VALUES($1,$2,$3,$4,$5,CURRENT_TIMESTAMP + INTERVAL '2 minutes')`, hash, c.Provider, c.BrowserHash, c.UserID, c.RedirectPath)
	return err
}
func (r *oauthRepo) ConsumeCode(ctx context.Context, hash, binding, provider string) (OAuthCode, error) {
	var c OAuthCode
	err := r.store.QueryRow(ctx, `DELETE FROM oauth_login_codes WHERE code_hash=$1 AND browser_hash=$2 AND provider=$3 AND expires_at>CURRENT_TIMESTAMP RETURNING provider,browser_hash,user_id,redirect_path`, hash, binding, provider).Scan(&c.Provider, &c.BrowserHash, &c.UserID, &c.RedirectPath)
	return c, err
}
func (r *oauthRepo) ResolveIdentity(ctx context.Context, identity domain.OAuthIdentity) (uuid.UUID, bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return uuid.Nil, false, err
	}
	defer tx.Rollback(context.Background())
	id, created, err := resolveOAuthIdentity(ctx, tx, identity)
	if err != nil {
		return uuid.Nil, false, err
	}
	if err = tx.Commit(ctx); err != nil {
		return uuid.Nil, false, err
	}
	return id, created, nil
}
func resolveOAuthIdentity(ctx context.Context, tx pgx.Tx, i domain.OAuthIdentity) (uuid.UUID, bool, error) {
	if (i.Provider != "google" && i.Provider != "facebook" && i.Provider != "apple") || i.Subject == "" || len(i.Subject) > 255 {
		return uuid.Nil, false, errors.New("invalid provider identity")
	}
	// Serialize first login by subject, then email. Keep account and provider link atomic.
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, i.Provider+":"+i.Subject); err != nil {
		return uuid.Nil, false, err
	}
	var id uuid.UUID
	var deleted bool
	err := tx.QueryRow(ctx, `SELECT u.id,u.deleted_at IS NOT NULL FROM oauth_accounts a JOIN users u ON u.id=a.user_id WHERE a.provider=$1 AND a.provider_user_id=$2`, i.Provider, i.Subject).Scan(&id, &deleted)
	if err == nil {
		if deleted {
			return uuid.Nil, false, errors.New("account is unavailable")
		}
		return id, false, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, false, err
	}
	i.Email = strings.ToLower(strings.TrimSpace(i.Email))
	address, err := mail.ParseAddress(i.Email)
	if err != nil || address.Address != i.Email || len(i.Email) > 255 {
		return uuid.Nil, false, errors.New("provider did not supply an email address")
	}
	if _, err = tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1,1))`, i.Email); err != nil {
		return uuid.Nil, false, err
	}
	var exists bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE lower(email)=$1)`, i.Email).Scan(&exists); err != nil {
		return uuid.Nil, false, err
	}
	// Never claim or merge a local account merely because a provider returned its email.
	if exists {
		return uuid.Nil, false, ErrOAuthEmailConflict
	}
	username := i.Provider + "_" + strings.ReplaceAll(uuid.NewString(), "-", "")[:16]
	verified := i.EmailVerified && (i.Provider == "google" || i.Provider == "apple")
	if len(i.AvatarURL) > 500 {
		i.AvatarURL = ""
	}
	err = tx.QueryRow(ctx, `INSERT INTO users(username,email,password_hash,avatar_url,role,is_email_verified,provider,provider_id) VALUES($1,$2,NULL,NULLIF($3,''),'user',$4,$5,$6) RETURNING id`, username, i.Email, i.AvatarURL, verified, i.Provider, i.Subject).Scan(&id)
	if err != nil {
		return uuid.Nil, false, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO oauth_accounts(user_id,provider,provider_user_id,email,avatar_url) VALUES($1,$2,$3,$4,NULLIF($5,''))`, id, i.Provider, i.Subject, i.Email, i.AvatarURL)
	return id, true, err
}

// CleanupOAuthSessions removes expired rows without touching active login flows.
func CleanupOAuthSessions(ctx context.Context, pool *pgxpool.Pool) error {
	for _, table := range []string{"oauth_flows", "oauth_login_codes"} {
		if _, err := pool.Exec(ctx, fmt.Sprintf("DELETE FROM %s WHERE expires_at < $1", table), time.Now()); err != nil {
			return err
		}
	}
	return nil
}

func (r *oauthRepo) LinkIdentity(ctx context.Context, user uuid.UUID, i domain.OAuthIdentity) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	return linkOAuthIdentity(ctx, user, i, tx)
}
func linkOAuthIdentity(ctx context.Context, user uuid.UUID, i domain.OAuthIdentity, tx pgx.Tx) error {
	var err error
	defer tx.Rollback(context.Background())
	if (i.Provider != "google" && i.Provider != "facebook" && i.Provider != "apple") || i.Subject == "" || len(i.Subject) > 255 {
		return errors.New("invalid identity")
	}
	if _, err = tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, i.Provider+":"+i.Subject); err != nil {
		return err
	}
	var verified bool
	if err = tx.QueryRow(ctx, `SELECT is_email_verified FROM users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`, user).Scan(&verified); err != nil || !verified {
		return errors.New("verified account required")
	}
	var linked uuid.UUID
	err = tx.QueryRow(ctx, `SELECT user_id FROM oauth_accounts WHERE provider=$1 AND provider_user_id=$2`, i.Provider, i.Subject).Scan(&linked)
	if err == nil {
		if linked != user {
			return ErrOAuthEmailConflict
		}
		return tx.Commit(ctx)
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	var exists bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM oauth_accounts WHERE user_id=$1 AND provider=$2)`, user, i.Provider).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return errors.New("provider already linked")
	}
	if _, err = tx.Exec(ctx, `INSERT INTO oauth_accounts(user_id,provider,provider_user_id,email)VALUES($1,$2,$3,NULLIF($4,''))`, user, i.Provider, i.Subject, i.Email); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
