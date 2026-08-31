package handler

import (
	"encoding/json"
	"net/http"

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

	utils.JSONWithMessage(w, http.StatusCreated, "Payment order created", resp)
}

func (h *PaymentHandler) WebhookCallback(w http.ResponseWriter, r *http.Request) {
	var req domain.WebhookCallbackReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid webhook payload")
		return
	}

	if err := h.paymentService.HandleWebhookCallback(r.Context(), req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Webhook processed successfully", nil)
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

