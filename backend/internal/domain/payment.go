package domain

import (
	"time"

	"github.com/google/uuid"
)

type SubscriptionPlanResp struct {
	ID           int32   `json:"id"`
	Name         string  `json:"name"`
	Price        float64 `json:"price"`
	DurationDays int32   `json:"duration_days"`
	Description  *string `json:"description,omitempty"`
}

type CreatePaymentReq struct {
	PlanID   int32  `json:"plan_id" validate:"required"`
	Provider string `json:"provider" validate:"required"` // 'momo', 'vnpay', 'zalopay', 'stripe', 'mock'
}

type CreatePaymentResp struct {
	PaymentID       uuid.UUID `json:"payment_id"`
	OrderCode       string    `json:"order_code"`
	Amount          float64   `json:"amount"`
	Provider        string    `json:"provider"`
	Status          string    `json:"status"`
	CheckoutURL     string    `json:"checkout_url"`
	QRCodeURL       string    `json:"qr_code_url"`
	BankName        string    `json:"bank_name"`
	BankAccount     string    `json:"bank_account"`
	AccountName     string    `json:"account_name"`
	TransferContent string    `json:"transfer_content"`
	ExpiresAt       time.Time `json:"expires_at"`
}

type PaymentStatusResp struct {
	PaymentID        uuid.UUID  `json:"payment_id"`
	Status           string     `json:"status"`
	PlanName         string     `json:"plan_name"`
	Amount           float64    `json:"amount"`
	IsCompleted      bool       `json:"is_completed"`
	BonusExp         int64      `json:"bonus_exp"`
	CultivationRealm string     `json:"cultivation_realm,omitempty"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty"`
}

type WebhookCallbackReq struct {
	PaymentID     uuid.UUID `json:"payment_id" validate:"required"`
	TransactionID string    `json:"transaction_id" validate:"required"`
	Status        string    `json:"status" validate:"required"` // 'completed', 'failed'
	Signature     string    `json:"signature,omitempty"`
}

type UserSubscriptionResp struct {
	ID        uuid.UUID `json:"id"`
	PlanID    int32     `json:"plan_id"`
	PlanName  string    `json:"plan_name"`
	StartedAt time.Time `json:"started_at"`
	ExpiresAt time.Time `json:"expires_at"`
	Status    string    `json:"status"`
}

type UserPaymentResp struct {
	ID            uuid.UUID `json:"id"`
	PlanID        *int32    `json:"plan_id,omitempty"`
	PlanName      *string   `json:"plan_name,omitempty"`
	DurationDays  *int32    `json:"duration_days,omitempty"`
	Amount        float64   `json:"amount"`
	Provider      string    `json:"provider"`
	Status        string    `json:"status"`
	TransactionID *string   `json:"transaction_id,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

