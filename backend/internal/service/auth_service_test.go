package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
)

type mockUserRepo struct {
	users         map[uuid.UUID]db.User
	emailTokens   map[string]db.EmailVerificationToken
	resetTokens   map[string]db.PasswordResetToken
	refreshTokens map[string]db.RefreshToken
	backupCodes   map[uuid.UUID]db.TwoFactorBackupCode
}

func newMockUserRepo() *mockUserRepo {
	return &mockUserRepo{
		users:         make(map[uuid.UUID]db.User),
		emailTokens:   make(map[string]db.EmailVerificationToken),
		resetTokens:   make(map[string]db.PasswordResetToken),
		refreshTokens: make(map[string]db.RefreshToken),
		backupCodes:   make(map[uuid.UUID]db.TwoFactorBackupCode),
	}
}

func (m *mockUserRepo) CreateUser(ctx context.Context, arg db.CreateUserParams) (db.CreateUserRow, error) {
	id := uuid.New()
	user := db.User{
		ID:               id,
		Username:         arg.Username,
		Email:            arg.Email,
		PasswordHash:     arg.PasswordHash,
		AvatarUrl:        arg.AvatarUrl,
		Role:             arg.Role,
		IsEmailVerified:  false,
		TwoFactorEnabled: false,
		CreatedAt:        pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt:        pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	m.users[id] = user

	return db.CreateUserRow{
		ID:               id,
		Username:         arg.Username,
		Email:            arg.Email,
		AvatarUrl:        arg.AvatarUrl,
		Role:             arg.Role,
		IsEmailVerified:  false,
		TwoFactorEnabled: false,
		CreatedAt:        user.CreatedAt,
		UpdatedAt:        user.UpdatedAt,
	}, nil
}

func (m *mockUserRepo) GetUserByID(ctx context.Context, id uuid.UUID) (db.User, error) {
	u, ok := m.users[id]
	if !ok {
		return db.User{}, errors.New("user not found")
	}
	return u, nil
}

func (m *mockUserRepo) GetUserByEmail(ctx context.Context, email string) (db.User, error) {
	for _, u := range m.users {
		if u.Email == email {
			return u, nil
		}
	}
	return db.User{}, errors.New("user not found")
}

func (m *mockUserRepo) GetUserByUsername(ctx context.Context, username string) (db.User, error) {
	for _, u := range m.users {
		if u.Username == username {
			return u, nil
		}
	}
	return db.User{}, errors.New("user not found")
}

func (m *mockUserRepo) UpdateUserProfile(ctx context.Context, arg db.UpdateUserProfileParams) (db.UpdateUserProfileRow, error) {
	u, ok := m.users[arg.ID]
	if !ok {
		return db.UpdateUserProfileRow{}, errors.New("user not found")
	}
	u.Username = arg.Username
	u.AvatarUrl = arg.AvatarUrl
	m.users[arg.ID] = u
	return db.UpdateUserProfileRow{
		ID:        u.ID,
		Username:  u.Username,
		Email:     u.Email,
		AvatarUrl: u.AvatarUrl,
		Role:      u.Role,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}, nil
}

func (m *mockUserRepo) UpdateUserPassword(ctx context.Context, arg db.UpdateUserPasswordParams) error {
	u, ok := m.users[arg.ID]
	if !ok {
		return errors.New("user not found")
	}
	u.PasswordHash = arg.PasswordHash
	m.users[arg.ID] = u
	return nil
}

func (m *mockUserRepo) SoftDeleteUser(ctx context.Context, id uuid.UUID) error {
	delete(m.users, id)
	return nil
}

func (m *mockUserRepo) CreateEmailVerificationToken(ctx context.Context, arg db.CreateEmailVerificationTokenParams) (db.EmailVerificationToken, error) {
	token := db.EmailVerificationToken{
		ID:        uuid.New(),
		UserID:    arg.UserID,
		Token:     arg.Token,
		ExpiresAt: arg.ExpiresAt,
		CreatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	m.emailTokens[arg.Token] = token
	return token, nil
}

func (m *mockUserRepo) GetEmailVerificationToken(ctx context.Context, token string) (db.EmailVerificationToken, error) {
	t, ok := m.emailTokens[token]
	if !ok {
		return db.EmailVerificationToken{}, errors.New("token not found")
	}
	return t, nil
}

func (m *mockUserRepo) DeleteEmailVerificationTokensByUserID(ctx context.Context, userID uuid.UUID) error {
	for k, v := range m.emailTokens {
		if v.UserID == userID {
			delete(m.emailTokens, k)
		}
	}
	return nil
}

func (m *mockUserRepo) SetUserEmailVerified(ctx context.Context, id uuid.UUID) error {
	u, ok := m.users[id]
	if !ok {
		return errors.New("user not found")
	}
	u.IsEmailVerified = true
	m.users[id] = u
	return nil
}

func (m *mockUserRepo) UpdateUserTwoFactor(ctx context.Context, arg db.UpdateUserTwoFactorParams) error {
	u, ok := m.users[arg.ID]
	if !ok {
		return errors.New("user not found")
	}
	u.TwoFactorEnabled = arg.TwoFactorEnabled
	u.TwoFactorSecret = arg.TwoFactorSecret
	m.users[arg.ID] = u
	return nil
}

func (m *mockUserRepo) CreateTwoFactorBackupCode(ctx context.Context, arg db.CreateTwoFactorBackupCodeParams) (db.TwoFactorBackupCode, error) {
	id := uuid.New()
	code := db.TwoFactorBackupCode{
		ID:        id,
		UserID:    arg.UserID,
		CodeHash:  arg.CodeHash,
		Used:      false,
		CreatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	m.backupCodes[id] = code
	return code, nil
}

func (m *mockUserRepo) GetUnusedTwoFactorBackupCodesByUserID(ctx context.Context, userID uuid.UUID) ([]db.TwoFactorBackupCode, error) {
	var result []db.TwoFactorBackupCode
	for _, c := range m.backupCodes {
		if c.UserID == userID && !c.Used {
			result = append(result, c)
		}
	}
	return result, nil
}

func (m *mockUserRepo) MarkTwoFactorBackupCodeUsed(ctx context.Context, id uuid.UUID) error {
	c, ok := m.backupCodes[id]
	if !ok {
		return errors.New("backup code not found")
	}
	c.Used = true
	m.backupCodes[id] = c
	return nil
}

func (m *mockUserRepo) DeleteTwoFactorBackupCodesByUserID(ctx context.Context, userID uuid.UUID) error {
	for k, v := range m.backupCodes {
		if v.UserID == userID {
			delete(m.backupCodes, k)
		}
	}
	return nil
}

func (m *mockUserRepo) CreatePasswordResetToken(ctx context.Context, arg db.CreatePasswordResetTokenParams) (db.PasswordResetToken, error) {
	token := db.PasswordResetToken{
		ID:        uuid.New(),
		UserID:    arg.UserID,
		Token:     arg.Token,
		ExpiresAt: arg.ExpiresAt,
		CreatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	m.resetTokens[arg.Token] = token
	return token, nil
}

func (m *mockUserRepo) GetPasswordResetToken(ctx context.Context, token string) (db.PasswordResetToken, error) {
	t, ok := m.resetTokens[token]
	if !ok {
		return db.PasswordResetToken{}, errors.New("token not found")
	}
	return t, nil
}

func (m *mockUserRepo) DeletePasswordResetTokensByUserID(ctx context.Context, userID uuid.UUID) error {
	for k, v := range m.resetTokens {
		if v.UserID == userID {
			delete(m.resetTokens, k)
		}
	}
	return nil
}

func (m *mockUserRepo) CreateRefreshToken(ctx context.Context, arg db.CreateRefreshTokenParams) (db.RefreshToken, error) {
	token := db.RefreshToken{
		ID:        uuid.New(),
		UserID:    arg.UserID,
		TokenHash: arg.TokenHash,
		Revoked:   false,
		ExpiresAt: arg.ExpiresAt,
		CreatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	m.refreshTokens[arg.TokenHash] = token
	return token, nil
}

func (m *mockUserRepo) GetRefreshTokenByHash(ctx context.Context, tokenHash string) (db.RefreshToken, error) {
	t, ok := m.refreshTokens[tokenHash]
	if !ok {
		return db.RefreshToken{}, errors.New("token not found")
	}
	return t, nil
}

func (m *mockUserRepo) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	t, ok := m.refreshTokens[tokenHash]
	if !ok {
		return nil
	}
	t.Revoked = true
	m.refreshTokens[tokenHash] = t
	return nil
}

func (m *mockUserRepo) RevokeAllUserRefreshTokens(ctx context.Context, userID uuid.UUID) error {
	for k, v := range m.refreshTokens {
		if v.UserID == userID {
			v.Revoked = true
			m.refreshTokens[k] = v
		}
	}
	return nil
}

type mockEmailService struct {
	sentVerificationTokens map[string]string // email -> token
	sentResetTokens        map[string]string // email -> token
}

func newMockEmailService() *mockEmailService {
	return &mockEmailService{
		sentVerificationTokens: make(map[string]string),
		sentResetTokens:        make(map[string]string),
	}
}

func (m *mockEmailService) SendVerificationEmail(toEmail, username, token string) error {
	m.sentVerificationTokens[toEmail] = token
	return nil
}

func (m *mockEmailService) SendPasswordResetEmail(toEmail, username, token string) error {
	m.sentResetTokens[toEmail] = token
	return nil
}

func TestAuthService_EmailVerificationFlow(t *testing.T) {
	repo := newMockUserRepo()
	emailSvc := newMockEmailService()
	jwtSvc := auth.NewJWTService("secret-key-32-bytes-minimum-length-req", "issuer")
	svc := NewAuthService(repo, jwtSvc, emailSvc)
	ctx := context.Background()

	// 1. Register
	userResp, err := svc.Register(ctx, domain.RegisterReq{
		Username: "triet",
		Email:    "triet@example.com",
		Password: "Password123!",
	})
	if err != nil {
		t.Fatalf("register failed: %v", err)
	}

	if userResp.IsEmailVerified {
		t.Fatal("newly registered user should not be verified")
	}

	token, ok := emailSvc.sentVerificationTokens["triet@example.com"]
	if !ok || token == "" {
		t.Fatal("expected verification email to be sent with token")
	}

	// 2. Login before verification should fail
	_, err = svc.Login(ctx, domain.LoginReq{
		Email:    "triet@example.com",
		Password: "Password123!",
	})
	if err == nil {
		t.Fatal("expected login to fail for unverified email")
	}

	// 3. Verify email with wrong token should fail
	err = svc.VerifyEmail(ctx, "invalid-token")
	if err == nil {
		t.Fatal("expected invalid token to fail")
	}

	// 4. Verify email with correct token
	err = svc.VerifyEmail(ctx, token)
	if err != nil {
		t.Fatalf("verify email failed: %v", err)
	}

	// 5. Login after verification should succeed
	loginResp, err := svc.Login(ctx, domain.LoginReq{
		Email:    "triet@example.com",
		Password: "Password123!",
	})
	if err != nil {
		t.Fatalf("login failed after verification: %v", err)
	}

	if loginResp.MFARequired {
		t.Fatal("MFA should not be required when 2FA is off")
	}
	if loginResp.Tokens == nil || loginResp.Tokens.AccessToken == "" {
		t.Fatal("expected access token to be issued")
	}
}

func TestAuthService_TwoFactorWithBackupCodes(t *testing.T) {
	repo := newMockUserRepo()
	emailSvc := newMockEmailService()
	jwtSvc := auth.NewJWTService("secret-key-32-bytes-minimum-length-req", "issuer")
	svc := NewAuthService(repo, jwtSvc, emailSvc)
	ctx := context.Background()

	// Register & verify
	u, err := svc.Register(ctx, domain.RegisterReq{
		Username: "triet2fa",
		Email:    "triet2fa@example.com",
		Password: "Password123!",
	})
	if err != nil {
		t.Fatalf("register failed: %v", err)
	}
	token := emailSvc.sentVerificationTokens["triet2fa@example.com"]
	_ = svc.VerifyEmail(ctx, token)

	// 1. Setup 2FA
	setupResp, err := svc.SetupTwoFactor(ctx, u.ID)
	if err != nil {
		t.Fatalf("setup 2fa failed: %v", err)
	}

	// 2. Enable 2FA with valid TOTP code
	validCode, _ := auth.GenerateTOTPCode(setupResp.Secret, time.Now())
	enableResp, err := svc.EnableTwoFactor(ctx, u.ID, domain.TwoFactorEnableReq{
		Secret: setupResp.Secret,
		Code:   validCode,
	})
	if err != nil {
		t.Fatalf("enable 2fa failed: %v", err)
	}

	if len(enableResp.BackupCodes) != 8 {
		t.Fatalf("expected 8 backup codes, got %d", len(enableResp.BackupCodes))
	}
	backupCodeToUse := enableResp.BackupCodes[0]

	// 3. Login returns MFA required
	loginResp, err := svc.Login(ctx, domain.LoginReq{
		Email:    "triet2fa@example.com",
		Password: "Password123!",
	})
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}
	if !loginResp.MFARequired {
		t.Fatal("expected mfa_required=true")
	}

	// 4. Complete login using a Backup Code!
	userFinal, tokensFinal, err := svc.VerifyTwoFactorLogin(ctx, domain.TwoFactorVerifyLoginReq{
		MFAToken: loginResp.MFAToken,
		Code:     backupCodeToUse,
	})
	if err != nil {
		t.Fatalf("login with backup code failed: %v", err)
	}
	if userFinal == nil || tokensFinal == nil {
		t.Fatal("expected user and tokens after backup code login")
	}

	// 5. Reusing the SAME backup code must fail!
	loginResp2, _ := svc.Login(ctx, domain.LoginReq{
		Email:    "triet2fa@example.com",
		Password: "Password123!",
	})
	_, _, err = svc.VerifyTwoFactorLogin(ctx, domain.TwoFactorVerifyLoginReq{
		MFAToken: loginResp2.MFAToken,
		Code:     backupCodeToUse,
	})
	if err == nil {
		t.Fatal("reusing an already used backup code should fail")
	}

	// 6. Disable 2FA using a second backup code
	backupCode2 := enableResp.BackupCodes[1]
	err = svc.DisableTwoFactor(ctx, u.ID, domain.TwoFactorDisableReq{
		Code: backupCode2,
	})
	if err != nil {
		t.Fatalf("disable 2fa with backup code failed: %v", err)
	}
}

func TestAuthService_PasswordResetFlow(t *testing.T) {
	repo := newMockUserRepo()
	emailSvc := newMockEmailService()
	jwtSvc := auth.NewJWTService("secret-key-32-bytes-minimum-length-req", "issuer")
	svc := NewAuthService(repo, jwtSvc, emailSvc)
	ctx := context.Background()

	// Register & verify
	_, err := svc.Register(ctx, domain.RegisterReq{
		Username: "resetuser",
		Email:    "reset@example.com",
		Password: "OldPassword123!",
	})
	if err != nil {
		t.Fatalf("register failed: %v", err)
	}
	token := emailSvc.sentVerificationTokens["reset@example.com"]
	_ = svc.VerifyEmail(ctx, token)

	// 1. Request password reset
	err = svc.ForgotPassword(ctx, domain.ForgotPasswordReq{
		Email: "reset@example.com",
	})
	if err != nil {
		t.Fatalf("forgot password failed: %v", err)
	}

	resetToken, ok := emailSvc.sentResetTokens["reset@example.com"]
	if !ok || resetToken == "" {
		t.Fatal("expected reset token to be sent to email")
	}

	// 2. Reset password with invalid token
	err = svc.ResetPassword(ctx, domain.ResetPasswordReq{
		Token:       "wrong-token",
		NewPassword: "NewPassword123!",
	})
	if err == nil {
		t.Fatal("expected invalid token to fail")
	}

	// 3. Reset password with valid token
	err = svc.ResetPassword(ctx, domain.ResetPasswordReq{
		Token:       resetToken,
		NewPassword: "NewPassword123!",
	})
	if err != nil {
		t.Fatalf("reset password failed: %v", err)
	}

	// 4. Login with old password should fail
	_, err = svc.Login(ctx, domain.LoginReq{
		Email:    "reset@example.com",
		Password: "OldPassword123!",
	})
	if err == nil {
		t.Fatal("login with old password should fail")
	}

	// 5. Login with new password should succeed
	loginResp, err := svc.Login(ctx, domain.LoginReq{
		Email:    "reset@example.com",
		Password: "NewPassword123!",
	})
	if err != nil {
		t.Fatalf("login with new password failed: %v", err)
	}
	if loginResp.Tokens == nil {
		t.Fatal("expected tokens after login with new password")
	}
}

func TestAuthService_RefreshTokenAndLogout(t *testing.T) {
	repo := newMockUserRepo()
	emailSvc := newMockEmailService()
	jwtSvc := auth.NewJWTService("secret-key-32-bytes-minimum-length-req", "issuer")
	svc := NewAuthService(repo, jwtSvc, emailSvc)
	ctx := context.Background()

	// Register & verify
	_, _ = svc.Register(ctx, domain.RegisterReq{
		Username: "refreshuser",
		Email:    "refresh@example.com",
		Password: "Password123!",
	})
	vToken := emailSvc.sentVerificationTokens["refresh@example.com"]
	_ = svc.VerifyEmail(ctx, vToken)

	// Login
	loginResp, err := svc.Login(ctx, domain.LoginReq{
		Email:    "refresh@example.com",
		Password: "Password123!",
	})
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}
	oldRefreshToken := loginResp.Tokens.RefreshToken

	// 1. Refresh token
	newTokens, err := svc.RefreshToken(ctx, domain.RefreshTokenReq{
		RefreshToken: oldRefreshToken,
	})
	if err != nil {
		t.Fatalf("refresh token failed: %v", err)
	}
	if newTokens.AccessToken == "" || newTokens.RefreshToken == "" {
		t.Fatal("expected new token pair")
	}
	if newTokens.RefreshToken == oldRefreshToken {
		t.Fatal("expected rotated refresh token")
	}

	// 2. Old refresh token should now be revoked (rotation)
	_, err = svc.RefreshToken(ctx, domain.RefreshTokenReq{
		RefreshToken: oldRefreshToken,
	})
	if err == nil {
		t.Fatal("using rotated refresh token should fail")
	}

	// 3. Logout with current refresh token
	err = svc.Logout(ctx, domain.LogoutReq{
		RefreshToken: newTokens.RefreshToken,
	})
	if err != nil {
		t.Fatalf("logout failed: %v", err)
	}

	// 4. Refreshing after logout should fail
	_, err = svc.RefreshToken(ctx, domain.RefreshTokenReq{
		RefreshToken: newTokens.RefreshToken,
	})
	if err == nil {
		t.Fatal("refreshing with logged-out token should fail")
	}
}
