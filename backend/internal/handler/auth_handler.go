package handler

import (
	"encoding/json"
	"net/http"

	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/service"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type AuthHandler struct {
	authService service.AuthService
}

func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Register xử lý đăng ký tài khoản và gửi email xác thực
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req domain.RegisterReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := h.authService.Register(r.Context(), req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusCreated, "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản trước khi đăng nhập.", map[string]any{
		"user": user,
	})
}

// VerifyEmail kích hoạt tài khoản qua token xác thực (hỗ trợ cả JSON body lẫn Query param)
func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" && r.Body != nil {
		var req domain.VerifyEmailReq
		if err := json.NewDecoder(r.Body).Decode(&req); err == nil {
			token = req.Token
		}
	}

	if token == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Mã token xác thực là bắt buộc")
		return
	}

	if err := h.authService.VerifyEmail(r.Context(), token); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ.", nil)
}

// ResendVerification gửi lại email xác thực nếu chưa nhận được hoặc hết hạn
func (h *AuthHandler) ResendVerification(w http.ResponseWriter, r *http.Request) {
	var req domain.ResendVerificationReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.authService.ResendVerificationEmail(r.Context(), req.Email); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Email xác thực đã được gửi lại. Vui lòng kiểm tra hộp thư.", nil)
}

// Login đăng nhập với email và mật khẩu (hỗ trợ phát hiện 2FA)
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req domain.LoginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	loginResp, err := h.authService.Login(r.Context(), req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, err.Error())
		return
	}

	if loginResp.MFARequired {
		utils.JSONWithMessage(w, http.StatusOK, "Tài khoản có bật 2FA, vui lòng nhập mã xác thực", map[string]any{
			"mfa_required": true,
			"mfa_token":    loginResp.MFAToken,
		})
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Đăng nhập thành công", map[string]any{
		"user":         loginResp.User,
		"tokens":       loginResp.Tokens,
		"mfa_required": false,
	})
}

// SocialLogin xử lý đăng nhập hoặc đăng ký nhanh qua Google, Facebook, Apple
func (h *AuthHandler) SocialLogin(w http.ResponseWriter, r *http.Request) {
	var req domain.SocialLoginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	loginResp, err := h.authService.SocialLogin(r.Context(), req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Đăng nhập thành công", map[string]any{
		"user":         loginResp.User,
		"tokens":       loginResp.Tokens,
		"mfa_required": false,
	})
}

// VerifyTwoFactorLogin xác thực mã OTP 2FA trong quá trình đăng nhập
func (h *AuthHandler) VerifyTwoFactorLogin(w http.ResponseWriter, r *http.Request) {
	var req domain.TwoFactorVerifyLoginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, tokens, err := h.authService.VerifyTwoFactorLogin(r.Context(), req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Xác thực 2FA thành công! Đăng nhập hoàn tất.", map[string]any{
		"user":   user,
		"tokens": tokens,
	})
}

// SetupTwoFactor tạo TOTP secret và QR Code URL (yêu cầu đăng nhập)
func (h *AuthHandler) SetupTwoFactor(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	resp, err := h.authService.SetupTwoFactor(r.Context(), claims.UserID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Khởi tạo 2FA thành công", resp)
}

// EnableTwoFactor xác nhận mã OTP, bật 2FA và trả về mã dự phòng cứu hộ (yêu cầu đăng nhập)
func (h *AuthHandler) EnableTwoFactor(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req domain.TwoFactorEnableReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	resp, err := h.authService.EnableTwoFactor(r.Context(), claims.UserID, req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Đã bật xác thực 2 yếu tố (2FA) thành công! Hãy lưu lại danh sách mã dự phòng cứu hộ.", resp)
}

// DisableTwoFactor tắt 2FA bằng mã OTP hoặc mã dự phòng xác nhận (yêu cầu đăng nhập)
func (h *AuthHandler) DisableTwoFactor(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaimsFromContext(r.Context())
	if !ok {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req domain.TwoFactorDisableReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.authService.DisableTwoFactor(r.Context(), claims.UserID, req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Đã tắt xác thực 2 yếu tố (2FA) thành công!", nil)
}

// ForgotPassword gửi email yêu cầu đặt lại mật khẩu
func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req domain.ForgotPasswordReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.authService.ForgotPassword(r.Context(), req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hòm thư của bạn.", nil)
}

// ResetPassword đặt lại mật khẩu mới bằng token
func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req domain.ResetPasswordReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.authService.ResetPassword(r.Context(), req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.", nil)
}

// RefreshToken cấp lại access token mới từ refresh token
func (h *AuthHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req domain.RefreshTokenReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	tokens, err := h.authService.RefreshToken(r.Context(), req)
	if err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Làm mới token thành công", tokens)
}

// Logout vô hiệu hóa refresh token
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req domain.LogoutReq
	_ = json.NewDecoder(r.Body).Decode(&req)

	if err := h.authService.Logout(r.Context(), req); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.JSONWithMessage(w, http.StatusOK, "Đăng xuất thành công", nil)
}