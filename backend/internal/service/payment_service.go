package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type PaymentService interface {
	ListSubscriptionPlans(ctx context.Context) ([]domain.SubscriptionPlanResp, error)
	CreatePayment(ctx context.Context, userID uuid.UUID, req domain.CreatePaymentReq) (*domain.CreatePaymentResp, error)
	HandleWebhookCallback(ctx context.Context, req domain.WebhookCallbackReq) error
	GetUserActiveSubscription(ctx context.Context, userID uuid.UUID) (*domain.UserSubscriptionResp, error)
}

type paymentService struct {
	repo     repository.PaymentRepository
	userRepo repository.UserRepository
}

func NewPaymentService(repo repository.PaymentRepository, userRepo repository.UserRepository) PaymentService {
	return &paymentService{repo: repo, userRepo: userRepo}
}

func (s *paymentService) ListSubscriptionPlans(ctx context.Context) ([]domain.SubscriptionPlanResp, error) {
	plans, err := s.repo.ListSubscriptionPlans(ctx)
	if err != nil {
		return nil, fmt.Errorf("list plans error: %w", err)
	}

	result := make([]domain.SubscriptionPlanResp, len(plans))
	for i, p := range plans {
		result[i] = domain.SubscriptionPlanResp{
			ID:           p.ID,
			Name:         p.Name,
			Price:        utils.NumericToFloat64(p.Price),
			DurationDays: p.DurationDays,
			Description:  p.Description,
		}
	}
	return result, nil
}

func (s *paymentService) CreatePayment(ctx context.Context, userID uuid.UUID, req domain.CreatePaymentReq) (*domain.CreatePaymentResp, error) {
	plan, err := s.repo.GetSubscriptionPlanByID(ctx, req.PlanID)
	if err != nil {
		return nil, errors.New("subscription plan not found")
	}

	planID := req.PlanID
	status := "pending"
	payment, err := s.repo.CreatePayment(ctx, db.CreatePaymentParams{
		UserID:   userID,
		PlanID:   &planID,
		Amount:   plan.Price,
		Provider: req.Provider,
		Status:   &status,
	})
	if err != nil {
		return nil, fmt.Errorf("create payment error: %w", err)
	}

	// Generate Gateway Checkout URL (Mock / MoMo / VNPay)
	checkoutURL := fmt.Sprintf("https://payment-gateway.tientonaudio.com/checkout?payment_id=%s&provider=%s", payment.ID, req.Provider)

	return &domain.CreatePaymentResp{
		PaymentID:   payment.ID,
		Amount:      utils.NumericToFloat64(payment.Amount),
		Provider:    payment.Provider,
		Status:      getStr(payment.Status),
		CheckoutURL: checkoutURL,
	}, nil
}

func (s *paymentService) HandleWebhookCallback(ctx context.Context, req domain.WebhookCallbackReq) error {
	payment, err := s.repo.GetPaymentByID(ctx, req.PaymentID)
	if err != nil {
		return errors.New("payment transaction not found")
	}

	if getStr(payment.Status) == "completed" {
		return nil // Already processed
	}

	status := req.Status
	txID := req.TransactionID
	updatedPayment, err := s.repo.UpdatePaymentStatus(ctx, db.UpdatePaymentStatusParams{
		ID:            payment.ID,
		Status:        &status,
		TransactionID: &txID,
	})
	if err != nil {
		return fmt.Errorf("update payment status error: %w", err)
	}

	// If completed, activate VIP subscription for the user
	if status == "completed" && updatedPayment.PlanID != nil {
		plan, err := s.repo.GetSubscriptionPlanByID(ctx, *updatedPayment.PlanID)
		if err == nil {
			expiresAt := timeNowAddDays(int(plan.DurationDays))
			_, _ = s.repo.ActivateSubscription(ctx, db.ActivateSubscriptionParams{
				UserID:    uuid.NullUUID{UUID: payment.UserID, Valid: true},
				PlanID:    updatedPayment.PlanID,
				ExpiresAt: expiresAt,
			})

			// Thưởng Đan Dược Đột Phá Tu Vi (Cultivation EXP theo số ngày nạp VIP)
			if s.userRepo != nil {
				bonusExp := int64(plan.DurationDays) * 50 // 30 ngày = +1.500 EXP, 365 ngày = +18.250 EXP
				userCult, err := s.userRepo.GetUserCultivation(ctx, payment.UserID)
				if err == nil {
					currExp := int64(0)
					if userCult.CultivationExp != nil {
						currExp = *userCult.CultivationExp
					}
					newExp := currExp + bonusExp
					newRealm, _, _, _, _, _ := domain.CalculateCultivationRealm(newExp)
					_, _ = s.userRepo.AddUserCultivationExp(ctx, db.AddUserCultivationExpParams{
						ID:               payment.UserID,
						CultivationExp:   &bonusExp,
						CultivationRealm: &newRealm,
					})
				}
			}
		}
	}

	return nil
}

func (s *paymentService) GetUserActiveSubscription(ctx context.Context, userID uuid.UUID) (*domain.UserSubscriptionResp, error) {
	sub, err := s.repo.GetUserActiveSubscription(ctx, userID)
	if err != nil {
		return nil, errors.New("no active subscription found")
	}

	planID := int32(0)
	if sub.PlanID != nil {
		planID = *sub.PlanID
	}

	return &domain.UserSubscriptionResp{
		ID:        sub.ID,
		PlanID:    planID,
		PlanName:  sub.PlanName,
		StartedAt: sub.StartedAt.Time,
		ExpiresAt: sub.ExpiresAt.Time,
		Status:    getStr(sub.Status),
	}, nil
}

func getStr(s *string) string {
	if s != nil {
		return *s
	}
	return ""
}

func timeNowAddDays(days int) pgtype.Timestamptz {
	var t pgtype.Timestamptz
	_ = t.Scan(time.Now().AddDate(0, 0, days))
	return t
}
