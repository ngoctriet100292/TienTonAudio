package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/email"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type AuthService interface {
	Register(ctx context.Context, req domain.RegisterReq) (*domain.UserResp, error)
	VerifyEmail(ctx context.Context, token string) error
	ResendVerificationEmail(ctx context.Context, emailAddr string) error
	Login(ctx context.Context, req domain.LoginReq) (*domain.LoginResp, error)
	SocialLogin(ctx context.Context, req domain.SocialLoginReq) (*domain.LoginResp, error)
	GetProfile(ctx context.Context, userID uuid.UUID) (*domain.UserResp, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, req domain.UpdateProfileReq) (*domain.UserResp, error)
	UpdatePassword(ctx context.Context, userID uuid.UUID, req domain.UpdatePasswordReq) error
	SetupTwoFactor(ctx context.Context, userID uuid.UUID) (*domain.TwoFactorSetupResp, error)
	EnableTwoFactor(ctx context.Context, userID uuid.UUID, req domain.TwoFactorEnableReq) (*domain.TwoFactorEnableResp, error)
	DisableTwoFactor(ctx context.Context, userID uuid.UUID, req domain.TwoFactorDisableReq) error
	VerifyTwoFactorLogin(ctx context.Context, req domain.TwoFactorVerifyLoginReq) (*domain.UserResp, *domain.TokenResp, error)
	ForgotPassword(ctx context.Context, req domain.ForgotPasswordReq) error
	ResetPassword(ctx context.Context, req domain.ResetPasswordReq) error
	RefreshToken(ctx context.Context, req domain.RefreshTokenReq) (*domain.TokenResp, error)
	Logout(ctx context.Context, req domain.LogoutReq) error
	GetCultivation(ctx context.Context, userID uuid.UUID) (*domain.UserCultivationResp, error)
}

type authService struct {
	userRepo     repository.UserRepository
	jwtService   *auth.JWTService
	emailService email.EmailService
}

func NewAuthService(userRepo repository.UserRepository, jwtService *auth.JWTService, emailService email.EmailService) AuthService {
	return &authService{
		userRepo:     userRepo,
		jwtService:   jwtService,
		emailService: emailService,
	}
}

func getRole(r *string) string {
	if r != nil {
		return *r
	}
	return "user"
}

func toUserResp(id uuid.UUID, username, email string, avatarURL *string, role *string, isVerified, twoFactorEnabled bool, exp *int64, realm *string, createdAt, updatedAt time.Time) *domain.UserResp {
	cultivationExp := int64(0)
	if exp != nil {
		cultivationExp = *exp
	}
	realmName, level, _, _, color, _ := domain.CalculateCultivationRealm(cultivationExp)
	if realm != nil && *realm != "" {
		realmName = *realm
	}

	return &domain.UserResp{
		ID:               id,
		Username:         username,
		Email:            email,
		AvatarURL:        avatarURL,
		Role:             getRole(role),
		IsEmailVerified:  isVerified,
		TwoFactorEnabled: twoFactorEnabled,
		CultivationRealm: realmName,
		CultivationExp:   cultivationExp,
		CultivationLevel: level,
		CultivationColor: color,
		CreatedAt:        createdAt,
		UpdatedAt:        updatedAt,
	}
}

func (s *authService) issueTokenPair(ctx context.Context, userID uuid.UUID, emailAddr string, role *string) (*domain.TokenResp, error) {
	tokenPair, err := s.jwtService.GenerateTokenPair(userID, emailAddr, false, []string{getRole(role)}, nil)
	if err != nil {
		return nil, fmt.Errorf("generate tokens error: %w", err)
	}

	tokenHash := s.jwtService.HashToken(tokenPair.RefreshToken)
	expiresAt := time.Now().Add(auth.RefreshTokenTTL)

	_, err = s.userRepo.CreateRefreshToken(ctx, db.CreateRefreshTokenParams{
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: pgtype.Timestamptz{Time: expiresAt, Valid: true},
	})
	if err != nil {
		return nil, fmt.Errorf("save refresh token error: %w", err)
	}

	return &domain.TokenResp{
		AccessToken:  tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
		ExpiresAt:    tokenPair.ExpiresAt,
		TokenType:    tokenPair.TokenType,
	}, nil
}

