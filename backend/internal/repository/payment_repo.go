package repository

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"

	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/google/uuid"
)

type PaymentRepository interface {
	ListSubscriptionPlans(ctx context.Context) ([]db.SubscriptionPlan, error)
	GetSubscriptionPlanByID(ctx context.Context, id int32) (db.SubscriptionPlan, error)
	CreatePayment(ctx context.Context, arg db.CreatePaymentParams) (db.Payment, error)
	GetPaymentByID(ctx context.Context, id uuid.UUID) (db.Payment, error)
	UpdatePaymentStatus(ctx context.Context, arg db.UpdatePaymentStatusParams) (db.Payment, error)
	ActivateSubscription(ctx context.Context, arg db.ActivateSubscriptionParams) (db.Subscription, error)
	GetUserActiveSubscription(ctx context.Context, userID uuid.UUID) (db.GetUserActiveSubscriptionRow, error)
	ListUserPayments(ctx context.Context, userID uuid.UUID) ([]db.ListUserPaymentsRow, error)
}

type paymentRepo struct {
	q    db.Querier
	pool *pgxpool.Pool
}

func NewPaymentRepository(q db.Querier, pools ...*pgxpool.Pool) PaymentRepository {
	r := &paymentRepo{q: q}
	if len(pools) > 0 {
		r.pool = pools[0]
	}
	return r
}

func (r *paymentRepo) ListSubscriptionPlans(ctx context.Context) ([]db.SubscriptionPlan, error) {
	return r.q.ListSubscriptionPlans(ctx)
}

func (r *paymentRepo) GetSubscriptionPlanByID(ctx context.Context, id int32) (db.SubscriptionPlan, error) {
	return r.q.GetSubscriptionPlanByID(ctx, id)
}

func (r *paymentRepo) CreatePayment(ctx context.Context, arg db.CreatePaymentParams) (db.Payment, error) {
	return r.q.CreatePayment(ctx, arg)
}

func (r *paymentRepo) GetPaymentByID(ctx context.Context, id uuid.UUID) (db.Payment, error) {
	return r.q.GetPaymentByID(ctx, id)
}

func (r *paymentRepo) UpdatePaymentStatus(ctx context.Context, arg db.UpdatePaymentStatusParams) (db.Payment, error) {
	return r.q.UpdatePaymentStatus(ctx, arg)
}

func (r *paymentRepo) ActivateSubscription(ctx context.Context, arg db.ActivateSubscriptionParams) (db.Subscription, error) {
	return r.q.ActivateSubscription(ctx, arg)
}

func (r *paymentRepo) GetUserActiveSubscription(ctx context.Context, userID uuid.UUID) (db.GetUserActiveSubscriptionRow, error) {
	return r.q.GetUserActiveSubscription(ctx, uuid.NullUUID{UUID: userID, Valid: true})
}

func (r *paymentRepo) ListUserPayments(ctx context.Context, userID uuid.UUID) ([]db.ListUserPaymentsRow, error) {
	return r.q.ListUserPayments(ctx, userID)
}
