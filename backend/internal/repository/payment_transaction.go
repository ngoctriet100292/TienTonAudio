package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type AtomicPaymentRepository interface {
	ProcessWebhook(context.Context, domain.WebhookCallbackReq) error
}

// Keep payment, subscription and reward changes atomic, and serialize duplicate events.
func (r *paymentRepo) ProcessWebhook(ctx context.Context, req domain.WebhookCallbackReq) error {
	if r.pool == nil {
		return errors.New("payment transaction pool is unavailable")
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	return processPaymentWebhook(ctx, req, tx)
}

func processPaymentWebhook(ctx context.Context, req domain.WebhookCallbackReq, tx pgx.Tx) error {
	defer tx.Rollback(context.Background())
	var err error
	if req.PaymentID == uuid.Nil || req.TransactionID == "" || len(req.TransactionID) > 100 || (req.Status != "completed" && req.Status != "failed") {
		return errors.New("invalid payment webhook")
	}
	q := db.New(tx)
	if _, err = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", req.TransactionID); err != nil {
		return err
	}
	var lockedID uuid.UUID
	if err = tx.QueryRow(ctx, "SELECT id FROM payments WHERE id = $1 FOR UPDATE", req.PaymentID).Scan(&lockedID); err != nil {
		return err
	}
	payment, err := q.GetPaymentByID(ctx, req.PaymentID)
	if err != nil {
		return err
	}
	if req.Status == "completed" && (req.Amount <= 0 || float64(req.Amount) != utils.NumericToFloat64(payment.Amount)) {
		return errors.New("payment amount does not match the order")
	}
	var reused bool
	if err = tx.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM payments WHERE transaction_id = $1 AND id <> $2)", req.TransactionID, payment.ID).Scan(&reused); err != nil {
		return err
	}
	if reused {
		return errors.New("transaction has already been used for another order")
	}
	if payment.Status != nil && *payment.Status == "completed" {
		if payment.TransactionID == nil || *payment.TransactionID != req.TransactionID || req.Status != "completed" {
			return errors.New("payment is already completed")
		}
		return tx.Commit(ctx)
	}
	if payment.Status == nil || *payment.Status != "pending" {
		return errors.New("payment is not pending")
	}
	if req.Status == "completed" {
		if payment.PlanID == nil {
			return errors.New("payment has no subscription plan")
		}
		plan, err := q.GetSubscriptionPlanByID(ctx, *payment.PlanID)
		if err != nil {
			return err
		}
		if plan.DurationDays <= 0 {
			return errors.New("invalid subscription duration")
		}
		if _, err = tx.Exec(ctx, "SELECT id FROM users WHERE id = $1 FOR UPDATE", payment.UserID); err != nil {
			return err
		}
		var currentExpiry pgtype.Timestamptz
		if err = tx.QueryRow(ctx, "SELECT MAX(expires_at) FROM subscriptions WHERE user_id = $1 AND status = 'active'", payment.UserID).Scan(&currentExpiry); err != nil {
			return err
		}
		start := time.Now()
		if currentExpiry.Valid && currentExpiry.Time.After(start) {
			start = currentExpiry.Time
		}
		expires := pgtype.Timestamptz{Time: start.AddDate(0, 0, int(plan.DurationDays)), Valid: true}
		if _, err = q.ActivateSubscription(ctx, db.ActivateSubscriptionParams{UserID: uuid.NullUUID{UUID: payment.UserID, Valid: true}, PlanID: payment.PlanID, ExpiresAt: expires}); err != nil {
			return err
		}
		cult, err := q.GetUserCultivation(ctx, payment.UserID)
		if err != nil {
			return err
		}
		currentExp := int64(0)
		if cult.CultivationExp != nil {
			currentExp = *cult.CultivationExp
		}
		bonus := int64(plan.DurationDays) * 50
		realm, _, _, _, _, _ := domain.CalculateCultivationRealm(currentExp + bonus)
		if _, err = q.AddUserCultivationExp(ctx, db.AddUserCultivationExpParams{ID: payment.UserID, CultivationExp: &bonus, CultivationRealm: &realm}); err != nil {
			return err
		}
		if _, err = q.CreateNotification(ctx, db.CreateNotificationParams{UserID: payment.UserID, Title: "Nâng cấp VIP thành công", Message: fmt.Sprintf("Gói %s đã được kích hoạt. Bạn nhận được %d điểm Tu Vi.", plan.Name, bonus), Type: "vip_expiring"}); err != nil {
			return err
		}
	}
	if _, err = q.UpdatePaymentStatus(ctx, db.UpdatePaymentStatusParams{ID: payment.ID, Status: &req.Status, TransactionID: &req.TransactionID}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
