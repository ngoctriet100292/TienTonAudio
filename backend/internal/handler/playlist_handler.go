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

type PlaylistHandler struct {
	playlistService service.PlaylistService
}

func NewPlaylistHandler(playlistService service.PlaylistService) *PlaylistHandler {
	return &PlaylistHandler{playlistService: playlistService}
}

// CreatePlaylist tạo mới playlist cho người dùng đã đăng nhập
func (h *PlaylistHandler) CreatePlaylist(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req domain.CreatePlaylistReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	playlist, err := h.playlistService.CreatePlaylist(r.Context(), claims.UserID, req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusCreated, "Playlist created successfully", playlist)
}

// GetUserPlaylists lấy danh sách playlist của người dùng hiện tại
func (h *PlaylistHandler) GetUserPlaylists(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	playlists, err := h.playlistService.GetUserPlaylists(r.Context(), claims.UserID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, playlists)
}

// GetPlaylistDetail lấy chi tiết playlist kèm danh sách tập truyện
func (h *PlaylistHandler) GetPlaylistDetail(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	playlistID, err := uuid.Parse(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid playlist ID")
		return
	}

	var currentUserID *uuid.UUID
	if claims, ok := auth.GetClaimsFromContext(r.Context()); ok {
		currentUserID = &claims.UserID
	}

	detail, err := h.playlistService.GetPlaylistDetail(r.Context(), playlistID, currentUserID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, detail)
}

// UpdatePlaylist cập nhật thông tin playlist
func (h *PlaylistHandler) UpdatePlaylist(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	idStr := chi.URLParam(r, "id")
	playlistID, err := uuid.Parse(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid playlist ID")
		return
	}

	var req domain.UpdatePlaylistReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	playlist, err := h.playlistService.UpdatePlaylist(r.Context(), playlistID, claims.UserID, req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Playlist updated successfully", playlist)
}

// DeletePlaylist xóa playlist
func (h *PlaylistHandler) DeletePlaylist(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	idStr := chi.URLParam(r, "id")
	playlistID, err := uuid.Parse(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid playlist ID")
		return
	}

	if err := h.playlistService.DeletePlaylist(r.Context(), playlistID, claims.UserID); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Playlist deleted successfully", nil)
}

// AddPlaylistItem thêm tập truyện vào playlist
func (h *PlaylistHandler) AddPlaylistItem(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	idStr := chi.URLParam(r, "id")
	playlistID, err := uuid.Parse(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid playlist ID")
		return
	}

	var req domain.AddPlaylistItemReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.playlistService.AddPlaylistItem(r.Context(), playlistID, claims.UserID, req.ChapterID); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusCreated, "Chapter added to playlist successfully", nil)
}

// RemovePlaylistItem xóa tập truyện khỏi playlist
func (h *PlaylistHandler) RemovePlaylistItem(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	idStr := chi.URLParam(r, "id")
	playlistID, err := uuid.Parse(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid playlist ID")
		return
	}

	chapterIDStr := chi.URLParam(r, "chapterId")
	chapterID, err := uuid.Parse(chapterIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid chapter ID")
		return
	}

	if err := h.playlistService.RemovePlaylistItem(r.Context(), playlistID, claims.UserID, chapterID); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Chapter removed from playlist successfully", nil)
}
