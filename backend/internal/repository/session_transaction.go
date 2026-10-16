package repository

import (
	"context"
	"errors"

	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// Rotation either revokes the old refresh token and stores its replacement, or rolls back both.
func (r *userRepo) WithRefreshTransaction(ctx context.Context, hash string, work func(UserRepository) error) error {
	if r.pool == nil {
		return errors.New("session transaction unavailable")
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(context.Background())
	var user uuid.UUID
	if err = tx.QueryRow(ctx, `SELECT user_id FROM refresh_tokens WHERE token_hash=$1 FOR UPDATE`, hash).Scan(&user); errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrInvalidSession
	} else if err != nil {
		return err
	}
	err = work(&userRepo{q: db.New(tx)})
	// Revocation caused by a replay must persist, even though authentication is denied.
	if err != nil && !errors.Is(err, domain.ErrInvalidSession) {
		return err
	}
	if commitErr := tx.Commit(ctx); commitErr != nil {
		return commitErr
	}
	return err
}