func (s *authService) Register(ctx context.Context, req domain.RegisterReq) (*domain.UserResp, error) {
	if _, err := s.userRepo.GetUserByEmail(ctx, req.Email); err == nil {
		return nil, errors.New("email is already registered")
	}

	if _, err := s.userRepo.GetUserByUsername(ctx, req.Username); err == nil {
		return nil, errors.New("username is already taken")
	}

	hashedPass, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("hash password error: %w", err)
	}

	roleStr := "user"
	userRow, err := s.userRepo.CreateUser(ctx, db.CreateUserParams{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: hashedPass,
		AvatarUrl:    nil,
		Role:         &roleStr,
	})
	if err != nil {
		return nil, fmt.Errorf("create user error: %w", err)
	}

	// Tạo verification token có hạn 24 giờ
	tokenStr, err := auth.GenerateRandomToken()
	if err != nil {
		return nil, fmt.Errorf("generate verification token error: %w", err)
	}

	_, err = s.userRepo.CreateEmailVerificationToken(ctx, db.CreateEmailVerificationTokenParams{
		UserID:    userRow.ID,
		Token:     tokenStr,
		ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(24 * time.Hour), Valid: true},
	})
	if err != nil {
		return nil, fmt.Errorf("store verification token error: %w", err)
	}

	// Gửi email xác thực
	if s.emailService != nil {
		_ = s.emailService.SendVerificationEmail(userRow.Email, userRow.Username, tokenStr)
	}

	userResp := toUserResp(
		userRow.ID,
		userRow.Username,
		userRow.Email,
		userRow.AvatarUrl,
		userRow.Role,
		userRow.IsEmailVerified,
		userRow.TwoFactorEnabled,
		userRow.CultivationExp,
		userRow.CultivationRealm,
		userRow.CreatedAt.Time,
		userRow.UpdatedAt.Time,
	)

	return userResp, nil
}

func (s *authService) VerifyEmail(ctx context.Context, token string) error {
	if token == "" {
		return errors.New("verification token is required")
	}

	record, err := s.userRepo.GetEmailVerificationToken(ctx, token)
	if err != nil {
		return errors.New("invalid or expired verification token")
	}

	if record.ExpiresAt.Valid && time.Now().After(record.ExpiresAt.Time) {
		_ = s.userRepo.DeleteEmailVerificationTokensByUserID(ctx, record.UserID)
		return errors.New("verification token has expired, please request a new one")
	}

	if err := s.userRepo.SetUserEmailVerified(ctx, record.UserID); err != nil {
		return fmt.Errorf("failed to verify email: %w", err)
	}

	_ = s.userRepo.DeleteEmailVerificationTokensByUserID(ctx, record.UserID)
	return nil
}

func (s *authService) ResendVerificationEmail(ctx context.Context, emailAddr string) error {
	if emailAddr == "" {
		return errors.New("email is required")
	}

	user, err := s.userRepo.GetUserByEmail(ctx, emailAddr)
	if err != nil {
		return errors.New("user not found")
	}

	if user.IsEmailVerified {
		return errors.New("email is already verified")
	}

	_ = s.userRepo.DeleteEmailVerificationTokensByUserID(ctx, user.ID)

	tokenStr, err := auth.GenerateRandomToken()
	if err != nil {
		return fmt.Errorf("generate verification token error: %w", err)
	}

	_, err = s.userRepo.CreateEmailVerificationToken(ctx, db.CreateEmailVerificationTokenParams{
		UserID:    user.ID,
		Token:     tokenStr,
		ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(24 * time.Hour), Valid: true},
	})
	if err != nil {
		return fmt.Errorf("store verification token error: %w", err)
	}

	if s.emailService != nil {
		_ = s.emailService.SendVerificationEmail(user.Email, user.Username, tokenStr)
	}

	return nil
}

