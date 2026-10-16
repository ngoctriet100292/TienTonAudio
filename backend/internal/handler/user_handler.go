package handler

import (
	"bytes"
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
	"github.com/IREAKING/tientonaudio/backend/pkg/storage"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type UserHandler struct {
	authService    service.AuthService
	storageService storage.StorageService
}

func NewUserHandler(authService service.AuthService, storageService storage.StorageService) *UserHandler {
	return &UserHandler{authService: authService, storageService: storageService}
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

// GetAllCultivationRealms trả về lộ trình Võ Đạo, Tu Tiên và Tiên Giới
func (h *UserHandler) GetAllCultivationRealms(w http.ResponseWriter, r *http.Request) {
	utils.JSON(w, http.StatusOK, domain.GetCultivationRealms())
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

	// 3. Đọc dữ liệu file ảnh vào memory buffer
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Lỗi đọc dữ liệu file ảnh")
		return
	}

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/" + strings.TrimPrefix(ext, ".")
	}

	key := fmt.Sprintf("avatars/%s_%d%s", claims.UserID.String(), time.Now().UnixMilli(), ext)
	var avatarURL string

	// 4. Ưu tiên tải trực tiếp lên Cloudflare R2 Bucket
	if h.storageService != nil {
		r2URL, err := h.storageService.UploadFile(r.Context(), key, bytes.NewReader(fileBytes), contentType)
		if err == nil && r2URL != "" {
			avatarURL = r2URL
		}
	}

	// 5. Lưu dự phòng cục bộ nếu R2 chưa cấu hình hoặc tạm thời lỗi
	if avatarURL == "" {
		uploadDir := filepath.Join(".", "uploads", "avatars")
		_ = os.MkdirAll(uploadDir, 0755)
		filename := fmt.Sprintf("%s_%d%s", claims.UserID.String(), time.Now().UnixMilli(), ext)
		dstPath := filepath.Join(uploadDir, filename)
		if err := os.WriteFile(dstPath, fileBytes, 0644); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Lỗi ghi dữ liệu file ảnh")
			return
		}
		avatarURL = fmt.Sprintf("/uploads/avatars/%s", filename)
	}

	// 6. Cập nhật avatar_url trong database PostgreSQL
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

	utils.JSONWithMessage(w, http.StatusOK, "Tải ảnh đại diện lên Cloudflare R2 thành công", map[string]interface{}{
		"avatar_url": avatarURL,
		"user":       updatedUser,
	})
}
