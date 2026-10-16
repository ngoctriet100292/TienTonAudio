package repository

import (
	"context"
	"errors"
	"time"

	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type AtomicListeningRepository interface {
	SaveListeningProgressAtomic(context.Context, uuid.UUID, domain.ListeningProgressReq) error
}

func (r *storyRepo) SaveListeningProgressAtomic(ctx context.Context, userID uuid.UUID, req domain.ListeningProgressReq) error {
	if r.pool == nil {
		return errors.New("listening transaction pool is unavailable")
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	return saveListeningProgressTransaction(ctx, tx, userID, req)
}

// Serialize progress and rewards per user, including concurrent updates to
// different chapters. Reward timestamps persist across server/cache restarts.
func saveListeningProgressTransaction(ctx context.Context, tx pgx.Tx, userID uuid.UUID, req domain.ListeningProgressReq) error {
	defer tx.Rollback(context.Background())
	if userID == uuid.Nil || req.ChapterID == uuid.Nil || req.LastPositionSeconds < 0 {
		return domain.ErrInvalidListeningProgress
	}
	speed := 1.0
	if req.PlaybackSpeed != nil {
		if !domain.IsValidPlaybackSpeed(*req.PlaybackSpeed) {
			return domain.ErrInvalidListeningProgress
		}
		speed = *req.PlaybackSpeed
	}
	var storyID uuid.UUID
	var duration int32
	var premium bool
	err := tx.QueryRow(ctx, `SELECT story_id, COALESCE(duration_seconds, 0), COALESCE(is_premium, FALSE) FROM chapters WHERE id = $1 AND publication_status='published' AND EXISTS(SELECT 1 FROM stories WHERE stories.id=chapters.story_id AND stories.publication_status='published')`, req.ChapterID).Scan(&storyID, &duration, &premium)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrProgressChapterNotFound
	}
	if err != nil {
		return err
	}
	if req.StoryID != uuid.Nil && req.StoryID != storyID {
		return domain.ErrInvalidListeningProgress
	}
	if duration > 0 && req.LastPositionSeconds > duration {
		return domain.ErrInvalidListeningProgress
	}
	if req.LastPositionSeconds > 86400 {
		return domain.ErrInvalidListeningProgress
	}

	var exp int64
	var rewardedAt pgtype.Timestamptz
	var now time.Time
	if err = tx.QueryRow(ctx, `SELECT COALESCE(cultivation_exp, 0), last_listening_reward_at, clock_timestamp() FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, userID).Scan(&exp, &rewardedAt, &now); err != nil {
		return err
	}
	var vip bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM subscriptions WHERE user_id = $1 AND status = 'active' AND expires_at > $2)`, userID, now).Scan(&vip); err != nil {
		return err
	}
	if premium && !vip {
		return domain.ErrProgressPremiumRequired
	}

	var previousPosition int32
	err = tx.QueryRow(ctx, `SELECT last_position_seconds FROM listening_history WHERE user_id = $1 AND chapter_id = $2`, userID, req.ChapterID).Scan(&previousPosition)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	// Completion is sticky in SQL and only accepted close to the audio's end.
	completed := req.IsCompleted && duration > 0 && req.LastPositionSeconds >= max(0, duration-5)
	if err = db.New(tx).UpsertListeningProgress(ctx, db.UpsertListeningProgressParams{
		UserID: userID, ChapterID: req.ChapterID, StoryID: storyID,
		LastPositionSeconds: req.LastPositionSeconds, PlaybackSpeed: utils.Float64ToNumeric(speed), IsCompleted: &completed,
	}); err != nil {
		return err
	}

	gain := int64(0)
	if duration > 0 && req.LastPositionSeconds > previousPosition && rewardedAt.Valid && now.Sub(rewardedAt.Time) >= 5*time.Minute {
		gain = 5
		if vip {
			gain = 10
		}
	}
	if !rewardedAt.Valid || gain > 0 {
		realm, _, _, _, _, _ := domain.CalculateCultivationRealm(exp + gain)
		if _, err = tx.Exec(ctx, `UPDATE users SET cultivation_exp = COALESCE(cultivation_exp, 0) + $2, cultivation_realm = $3, last_listening_reward_at = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, userID, gain, realm, now); err != nil {
			return err
		}
	}
	if gain > 0 {
		if _, err = tx.Exec(ctx, `INSERT INTO listening_reward_events(user_id,chapter_id,occurred_at,minutes)VALUES($1,$2,$3,5)`, userID, req.ChapterID, now); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