func (s *authService) Login(ctx context.Context, req domain.LoginReq) (*domain.LoginResp, error) {
	user, err := s.userRepo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	if !auth.VerifyPassword(req.Password, user.PasswordHash) {
		return nil, errors.New("invalid email or password")
	}

	if !user.IsEmailVerified {
		return nil, errors.New("email is not verified. Please verify your email before logging in")
	}

	if user.TwoFactorEnabled {
		mfaToken, err := s.jwtService.GenerateMFAPendingToken(user.ID, user.Email)
		if err != nil {
			return nil, fmt.Errorf("failed to generate 2FA session: %w", err)
		}

		return &domain.LoginResp{
			MFARequired: true,
			MFAToken:    mfaToken,
		}, nil
	}

	userResp := toUserResp(
		user.ID,
		user.Username,
		user.Email,
		user.AvatarUrl,
		user.Role,
		user.IsEmailVerified,
		user.TwoFactorEnabled,
		user.CultivationExp,
		user.CultivationRealm,
		user.CreatedAt.Time,
		user.UpdatedAt.Time,
	)

	tokenResp, err := s.issueTokenPair(ctx, user.ID, user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	return &domain.LoginResp{
		User:        userResp,
		Tokens:      tokenResp,
		MFARequired: false,
	}, nil
}

// Social login remains disabled until provider tokens are verified server-side.
func (s *authService) SocialLogin(ctx context.Context, req domain.SocialLoginReq) (*domain.LoginResp, error) {
	return nil, errors.New("đăng nhập mạng xã hội chưa khả dụng; vui lòng đăng nhập bằng email và mật khẩu")
}

func (s *authService) SetupTwoFactor(ctx context.Context, userID uuid.UUID) (*domain.TwoFactorSetupResp, error) {
	user, err := s.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	secret, err := auth.GenerateTOTPSecret()
	if err != nil {
		return nil, fmt.Errorf("generate totp secret error: %w", err)
	}

	qrCodeURL := auth.GenerateOTPAuthURL("TienTonAudio", user.Email, secret)

	return &domain.TwoFactorSetupResp{
		Secret:    secret,
		QRCodeURL: qrCodeURL,
	}, nil
}

func (s *authService) EnableTwoFactor(ctx context.Context, userID uuid.UUID, req domain.TwoFactorEnableReq) (*domain.TwoFactorEnableResp, error) {
	if req.Secret == "" || req.Code == "" {
		return nil, errors.New("secret and 6-digit code are required")
	}

	user, err := s.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, errors.New("user not found")
	}
	if user.TwoFactorEnabled {
		return nil, errors.New("two-factor authentication is already enabled; disable it with the current code first")
	}

	if !auth.ValidateTOTP(req.Secret, req.Code) {
		return nil, errors.New("invalid two-factor authentication code")
	}

	if err := s.userRepo.UpdateUserTwoFactor(ctx, db.UpdateUserTwoFactorParams{
		ID:               userID,
		TwoFactorEnabled: true,
		TwoFactorSecret:  &req.Secret,
	}); err != nil {
		return nil, err
	}

	// Xóa mã backup cũ (nếu có)
	_ = s.userRepo.DeleteTwoFactorBackupCodesByUserID(ctx, userID)

	// Sinh 8 mã backup mới
	backupCodes, err := auth.GenerateBackupCodes(8)
	if err != nil {
		return nil, fmt.Errorf("generate backup codes error: %w", err)
	}

	for _, code := range backupCodes {
		clean := strings.ToUpper(strings.ReplaceAll(code, "-", ""))
		codeHash := auth.HashTokenSHA256(clean)
		_, _ = s.userRepo.CreateTwoFactorBackupCode(ctx, db.CreateTwoFactorBackupCodeParams{
			UserID:   userID,
			CodeHash: codeHash,
		})
	}

	return &domain.TwoFactorEnableResp{
		BackupCodes: backupCodes,
	}, nil
}

func (s *authService) DisableTwoFactor(ctx context.Context, userID uuid.UUID, req domain.TwoFactorDisableReq) error {
	if req.Code == "" {
		return errors.New("6-digit code or backup code is required")
	}

	user, err := s.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		return errors.New("user not found")
	}

	if !user.TwoFactorEnabled || user.TwoFactorSecret == nil || *user.TwoFactorSecret == "" {
		return errors.New("two-factor authentication is not enabled")
	}

	valid := auth.ValidateTOTP(*user.TwoFactorSecret, req.Code)
	if !valid {
		cleanInput := strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(req.Code), "-", ""))
		inputHash := auth.HashTokenSHA256(cleanInput)
		backupCodes, err := s.userRepo.GetUnusedTwoFactorBackupCodesByUserID(ctx, user.ID)
		if err == nil {
			for _, bc := range backupCodes {
				if bc.CodeHash == inputHash {
					valid = true
					_ = s.userRepo.MarkTwoFactorBackupCodeUsed(ctx, bc.ID)
					break
				}
			}
		}
	}

	if !valid {
		return errors.New("invalid two-factor authentication code or backup code")
	}

	if err := s.userRepo.UpdateUserTwoFactor(ctx, db.UpdateUserTwoFactorParams{
		ID:               userID,
		TwoFactorEnabled: false,
		TwoFactorSecret:  nil,
	}); err != nil {
		return err
	}

	_ = s.userRepo.DeleteTwoFactorBackupCodesByUserID(ctx, userID)
	return nil
}

