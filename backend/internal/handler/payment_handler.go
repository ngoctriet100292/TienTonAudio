package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/service"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type PaymentHandler struct {
	paymentService service.PaymentService
	webhookSecret  string
}

func NewPaymentHandler(paymentService service.PaymentService, webhookSecret string) *PaymentHandler {
	return &PaymentHandler{
		paymentService: paymentService,
		webhookSecret:  webhookSecret,
	}
}

func (h *PaymentHandler) ListSubscriptionPlans(w http.ResponseWriter, r *http.Request) {
	plans, err := h.paymentService.ListSubscriptionPlans(r.Context())
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, plans)
}

func (h *PaymentHandler) CreatePayment(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req domain.CreatePaymentReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	resp, err := h.paymentService.CreatePayment(r.Context(), claims.UserID, req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusCreated, "Tạo đơn thanh toán thành công", resp)
}

// GetPaymentStatus kiểm tra trạng thái đơn hàng (cho polling tự động từ web)
func (h *PaymentHandler) GetPaymentStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "private, no-store")
	idStr := chi.URLParam(r, "id")
	paymentID, err := uuid.Parse(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Mã đơn hàng không hợp lệ")
		return
	}

	status, err := h.paymentService.GetPaymentStatus(r.Context(), paymentID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, status)
}

// AutoConfirmPayment xác nhận thanh toán tự động (mô phỏng hoặc kiểm tra giao dịch thành công)
func (h *PaymentHandler) AutoConfirmPayment(w http.ResponseWriter, r *http.Request) {
	utils.ErrorResponse(w, http.StatusGone, "Thanh toán chỉ được xác nhận qua webhook đã đối soát")
}

func (h *PaymentHandler) WebhookCallback(w http.ResponseWriter, r *http.Request) {
	if h.webhookSecret == "" {
		utils.ErrorResponse(w, http.StatusServiceUnavailable, "Payment webhook is not configured")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid webhook payload")
		return
	}

	// 1. Verify webhook secret / signature
	if h.webhookSecret != "" {
		authHeader := r.Header.Get("Authorization")
		secretHeader := r.Header.Get("X-Webhook-Secret")
		sigHeader := r.Header.Get("X-Signature")

		isValid := false
		if secretHeader != "" && hmac.Equal([]byte(secretHeader), []byte(h.webhookSecret)) {
			isValid = true
		} else if authHeader != "" {
			token := strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(authHeader, "Apikey"), "Bearer"))
			if hmac.Equal([]byte(token), []byte(h.webhookSecret)) {
				isValid = true
			}
		}

		if !isValid && sigHeader != "" {
			mac := hmac.New(sha256.New, []byte(h.webhookSecret))
			mac.Write(bodyBytes)
			expectedSig := hex.EncodeToString(mac.Sum(nil))
			if hmac.Equal([]byte(sigHeader), []byte(expectedSig)) {
				isValid = true
			}
		}

		if !isValid {
			slog.Warn("rejected unauthorized payment webhook",
				"remote_addr", r.RemoteAddr,
				"x_forwarded_for", r.Header.Get("X-Forwarded-For"),
			)
			utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid webhook secret or signature")
			return
		}
	}

	// 2. Process system webhook request
	var req domain.WebhookCallbackReq
	if err := json.Unmarshal(bodyBytes, &req); err == nil && req.PaymentID != uuid.Nil {
		if err := h.paymentService.HandleWebhookCallback(r.Context(), req); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.JSONWithMessage(w, http.StatusOK, "Webhook processed successfully", nil)
		return
	}

	utils.ErrorResponse(w, http.StatusUnprocessableEntity, "Unsupported webhook payload; use the verified payment adapter")
}

func (h *PaymentHandler) GetUserActiveSubscription(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	sub, err := h.paymentService.GetUserActiveSubscription(r.Context(), claims.UserID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, sub)
}

func (h *PaymentHandler) ListUserPayments(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	payments, err := h.paymentService.ListUserPayments(r.Context(), claims.UserID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, payments)
}
