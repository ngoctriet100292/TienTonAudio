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

type CommunityHandler struct {
	communityService service.CommunityService
}

func NewCommunityHandler(communityService service.CommunityService) *CommunityHandler {
	return &CommunityHandler{communityService: communityService}
}

func (h *CommunityHandler) ListPosts(w http.ResponseWriter, r *http.Request) {
	topic := r.URL.Query().Get("topic")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	var currentUserID *uuid.UUID
	if claims, ok := auth.GetClaimsFromContext(r.Context()); ok {
		currentUserID = &claims.UserID
	}

	posts, err := h.communityService.ListPosts(r.Context(), currentUserID, topic, page, limit)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, posts)
}

func (h *CommunityHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Vui lòng đăng nhập để phát đàn luận đạo")
		return
	}

	var req domain.CreateCommunityPostReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Dữ liệu bài viết không hợp lệ")
		return
	}

	post, err := h.communityService.CreatePost(r.Context(), claims.UserID, req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusCreated, "Phát đàn luận đạo thành công (+50 Tu Vi)", post)
}

func (h *CommunityHandler) GetPostByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	postID, err := uuid.Parse(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Mã bài viết không hợp lệ")
		return
	}

	var currentUserID *uuid.UUID
	if claims, ok := auth.GetClaimsFromContext(r.Context()); ok {
		currentUserID = &claims.UserID
	}

	post, err := h.communityService.GetPostByID(r.Context(), postID, currentUserID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Không tìm thấy bài viết")
		return
	}

	utils.JSON(w, http.StatusOK, post)
}

func (h *CommunityHandler) DeletePost(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	idStr := chi.URLParam(r, "id")
	postID, err := uuid.Parse(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Mã bài viết không hợp lệ")
		return
	}

	isAdmin := claims.Role == "admin"
	if err := h.communityService.DeletePost(r.Context(), postID, claims.UserID, isAdmin); err != nil {
		utils.ErrorResponse(w, http.StatusForbidden, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Đã xóa bài viết thành công", nil)
}

func (h *CommunityHandler) ToggleLike(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Vui lòng đăng nhập để tương tác")
		return
	}

	idStr := chi.URLParam(r, "id")
	postID, err := uuid.Parse(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Mã bài viết không hợp lệ")
		return
	}

	resp, err := h.communityService.ToggleLike(r.Context(), postID, claims.UserID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, resp)
}

func (h *CommunityHandler) ListComments(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	postID, err := uuid.Parse(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Mã bài viết không hợp lệ")
		return
	}

	comments, err := h.communityService.ListComments(r.Context(), postID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, comments)
}

func (h *CommunityHandler) CreateComment(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Vui lòng đăng nhập để đàm đạo")
		return
	}

	idStr := chi.URLParam(r, "id")
	postID, err := uuid.Parse(idStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Mã bài viết không hợp lệ")
		return
	}

	var req domain.CreateCommunityCommentReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Dữ liệu bình luận không hợp lệ")
		return
	}

	comment, err := h.communityService.CreateComment(r.Context(), postID, claims.UserID, req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusCreated, "Đã gửi đàm đạo (+10 Tu Vi)", comment)
}