func (s *authService) VerifyTwoFactorLogin(ctx context.Context, req domain.TwoFactorVerifyLoginReq) (*domain.UserResp, *domain.TokenResp, error) {
	if req.MFAToken == "" || req.Code == "" {
		return nil, nil, errors.New("mfa_token and code are required")
	}

	userID, _, err := s.jwtService.VerifyMFAPendingToken(req.MFAToken)
	if err != nil {
		return nil, nil, errors.New("invalid or expired 2FA login session")
	}

	user, err := s.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, nil, errors.New("user not found")
	}

	if !user.TwoFactorEnabled || user.TwoFactorSecret == nil || *user.TwoFactorSecret == "" {
		return nil, nil, errors.New("two-factor authentication is not enabled for this user")
	}

	// 1. Thử validate bằng mã TOTP 6 số
	valid := auth.ValidateTOTP(*user.TwoFactorSecret, req.Code)

	// 2. Nếu không khớp, thử kiểm tra với Backup Code
	if !valid {
		cleanInput := strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(req.Code), "-", ""))
		inputHash := auth.HashTokenSHA256(cleanInput)

		backupCodes, err := s.userRepo.GetUnusedTwoFactorBackupCodesByUserID(ctx, user.ID)
		if err == nil {
			for _, bc := range backupCodes {
				if bc.CodeHash == inputHash {
					valid = true
					_ = s.userRepo.MarkTwoFactorBackupCodeUsed(ctx, bc.ID)
					break
				}
			}
		}
	}

	if !valid {
		return nil, nil, errors.New("invalid two-factor authentication code or backup code")
	}

	userResp := toUserResp(
		user.ID,
		user.Username,
		user.Email,
		user.AvatarUrl,
		user.Role,
		user.IsEmailVerified,
		user.TwoFactorEnabled,
		user.CultivationExp,
		user.CultivationRealm,
		user.CreatedAt.Time,
		user.UpdatedAt.Time,
	)

	tokenResp, err := s.issueTokenPair(ctx, user.ID, user.Email, user.Role)
	if err != nil {
		return nil, nil, err
	}

	return userResp, tokenResp, nil
}

func (s *authService) ForgotPassword(ctx context.Context, req domain.ForgotPasswordReq) error {
	if req.Email == "" {
		return errors.New("email is required")
	}

	user, err := s.userRepo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		// Tránh user enumeration: vẫn trả về nil
		return nil
	}

	_ = s.userRepo.DeletePasswordResetTokensByUserID(ctx, user.ID)

	tokenStr, err := auth.GenerateRandomToken()
	if err != nil {
		return fmt.Errorf("generate reset token error: %w", err)
	}

	_, err = s.userRepo.CreatePasswordResetToken(ctx, db.CreatePasswordResetTokenParams{
		UserID:    user.ID,
		Token:     tokenStr,
		ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(15 * time.Minute), Valid: true},
	})
	if err != nil {
		return fmt.Errorf("store reset token error: %w", err)
	}

	if s.emailService != nil {
		_ = s.emailService.SendPasswordResetEmail(user.Email, user.Username, tokenStr)
	}

	return nil
}

func (s *authService) ResetPassword(ctx context.Context, req domain.ResetPasswordReq) error {
	if req.Token == "" {
		return errors.New("reset token is required")
	}
	if len(req.NewPassword) < 8 {
		return errors.New("new password must be at least 8 characters")
	}

	record, err := s.userRepo.GetPasswordResetToken(ctx, req.Token)
	if err != nil {
		return errors.New("invalid or expired reset token")
	}

	if record.ExpiresAt.Valid && time.Now().After(record.ExpiresAt.Time) {
		_ = s.userRepo.DeletePasswordResetTokensByUserID(ctx, record.UserID)
		return errors.New("reset token has expired, please request a new one")
	}

	newHash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		return fmt.Errorf("hash password error: %w", err)
	}

	if err := s.userRepo.UpdateUserPassword(ctx, db.UpdateUserPasswordParams{
		ID:           record.UserID,
		PasswordHash: newHash,
	}); err != nil {
		return fmt.Errorf("update password error: %w", err)
	}

	_ = s.userRepo.DeletePasswordResetTokensByUserID(ctx, record.UserID)
	_ = s.userRepo.RevokeAllUserRefreshTokens(ctx, record.UserID)

	return nil
}

