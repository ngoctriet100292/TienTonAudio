package handler_test

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/IREAKING/tientonaudio/backend/internal/handler"
)

func TestWebhookSecretVerification(t *testing.T) {
	webhookSecret := "super-secret-webhook-key-12345"
	paymentHandler := handler.NewPaymentHandler(nil, webhookSecret)

	payload := `{"order_code":"ORDER-001","status":"PAID"}`

	// 1. Missing Secret -> 401
	req1 := httptest.NewRequest("POST", "/api/v1/payments/webhook", bytes.NewBufferString(payload))
	rr1 := httptest.NewRecorder()
	paymentHandler.WebhookCallback(rr1, req1)

	if rr1.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for missing webhook secret, got %d", rr1.Code)
	}

	// 2. Wrong Secret -> 401
	req2 := httptest.NewRequest("POST", "/api/v1/payments/webhook", bytes.NewBufferString(payload))
	req2.Header.Set("X-Webhook-Secret", "wrong-secret")
	rr2 := httptest.NewRecorder()
	paymentHandler.WebhookCallback(rr2, req2)

	if rr2.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for invalid webhook secret, got %d", rr2.Code)
	}

	// 3. Valid X-Webhook-Secret Header -> Secret verified (passes auth step)
	req3 := httptest.NewRequest("POST", "/api/v1/payments/webhook", bytes.NewBufferString(payload))
	req3.Header.Set("X-Webhook-Secret", webhookSecret)
	rr3 := httptest.NewRecorder()
	paymentHandler.WebhookCallback(rr3, req3)

	// Will either return 200 (if handled) or 500 (since paymentSvc is nil in this unit test), but NOT 401!
	if rr3.Code == http.StatusUnauthorized {
		t.Fatalf("expected authorization to pass with X-Webhook-Secret, but got 401")
	}

	// 4. Valid HMAC-SHA256 Signature -> Passes auth step
	mac := hmac.New(sha256.New, []byte(webhookSecret))
	mac.Write([]byte(payload))
	signature := hex.EncodeToString(mac.Sum(nil))

	req4 := httptest.NewRequest("POST", "/api/v1/payments/webhook", bytes.NewBufferString(payload))
	req4.Header.Set("X-Signature", signature)
	rr4 := httptest.NewRecorder()
	paymentHandler.WebhookCallback(rr4, req4)

	if rr4.Code == http.StatusUnauthorized {
		t.Fatalf("expected authorization to pass with HMAC X-Signature, but got 401")
	}
}

func TestWebhookFailsClosedWithoutSecret(t *testing.T) {
	h := handler.NewPaymentHandler(nil, "")
	rr := httptest.NewRecorder()
	h.WebhookCallback(rr, httptest.NewRequest("POST", "/api/v1/payments/webhook", bytes.NewBufferString(`{"status":"completed"}`)))
	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("unconfigured webhook returned %d", rr.Code)
	}
}

func TestBankPayloadIsNotSilentlyAcknowledged(t *testing.T) {
	h := handler.NewPaymentHandler(nil, "webhook-secret")
	req := httptest.NewRequest("POST", "/api/v1/payments/webhook", bytes.NewBufferString(`{"content":"TT ABCDEF12"}`))
	req.Header.Set("X-Webhook-Secret", "webhook-secret")
	rr := httptest.NewRecorder()
	h.WebhookCallback(rr, req)
	if rr.Code != http.StatusUnprocessableEntity {
		t.Fatalf("unsupported bank payload returned %d", rr.Code)
	}
}
