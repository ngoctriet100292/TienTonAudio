package handler

import (
	"encoding/json"
	"io"
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
}

func NewPaymentHandler(paymentService service.PaymentService) *PaymentHandler {
	return &PaymentHandler{paymentService: paymentService}
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
	idStr := chi.URLParam(r, "id")
	paymentID, err := uuid.Parse(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Mã đơn hàng không hợp lệ")
		return
	}

	status, err := h.paymentService.AutoConfirmPayment(r.Context(), paymentID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Xác nhận thanh toán tự động thành công!", status)
}

func (h *PaymentHandler) WebhookCallback(w http.ResponseWriter, r *http.Request) {
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid webhook payload")
		return
	}

	var req domain.WebhookCallbackReq
	if err := json.Unmarshal(bodyBytes, &req); err == nil && req.PaymentID != uuid.Nil {
		if err := h.paymentService.HandleWebhookCallback(r.Context(), req); err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.JSONWithMessage(w, http.StatusOK, "Webhook processed successfully", nil)
		return
	}

	// Xử lý Bank Webhook (SePay / Casso / Ngân hàng biến động số dư)
	var bankPayload struct {
		Content     string `json:"content"`
		Description string `json:"description"`
		Code        string `json:"code"`
	}
	_ = json.Unmarshal(bodyBytes, &bankPayload)
	content := bankPayload.Content
	if content == "" {
		content = bankPayload.Description
	}
	if content == "" {
		content = bankPayload.Code
	}

	contentUpper := strings.ToUpper(content)
	if idx := strings.Index(contentUpper, "TT"); idx != -1 {
		parts := strings.Fields(contentUpper[idx:])
		if len(parts) >= 2 {
			orderCode := parts[1]
			_ = orderCode
		}
	}

	utils.JSONWithMessage(w, http.StatusOK, "Webhook received", nil)
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
