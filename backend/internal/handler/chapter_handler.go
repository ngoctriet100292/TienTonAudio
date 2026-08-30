package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/service"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type ChapterHandler struct {
	chapterService service.ChapterService
}

func NewChapterHandler(chapterService service.ChapterService) *ChapterHandler {
	return &ChapterHandler{chapterService: chapterService}
}

func (h *ChapterHandler) ListChaptersByStory(w http.ResponseWriter, r *http.Request) {
	storyIDStr := chi.URLParam(r, "storyId")
	storyID, err := uuid.Parse(storyIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid story ID")
		return
	}

	chapters, err := h.chapterService.ListChaptersByStory(r.Context(), storyID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, chapters)
}

func (h *ChapterHandler) GetChapterByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid chapter ID")
		return
	}

	chapter, err := h.chapterService.GetChapterByID(r.Context(), id)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, chapter)
}

func (h *ChapterHandler) CreateChapter(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateChapterReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	chapter, err := h.chapterService.CreateChapter(r.Context(), req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusCreated, "Chapter created successfully", chapter)
}

func (h *ChapterHandler) BulkCreateChapters(w http.ResponseWriter, r *http.Request) {
	var req domain.BulkCreateChaptersReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	resp, err := h.chapterService.BulkCreateChapters(r.Context(), req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusCreated, "Chapters processed successfully", resp)
}

type AddAudioFileReq struct {
	Quality       string `json:"quality" validate:"required"`
	AudioURL      string `json:"audio_url" validate:"required"`
	FileSizeByes *int64 `json:"file_size_bytes,omitempty"`
	IsPrimary     bool   `json:"is_primary"`
}

func (h *ChapterHandler) AddAudioFile(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	chapterID, err := uuid.Parse(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid chapter ID")
		return
	}

	var req AddAudioFileReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	af, err := h.chapterService.AddChapterAudioFile(r.Context(), chapterID, req.Quality, req.AudioURL, req.FileSizeByes, req.IsPrimary)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusCreated, "Audio file added successfully", af)
}

// GetPlaybackSpeeds trả về danh sách các tốc độ phát audio được hệ thống hỗ trợ
func (h *ChapterHandler) GetPlaybackSpeeds(w http.ResponseWriter, r *http.Request) {
	speeds := h.chapterService.GetPlaybackSpeeds()
	utils.JSON(w, http.StatusOK, map[string]any{
		"default_speed": 1.0,
		"speeds":        speeds,
	})
}

// GetSignedStreamURL cấp link phát audio có chữ ký và kiểm tra gói VIP kèm tốc độ phát
func (h *ChapterHandler) GetSignedStreamURL(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	chapterID, err := uuid.Parse(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid chapter ID")
		return
	}

	var currentUserID *uuid.UUID
	if claims, ok := auth.GetClaimsFromContext(r.Context()); ok {
		currentUserID = &claims.UserID
	}

	quality := r.URL.Query().Get("quality")
	var speed *float64
	if speedStr := r.URL.Query().Get("speed"); speedStr != "" {
		if s, err := strconv.ParseFloat(speedStr, 64); err == nil {
			speed = &s
		}
	}

	streamResp, err := h.chapterService.GetSignedStreamURL(r.Context(), currentUserID, chapterID, quality, speed)
	if err != nil {
		utils.ErrorResponse(w, http.StatusForbidden, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, streamResp)
}