func (s *authService) RefreshToken(ctx context.Context, req domain.RefreshTokenReq) (*domain.TokenResp, error) {
	if req.RefreshToken == "" {
		return nil, errors.New("refresh token is required")
	}

	tokenHash := s.jwtService.HashToken(req.RefreshToken)
	record, err := s.userRepo.GetRefreshTokenByHash(ctx, tokenHash)
	if err != nil {
		return nil, errors.New("invalid or expired refresh token")
	}

	if record.Revoked {
		// Phát hiện token đã bị thu hồi: revoke toàn bộ token của user để phòng chống rò rỉ token
		_ = s.userRepo.RevokeAllUserRefreshTokens(ctx, record.UserID)
		return nil, errors.New("refresh token has been revoked, please login again")
	}

	if record.ExpiresAt.Valid && time.Now().After(record.ExpiresAt.Time) {
		return nil, errors.New("refresh token has expired, please login again")
	}

	user, err := s.userRepo.GetUserByID(ctx, record.UserID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	// Xoay vòng (Rotate): Đánh dấu token cũ là revoked
	_ = s.userRepo.RevokeRefreshToken(ctx, tokenHash)

	// Cấp cặp token mới
	return s.issueTokenPair(ctx, user.ID, user.Email, user.Role)
}

func (s *authService) Logout(ctx context.Context, req domain.LogoutReq) error {
	if req.RefreshToken == "" {
		return nil
	}
	tokenHash := s.jwtService.HashToken(req.RefreshToken)
	return s.userRepo.RevokeRefreshToken(ctx, tokenHash)
}

func (s *authService) GetProfile(ctx context.Context, userID uuid.UUID) (*domain.UserResp, error) {
	user, err := s.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	return toUserResp(
		user.ID,
		user.Username,
		user.Email,
		user.AvatarUrl,
		user.Role,
		user.IsEmailVerified,
		user.TwoFactorEnabled,
		user.CultivationExp,
		user.CultivationRealm,
		user.CreatedAt.Time,
		user.UpdatedAt.Time,
	), nil
}

func (s *authService) UpdateProfile(ctx context.Context, userID uuid.UUID, req domain.UpdateProfileReq) (*domain.UserResp, error) {
	username := ""
	if req.Username != nil {
		username = *req.Username
	}

	updated, err := s.userRepo.UpdateUserProfile(ctx, db.UpdateUserProfileParams{
		ID:        userID,
		Username:  username,
		AvatarUrl: req.AvatarURL,
	})
	if err != nil {
		return nil, fmt.Errorf("update profile error: %w", err)
	}

	return toUserResp(
		updated.ID,
		updated.Username,
		updated.Email,
		updated.AvatarUrl,
		updated.Role,
		updated.IsEmailVerified,
		updated.TwoFactorEnabled,
		updated.CultivationExp,
		updated.CultivationRealm,
		updated.CreatedAt.Time,
		updated.UpdatedAt.Time,
	), nil
}

func (s *authService) GetCultivation(ctx context.Context, userID uuid.UUID) (*domain.UserCultivationResp, error) {
	row, err := s.userRepo.GetUserCultivation(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	exp := int64(0)
	if row.CultivationExp != nil {
		exp = *row.CultivationExp
	}

	realmName, level, nextExp, progressPct, color, desc := domain.CalculateCultivationRealm(exp)
	if row.CultivationRealm != nil && *row.CultivationRealm != "" {
		realmName = *row.CultivationRealm
	}

	return &domain.UserCultivationResp{
		CurrentRealm:  realmName,
		Level:         level,
		CurrentExp:    exp,
		NextRealmExp:  nextExp,
		ProgressPct:   progressPct,
		ExpMultiplier: 1.0,
		VipStatus:     "Đạo Hữu",
		Color:         color,
		Description:   desc,
		AllRealms:     domain.CultivationRealms,
	}, nil
}

func (s *authService) UpdatePassword(ctx context.Context, userID uuid.UUID, req domain.UpdatePasswordReq) error {
	user, err := s.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		return errors.New("user not found")
	}

	if !auth.VerifyPassword(req.OldPassword, user.PasswordHash) {
		return errors.New("incorrect old password")
	}

	newHash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		return fmt.Errorf("hash password error: %w", err)
	}

	if err := s.userRepo.UpdateUserPassword(ctx, db.UpdateUserPasswordParams{
		ID:           userID,
		PasswordHash: newHash,
	}); err != nil {
		return err
	}

	_ = s.userRepo.RevokeAllUserRefreshTokens(ctx, userID)
	return nil
}
