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

type AIHandler struct {
	aiService service.AIService
}

func NewAIHandler(aiService service.AIService) *AIHandler {
	return &AIHandler{aiService: aiService}
}

func (h *AIHandler) Chat(w http.ResponseWriter, r *http.Request) {
	var req domain.AIChatReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	resp, err := h.aiService.ChatWithAI(r.Context(), req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, resp)
}

func (h *AIHandler) GetStoryRealms(w http.ResponseWriter, r *http.Request) {
	storyIDStr := chi.URLParam(r, "id")
	storyID, err := uuid.Parse(storyIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid story ID")
		return
	}

	resp, err := h.aiService.GetStoryRealms(r.Context(), storyID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, resp)
}

func (h *AIHandler) GetStorySummary(w http.ResponseWriter, r *http.Request) {
	storyIDStr := chi.URLParam(r, "id")
	storyID, err := uuid.Parse(storyIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid story ID")
		return
	}

	resp, err := h.aiService.GetStorySummary(r.Context(), storyID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, resp)
}
