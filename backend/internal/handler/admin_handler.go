package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/service"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type AdminHandler struct {
	adminService service.AdminService
}

func NewAdminHandler(adminService service.AdminService) *AdminHandler {
	return &AdminHandler{adminService: adminService}
}

func (h *AdminHandler) GetDashboardStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.adminService.GetDashboardStats(r.Context())
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, stats)
}

func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	pagination := utils.ParsePagination(r)
	users, err := h.adminService.ListUsers(r.Context(), pagination)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, utils.PaginatedData{
		Items: users,
		Page:  int(pagination.Page),
		Limit: int(pagination.Limit),
	})
}

func (h *AdminHandler) UpdateUserRole(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	userID, err := uuid.Parse(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	var req domain.UpdateUserRoleReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := h.adminService.UpdateUserRole(r.Context(), userID, req.Role)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "User role updated successfully", user)
}

func (h *AdminHandler) CreateAuthor(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateAuthorReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	author, err := h.adminService.CreateAuthor(r.Context(), req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusCreated, "Author created successfully", author)
}

func (h *AdminHandler) ListAuthors(w http.ResponseWriter, r *http.Request) {
	pagination := utils.ParsePagination(r)
	authors, err := h.adminService.ListAuthors(r.Context(), pagination)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, utils.PaginatedData{
		Items: authors,
		Page:  int(pagination.Page),
		Limit: int(pagination.Limit),
	})
}

func (h *AdminHandler) CreateNarrator(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateNarratorReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	narrator, err := h.adminService.CreateNarrator(r.Context(), req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusCreated, "Narrator created successfully", narrator)
}

func (h *AdminHandler) ListNarrators(w http.ResponseWriter, r *http.Request) {
	pagination := utils.ParsePagination(r)
	narrators, err := h.adminService.ListNarrators(r.Context(), pagination)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, utils.PaginatedData{
		Items: narrators,
		Page:  int(pagination.Page),
		Limit: int(pagination.Limit),
	})
}
