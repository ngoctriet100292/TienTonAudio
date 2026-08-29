package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/IREAKING/tientonaudio/backend/internal/service"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type NotificationHandler struct {
	notifyService service.NotificationService
}

func NewNotificationHandler(notifyService service.NotificationService) *NotificationHandler {
	return &NotificationHandler{notifyService: notifyService}
}

// GetUserNotifications lấy danh sách thông báo của người dùng
func (h *NotificationHandler) GetUserNotifications(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	pagination := utils.ParsePagination(r)
	notifications, err := h.notifyService.GetUserNotifications(r.Context(), claims.UserID, pagination)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, utils.PaginatedData{
		Items: notifications,
		Page:  int(pagination.Page),
		Limit: int(pagination.Limit),
	})
}

// GetUnreadCount đếm số lượng thông báo chưa đọc
func (h *NotificationHandler) GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	cnt, err := h.notifyService.GetUnreadCount(r.Context(), claims.UserID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, map[string]int{"unread_count": cnt})
}

// MarkAsRead đánh dấu một thông báo là đã đọc
func (h *NotificationHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	nIDStr := chi.URLParam(r, "id")
	nID, err := uuid.Parse(nIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid notification ID")
		return
	}

	if err := h.notifyService.MarkAsRead(r.Context(), claims.UserID, nID); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Notification marked as read", nil)
}

// MarkAllAsRead đánh dấu toàn bộ thông báo là đã đọc
func (h *NotificationHandler) MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	if err := h.notifyService.MarkAllAsRead(r.Context(), claims.UserID); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "All notifications marked as read", nil)
}
