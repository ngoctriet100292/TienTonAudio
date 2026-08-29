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
	PaymentID   uuid.UUID `json:"payment_id"`
	Amount      float64   `json:"amount"`
	Provider    string    `json:"provider"`
	Status      string    `json:"status"`
	CheckoutURL string    `json:"checkout_url"`
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
