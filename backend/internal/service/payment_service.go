package service

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type PaymentService interface {
	ListSubscriptionPlans(ctx context.Context) ([]domain.SubscriptionPlanResp, error)
	CreatePayment(ctx context.Context, userID uuid.UUID, req domain.CreatePaymentReq) (*domain.CreatePaymentResp, error)
	HandleWebhookCallback(ctx context.Context, req domain.WebhookCallbackReq) error
	AutoConfirmPayment(ctx context.Context, paymentID uuid.UUID) (*domain.PaymentStatusResp, error)
	GetPaymentStatus(ctx context.Context, paymentID uuid.UUID) (*domain.PaymentStatusResp, error)
	GetUserActiveSubscription(ctx context.Context, userID uuid.UUID) (*domain.UserSubscriptionResp, error)
	ListUserPayments(ctx context.Context, userID uuid.UUID) ([]domain.UserPaymentResp, error)
}

type paymentService struct {
	repo             repository.PaymentRepository
	userRepo         repository.UserRepository
	notificationRepo repository.NotificationRepository
}

func NewPaymentService(repo repository.PaymentRepository, userRepo repository.UserRepository, notificationRepo repository.NotificationRepository) PaymentService {
	return &paymentService{
		repo:             repo,
		userRepo:         userRepo,
		notificationRepo: notificationRepo,
	}
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
	provider := req.Provider
	if provider == "" {
		provider = "vietqr"
	}

	payment, err := s.repo.CreatePayment(ctx, db.CreatePaymentParams{
		UserID:   userID,
		PlanID:   &planID,
		Amount:   plan.Price,
		Provider: provider,
		Status:   &status,
	})
	if err != nil {
		return nil, fmt.Errorf("create payment error: %w", err)
	}

	// 1. Sinh mã đơn hàng rút gọn 8 ký tự viết hoa
	orderCode := strings.ToUpper(strings.ReplaceAll(payment.ID.String(), "-", "")[:8])
	transferContent := fmt.Sprintf("TT %s", orderCode)
	bankName := "Ngân hàng Quân Đội (MBBank)"
	bankAccount := "0348788888"
	accountName := "TIEN TON AUDIO"
	amountFloat := utils.NumericToFloat64(payment.Amount)

	// 2. Tạo link VietQR chuẩn Napas 24/7 tự động điền tiền và nội dung
	qrCodeURL := fmt.Sprintf(
		"https://img.vietqr.io/image/MB-%s-compact2.png?amount=%.0f&addInfo=%s&accountName=%s",
		bankAccount,
		amountFloat,
		url.QueryEscape(transferContent),
		url.QueryEscape(accountName),
	)

	// Gateway checkout URL fallback
	checkoutURL := fmt.Sprintf("https://payment-gateway.tientonaudio.com/checkout?payment_id=%s&provider=%s", payment.ID, provider)
	expiresAt := time.Now().Add(15 * time.Minute)

	return &domain.CreatePaymentResp{
		PaymentID:       payment.ID,
		OrderCode:       orderCode,
		Amount:          amountFloat,
		Provider:        payment.Provider,
		Status:          getStr(payment.Status),
		CheckoutURL:     checkoutURL,
		QRCodeURL:       qrCodeURL,
		BankName:        bankName,
		BankAccount:     bankAccount,
		AccountName:     accountName,
		TransferContent: transferContent,
		ExpiresAt:       expiresAt,
	}, nil
}

func (s *paymentService) AutoConfirmPayment(ctx context.Context, paymentID uuid.UUID) (*domain.PaymentStatusResp, error) {
	return nil, errors.New("payment confirmation requires a verified webhook")
}

func (s *paymentService) GetPaymentStatus(ctx context.Context, paymentID uuid.UUID) (*domain.PaymentStatusResp, error) {
	payment, err := s.repo.GetPaymentByID(ctx, paymentID)
	if err != nil {
		return nil, errors.New("đơn thanh toán không tồn tại")
	}

	claims, ok := auth.GetClaimsFromContext(ctx)
	if !ok || claims.UserID != payment.UserID {
		return nil, errors.New("đơn thanh toán không tồn tại")
	}

	planName := "Gói VIP Tiên Tôn"
	var planDuration int32 = 30
	if payment.PlanID != nil {
		if plan, err := s.repo.GetSubscriptionPlanByID(ctx, *payment.PlanID); err == nil {
			planName = plan.Name
			planDuration = plan.DurationDays
		}
	}

	isCompleted := getStr(payment.Status) == "completed"

	return &domain.PaymentStatusResp{
		PaymentID:   payment.ID,
		Status:      getStr(payment.Status),
		PlanName:    planName,
		Amount:      utils.NumericToFloat64(payment.Amount),
		IsCompleted: isCompleted,
		BonusExp:    int64(planDuration) * 50,
	}, nil
}

func (s *paymentService) HandleWebhookCallback(ctx context.Context, req domain.WebhookCallbackReq) error {
	if req.TransactionID == "" || len(req.TransactionID) > 100 || (req.Status != "completed" && req.Status != "failed") {
		return errors.New("invalid payment webhook")
	}
	atomicRepo, ok := s.repo.(repository.AtomicPaymentRepository)
	if !ok {
		return errors.New("atomic payment processing is unavailable")
	}
	return atomicRepo.ProcessWebhook(ctx, req)
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

func (s *paymentService) ListUserPayments(ctx context.Context, userID uuid.UUID) ([]domain.UserPaymentResp, error) {
	rows, err := s.repo.ListUserPayments(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("list user payments error: %w", err)
	}

	result := make([]domain.UserPaymentResp, len(rows))
	for i, r := range rows {
		statusStr := "pending"
		if r.Status != nil {
			statusStr = *r.Status
		}

		result[i] = domain.UserPaymentResp{
			ID:            r.ID,
			PlanID:        r.PlanID,
			PlanName:      r.PlanName,
			DurationDays:  r.DurationDays,
			Amount:        utils.NumericToFloat64(r.Amount),
			Provider:      r.Provider,
			Status:        statusStr,
			TransactionID: r.TransactionID,
			CreatedAt:     r.CreatedAt.Time,
			UpdatedAt:     r.UpdatedAt.Time,
		}
	}
	return result, nil
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
