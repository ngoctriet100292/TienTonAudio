package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/service"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type UserHandler struct {
	authService service.AuthService
}

func NewUserHandler(authService service.AuthService) *UserHandler {
	return &UserHandler{authService: authService}
}

func (h *UserHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	user, err := h.authService.GetProfile(r.Context(), claims.UserID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, user)
}

func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req domain.UpdateProfileReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := h.authService.UpdateProfile(r.Context(), claims.UserID, req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Profile updated successfully", user)
}

func (h *UserHandler) UpdatePassword(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req domain.UpdatePasswordReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.authService.UpdatePassword(r.Context(), claims.UserID, req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Password updated successfully", nil)
}

// GetCultivation trả về thông tin cảnh giới tu tiên của người dùng hiện tại
func (h *UserHandler) GetCultivation(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	cult, err := h.authService.GetCultivation(r.Context(), claims.UserID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, cult)
}

// GetAllCultivationRealms trả về 17 cảnh giới tu tiên chính thống
func (h *UserHandler) GetAllCultivationRealms(w http.ResponseWriter, r *http.Request) {
	utils.JSON(w, http.StatusOK, domain.CultivationRealms)
}

// UploadAvatar xử lý tải ảnh đại diện từ client (multipart form) và cập nhật avatar_url
func (h *UserHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// 1. Giới hạn dung lượng upload tối đa 5MB
	r.Body = http.MaxBytesReader(w, r.Body, 5<<20)
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "File ảnh quá lớn, dung lượng tối đa 5MB")
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		file, header, err = r.FormFile("file")
		if err != nil {
			utils.ErrorResponse(w, http.StatusBadRequest, "Vui lòng chọn file ảnh đại diện")
			return
		}
	}
	defer file.Close()

	// 2. Kiểm tra phần mở rộng file
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Định dạng file không hợp lệ (chỉ hỗ trợ jpg, png, webp)")
		return
	}

	// 3. Đảm bảo thư mục lưu trữ uploads/avatars tồn tại
	uploadDir := filepath.Join(".", "uploads", "avatars")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Không thể tạo thư mục lưu trữ ảnh")
		return
	}

	// 4. Sinh tên file duy nhất theo userID và timestamp
	filename := fmt.Sprintf("%s_%d%s", claims.UserID.String(), time.Now().UnixMilli(), ext)
	dstPath := filepath.Join(uploadDir, filename)

	dst, err := os.Create(dstPath)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Lỗi tạo file trên hệ thống")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Lỗi ghi dữ liệu file ảnh")
		return
	}

	// 5. Cập nhật avatar_url trong database
	avatarURL := fmt.Sprintf("/uploads/avatars/%s", filename)
	currentUser, err := h.authService.GetProfile(r.Context(), claims.UserID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	updatedUser, err := h.authService.UpdateProfile(r.Context(), claims.UserID, domain.UpdateProfileReq{
		Username:  &currentUser.Username,
		AvatarURL: &avatarURL,
	})
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Tải ảnh đại diện thành công", map[string]interface{}{
		"avatar_url": avatarURL,
		"user":       updatedUser,
	})
}