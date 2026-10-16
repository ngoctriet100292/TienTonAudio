package domain

import (
	"time"

	"github.com/google/uuid"
)

type RegisterReq struct {
	Username string `json:"username" validate:"required,min=3,max=50"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8,max=128"`
}

type LoginReq struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type UserResp struct {
	ID               uuid.UUID `json:"id"`
	Username         string    `json:"username"`
	Email            string    `json:"email"`
	AvatarURL        *string   `json:"avatar_url,omitempty"`
	Role             string    `json:"role"`
	IsEmailVerified  bool      `json:"is_email_verified"`
	TwoFactorEnabled bool      `json:"two_factor_enabled"`
	CultivationRealm string    `json:"cultivation_realm"`
	CultivationExp   int64     `json:"cultivation_exp"`
	CultivationLevel int       `json:"cultivation_level"`
	CultivationColor string    `json:"cultivation_color"`
	Provider         *string   `json:"provider,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type SocialLoginReq struct {
	Provider       string  `json:"provider" validate:"required,oneof=google facebook apple"`
	Token          string  `json:"token,omitempty"`
	ProviderUserID string  `json:"provider_user_id,omitempty"`
	Email          string  `json:"email" validate:"required,email"`
	Name           string  `json:"name,omitempty"`
	AvatarURL      *string `json:"avatar_url,omitempty"`
}

type OAuthAccount struct {
	ID             uuid.UUID `json:"id"`
	UserID         uuid.UUID `json:"user_id"`
	Provider       string    `json:"provider"`
	ProviderUserID string    `json:"provider_user_id"`
	Email          *string   `json:"email,omitempty"`
	AvatarURL      *string   `json:"avatar_url,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

type UpdateProfileReq struct {
	Username  *string `json:"username,omitempty"`
	AvatarURL *string `json:"avatar_url,omitempty"`
}

type UpdatePasswordReq struct {
	OldPassword string `json:"old_password" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8"`
}

type TokenResp struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	TokenType    string    `json:"token_type"`
}

type VerifyEmailReq struct {
	Token string `json:"token" validate:"required"`
}

type ResendVerificationReq struct {
	Email string `json:"email" validate:"required,email"`
}

type TwoFactorSetupResp struct {
	Secret    string `json:"secret"`
	QRCodeURL string `json:"qr_code_url"`
}

type TwoFactorEnableReq struct {
	Secret string `json:"secret" validate:"required"`
	Code   string `json:"code" validate:"required,len=6"`
}

type TwoFactorDisableReq struct {
	Code string `json:"code" validate:"required,len=6"`
}

type TwoFactorVerifyLoginReq struct {
	MFAToken string `json:"mfa_token" validate:"required"`
	Code     string `json:"code" validate:"required,len=6"`
}

type LoginResp struct {
	CookieSession        bool       `json:"cookie_session,omitempty"`
	RedirectPath         string     `json:"redirect_path,omitempty"`
	VerificationRequired bool       `json:"verification_required,omitempty"`
	Email                string     `json:"email,omitempty"`
	User                 *UserResp  `json:"user,omitempty"`
	Tokens               *TokenResp `json:"tokens,omitempty"`
	MFARequired          bool       `json:"mfa_required"`
	MFAToken             string     `json:"mfa_token,omitempty"`
}

type ForgotPasswordReq struct {
	Email string `json:"email" validate:"required,email"`
}

type ResetPasswordReq struct {
	Token       string `json:"token" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8,max=128"`
}

type RefreshTokenReq struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type LogoutReq struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type TwoFactorEnableResp struct {
	BackupCodes []string `json:"backup_codes"`
}
