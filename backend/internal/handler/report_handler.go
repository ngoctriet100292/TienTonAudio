package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/service"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type ReportHandler struct {
	reportService service.ReportService
}

func NewReportHandler(reportService service.ReportService) *ReportHandler {
	return &ReportHandler{reportService: reportService}
}

// CreateReport người dùng gửi báo cáo lỗi audio hoặc vi phạm bình luận/truyện
func (h *ReportHandler) CreateReport(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req domain.CreateReportReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	report, err := h.reportService.CreateReport(r.Context(), claims.UserID, req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusCreated, "Report submitted successfully", report)
}

// ListReports (Admin) xem danh sách báo cáo
func (h *ReportHandler) ListReports(w http.ResponseWriter, r *http.Request) {
	var statusPtr *string
	status := r.URL.Query().Get("status")
	if status != "" {
		statusPtr = &status
	}

	pagination := utils.ParsePagination(r)
	reports, err := h.reportService.ListReports(r.Context(), statusPtr, pagination)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, utils.PaginatedData{
		Items: reports,
		Page:  int(pagination.Page),
		Limit: int(pagination.Limit),
	})
}

// GetReportByID (Admin) xem chi tiết một báo cáo
func (h *ReportHandler) GetReportByID(w http.ResponseWriter, r *http.Request) {
	reportIDStr := chi.URLParam(r, "id")
	reportID, err := uuid.Parse(reportIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid report ID")
		return
	}

	report, err := h.reportService.GetReportByID(r.Context(), reportID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, report)
}

// UpdateReportStatus (Admin) xử lý báo cáo (pending, resolved, rejected)
func (h *ReportHandler) UpdateReportStatus(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	reportIDStr := chi.URLParam(r, "id")
	reportID, err := uuid.Parse(reportIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid report ID")
		return
	}

	var req domain.UpdateReportStatusReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	report, err := h.reportService.UpdateReportStatus(r.Context(), reportID, claims.UserID, req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Report status updated successfully", report)
}
