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

type CommentHandler struct {
	commentService service.CommentService
}

func NewCommentHandler(commentService service.CommentService) *CommentHandler {
	return &CommentHandler{commentService: commentService}
}

// CreateComment đăng bình luận mới cho chương
func (h *CommentHandler) CreateComment(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req domain.CreateCommentReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	comment, err := h.commentService.CreateComment(r.Context(), claims.UserID, req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusCreated, "Comment posted successfully", comment)
}

// ReplyComment trả lời trực tiếp một bình luận cụ thể
func (h *CommentHandler) ReplyComment(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	parentIDStr := chi.URLParam(r, "id")
	parentID, err := uuid.Parse(parentIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid parent comment ID")
		return
	}

	var req domain.ReplyCommentReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	reply, err := h.commentService.ReplyComment(r.Context(), claims.UserID, parentID, req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusCreated, "Reply posted successfully", reply)
}

// GetChapterComments lấy danh sách bình luận gốc của chương (kèm số replies và biểu cảm)
func (h *CommentHandler) GetChapterComments(w http.ResponseWriter, r *http.Request) {
	chapterIDStr := chi.URLParam(r, "id")
	chapterID, err := uuid.Parse(chapterIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid chapter ID")
		return
	}

	var currentUserID *uuid.UUID
	if claims, ok := auth.GetClaimsFromContext(r.Context()); ok {
		currentUserID = &claims.UserID
	}

	pagination := utils.ParsePagination(r)
	comments, err := h.commentService.GetChapterComments(r.Context(), chapterID, currentUserID, pagination)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, utils.PaginatedData{
		Items: comments,
		Page:  int(pagination.Page),
		Limit: int(pagination.Limit),
	})
}

// GetCommentReplies lấy danh sách câu trả lời của một bình luận
func (h *CommentHandler) GetCommentReplies(w http.ResponseWriter, r *http.Request) {
	commentIDStr := chi.URLParam(r, "id")
	commentID, err := uuid.Parse(commentIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid comment ID")
		return
	}

	var currentUserID *uuid.UUID
	if claims, ok := auth.GetClaimsFromContext(r.Context()); ok {
		currentUserID = &claims.UserID
	}

	pagination := utils.ParsePagination(r)
	replies, err := h.commentService.GetCommentReplies(r.Context(), commentID, currentUserID, pagination)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, utils.PaginatedData{
		Items: replies,
		Page:  int(pagination.Page),
		Limit: int(pagination.Limit),
	})
}

// DeleteComment xóa (soft delete) bình luận của chính mình
func (h *CommentHandler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	commentIDStr := chi.URLParam(r, "id")
	commentID, err := uuid.Parse(commentIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid comment ID")
		return
	}

	if err := h.commentService.DeleteComment(r.Context(), claims.UserID, commentID); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Comment deleted successfully", nil)
}

// ReactToComment thả biểu cảm (like, love, haha, wow, sad, angry) hoặc toggle hủy
func (h *CommentHandler) ReactToComment(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	commentIDStr := chi.URLParam(r, "id")
	commentID, err := uuid.Parse(commentIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid comment ID")
		return
	}

	var req domain.ReactCommentReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	resp, err := h.commentService.ReactToComment(r.Context(), claims.UserID, commentID, req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	msg := "Reaction updated"
	if resp.Action == "added" {
		msg = "Reaction added"
	} else if resp.Action == "removed" {
		msg = "Reaction removed"
	}

	utils.JSONWithMessage(w, http.StatusOK, msg, resp)
}
