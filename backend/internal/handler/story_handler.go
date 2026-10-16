package handler

import (
	"encoding/json"
	"errors"
	"github.com/jackc/pgx/v5"
	"net/http"
	"strconv"

	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/service"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type StoryHandler struct {
	storyService service.StoryService
}

func NewStoryHandler(storyService service.StoryService) *StoryHandler {
	return &StoryHandler{storyService: storyService}
}

func (h *StoryHandler) ListStories(w http.ResponseWriter, r *http.Request) {
	pagination := utils.ParsePagination(r)
	stories, err := h.storyService.ListStories(r.Context(), pagination)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, utils.PaginatedData{
		Items: stories,
		Page:  int(pagination.Page),
		Limit: int(pagination.Limit),
	})
}

func (h *StoryHandler) GetStoryBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Slug is required")
		return
	}

	story, err := h.storyService.GetStoryBySlug(r.Context(), slug)
	if err != nil {
		status := http.StatusInternalServerError
		message := "Không thể tải truyện. Vui lòng thử lại."
		if errors.Is(err, pgx.ErrNoRows) {
			status = http.StatusNotFound
			message = "Không tìm thấy truyện"
		}
		utils.ErrorResponse(w, status, message)
		return
	}

	utils.JSON(w, http.StatusOK, story)
}

func (h *StoryHandler) SearchStories(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	pagination := utils.ParsePagination(r)

	stories, err := h.storyService.SearchStories(r.Context(), query, pagination)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, stories)
}

func (h *StoryHandler) AdvancedSearch(w http.ResponseWriter, r *http.Request) {
	queryStr := r.URL.Query().Get("q")
	catStr := r.URL.Query().Get("category_id")
	statusStr := r.URL.Query().Get("status")

	filter := domain.StoryFilterReq{}
	if queryStr != "" {
		filter.Query = &queryStr
	}
	if catStr != "" {
		if catID, err := strconv.Atoi(catStr); err == nil {
			id := int32(catID)
			filter.CategoryID = &id
		}
	}
	if statusStr != "" {
		filter.Status = &statusStr
	}

	pagination := utils.ParsePagination(r)
	stories, err := h.storyService.AdvancedSearchStories(r.Context(), filter, pagination)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, utils.PaginatedData{
		Items: stories,
		Page:  int(pagination.Page),
		Limit: int(pagination.Limit),
	})
}

func (h *StoryHandler) CreateStory(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateStoryReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	story, err := h.storyService.CreateStory(r.Context(), req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusCreated, "Story created successfully", story)
}

func (h *StoryHandler) UpdateStory(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid story ID")
		return
	}

	var req domain.UpdateStoryReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	story, err := h.storyService.UpdateStory(r.Context(), id, req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Story updated successfully", story)
}

func (h *StoryHandler) DeleteStory(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid story ID")
		return
	}

	if err := h.storyService.DeleteStory(r.Context(), id); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Story deleted successfully", nil)
}

func (h *StoryHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	cats, err := h.storyService.ListCategories(r.Context())
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, cats)
}

func (h *StoryHandler) SaveListeningProgress(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req domain.ListeningProgressReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.storyService.SaveListeningProgress(r.Context(), claims.UserID, req); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, domain.ErrInvalidListeningProgress) {
			status = http.StatusBadRequest
		}
		if errors.Is(err, domain.ErrProgressChapterNotFound) {
			status = http.StatusNotFound
		}
		if errors.Is(err, domain.ErrProgressPremiumRequired) {
			status = http.StatusForbidden
		}
		utils.ErrorResponse(w, status, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Listening progress saved", nil)
}

func (h *StoryHandler) GetListeningHistory(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	pagination := utils.ParsePagination(r)
	history, err := h.storyService.GetUserListeningHistory(r.Context(), claims.UserID, pagination)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, history)
}

func (h *StoryHandler) ToggleFavorite(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	storyIDStr := chi.URLParam(r, "id")
	storyID, err := uuid.Parse(storyIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid story ID")
		return
	}

	isFav, err := h.storyService.ToggleFavorite(r.Context(), claims.UserID, storyID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	msg := "Story removed from favorites"
	if isFav {
		msg = "Story added to favorites"
	}

	utils.JSONWithMessage(w, http.StatusOK, msg, map[string]bool{"is_favorite": isFav})
}

func (h *StoryHandler) GetUserFavorites(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	pagination := utils.ParsePagination(r)
	favs, err := h.storyService.GetUserFavorites(r.Context(), claims.UserID, pagination)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, favs)
}

// ListTopViewedStories lấy danh sách truyện xem nhiều nhất (bảng xếp hạng)
func (h *StoryHandler) ListTopViewedStories(w http.ResponseWriter, r *http.Request) {
	pagination := utils.ParsePagination(r)
	stories, err := h.storyService.ListTopViewedStories(r.Context(), pagination)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, stories)
}

// CheckFavoriteStatus kiểm tra xem người dùng hiện tại đã yêu thích truyện này chưa
func (h *StoryHandler) CheckFavoriteStatus(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	storyIDStr := chi.URLParam(r, "id")
	storyID, err := uuid.Parse(storyIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid story ID")
		return
	}

	isFav, err := h.storyService.IsFavorite(r.Context(), claims.UserID, storyID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, map[string]bool{"is_favorite": isFav})
}

// GetRelatedStories gợi ý truyện tương tự cùng thể loại hoặc tác giả
func (h *StoryHandler) GetRelatedStories(w http.ResponseWriter, r *http.Request) {
	storyIDStr := chi.URLParam(r, "id")
	storyID, err := uuid.Parse(storyIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid story ID")
		return
	}

	limit := int32(10)
	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 {
			limit = int32(val)
		}
	}

	stories, err := h.storyService.GetRelatedStories(r.Context(), storyID, limit)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, stories)
}

// ToggleFollowAuthor theo dõi hoặc hủy theo dõi tác giả
func (h *StoryHandler) ToggleFollowAuthor(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	authorIDStr := chi.URLParam(r, "id")
	authorID, err := strconv.Atoi(authorIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid author ID")
		return
	}

	isFollowing, err := h.storyService.ToggleFollowAuthor(r.Context(), claims.UserID, int32(authorID))
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	msg := "Unfollowed author"
	if isFollowing {
		msg = "Followed author"
	}
	utils.JSONWithMessage(w, http.StatusOK, msg, map[string]bool{"is_following": isFollowing})
}

// GetFollowedAuthors danh sách tác giả người dùng đang theo dõi
func (h *StoryHandler) GetFollowedAuthors(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	authors, err := h.storyService.GetFollowedAuthors(r.Context(), claims.UserID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, authors)
}

// ToggleFollowNarrator theo dõi hoặc hủy theo dõi giọng đọc
func (h *StoryHandler) ToggleFollowNarrator(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	narratorIDStr := chi.URLParam(r, "id")
	narratorID, err := strconv.Atoi(narratorIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid narrator ID")
		return
	}

	isFollowing, err := h.storyService.ToggleFollowNarrator(r.Context(), claims.UserID, int32(narratorID))
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	msg := "Unfollowed narrator"
	if isFollowing {
		msg = "Followed narrator"
	}
	utils.JSONWithMessage(w, http.StatusOK, msg, map[string]bool{"is_following": isFollowing})
}

// GetFollowedNarrators danh sách giọng đọc người dùng đang theo dõi
func (h *StoryHandler) GetFollowedNarrators(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	narrators, err := h.storyService.GetFollowedNarrators(r.Context(), claims.UserID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, narrators)
}
