package service

import (
	"context"
	"errors"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
	"github.com/google/uuid"
	"net/url"
	"strings"
	"testing"
)

type paymentCreationRepo struct {
	repository.PaymentRepository
	created int
	price   float64
}

func (r *paymentCreationRepo) GetSubscriptionPlanByID(context.Context, int32) (db.SubscriptionPlan, error) {
	return db.SubscriptionPlan{ID: 1, Price: utils.Float64ToNumeric(r.price)}, nil
}
func (r *paymentCreationRepo) CreatePayment(_ context.Context, p db.CreatePaymentParams) (db.Payment, error) {
	r.created++
	return db.Payment{ID: uuid.MustParse("a43efc71-869f-4454-bc4e-8154149bd1c6"), Amount: p.Price, Provider: p.Provider, Status: p.Status}, nil
}
func TestCheckoutRequiresConfigurationBeforeCreatingPayment(t *testing.T) {
	svc := NewPaymentService(nil, nil, nil)
	if _, err := svc.CreatePayment(context.Background(), uuid.New(), domain.CreatePaymentReq{PlanID: 1}); !errors.Is(err, ErrCheckoutUnavailable) {
		t.Fatalf("unconfigured checkout allowed: %v", err)
	}
	ready := PaymentSettings{Enabled: true, BankCode: "MB", BankName: "Bank fixture", BankAccount: "123456789", AccountName: "TEST ACCOUNT", WebhookSecret: strings.Repeat("s", 32)}
	repo := &paymentCreationRepo{price: 49000}
	svc = NewPaymentService(repo, nil, nil, ready)
	if _, err := svc.CreatePayment(context.Background(), uuid.New(), domain.CreatePaymentReq{PlanID: 1, Provider: "fake"}); err == nil || repo.created != 0 {
		t.Fatal("unsupported provider created an order")
	}
	response, err := svc.CreatePayment(context.Background(), uuid.New(), domain.CreatePaymentReq{PlanID: 1, Provider: "vietqr"})
	if err != nil {
		t.Fatal(err)
	}
	qr, err := url.Parse(response.QRCodeURL)
	if err != nil {
		t.Fatal(err)
	}
	if qr.Path != "/image/MB-123456789-compact2.png" || qr.Query().Get("amount") != "49000" || qr.Query().Get("accountName") != "TEST ACCOUNT" || qr.Query().Get("addInfo") != "TT A43EFC71869F4454BC4E8154149BD1C6" || response.CheckoutURL != "" {
		t.Fatalf("incorrect payment details: %+v", response)
	}
	for _, price := range []float64{0, -1, 49000.5} {
		repo.price = price
		before := repo.created
		if _, err = svc.CreatePayment(context.Background(), uuid.New(), domain.CreatePaymentReq{PlanID: 1}); err == nil || repo.created != before {
			t.Fatal("invalid VND amount created an order")
		}
	}
	ready.Enabled = false
	if ready.Ready() {
		t.Fatal("explicit disable ignored")
	}
	ready.Enabled = true
	ready.BankCode = "MB/other"
	if ready.Ready() {
		t.Fatal("invalid bank path accepted")
	}
}
