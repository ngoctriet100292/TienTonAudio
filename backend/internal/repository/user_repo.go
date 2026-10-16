package repository

import (
	"context"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/jackc/pgx/v5"

	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/google/uuid"
)

type UserRepository interface {
	ConsumeEmailVerificationToken(context.Context, string) (uuid.UUID, error)
	CreateUser(ctx context.Context, arg db.CreateUserParams) (db.CreateUserRow, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (db.User, error)
	GetUserByEmail(ctx context.Context, email string) (db.User, error)
	GetUserByUsername(ctx context.Context, username string) (db.User, error)
	UpdateUserProfile(ctx context.Context, arg db.UpdateUserProfileParams) (db.UpdateUserProfileRow, error)
	UpdateUserPassword(ctx context.Context, arg db.UpdateUserPasswordParams) error
	SoftDeleteUser(ctx context.Context, id uuid.UUID) error

	// Email Verification
	CreateEmailVerificationToken(ctx context.Context, arg db.CreateEmailVerificationTokenParams) (db.EmailVerificationToken, error)
	GetEmailVerificationToken(ctx context.Context, token string) (db.EmailVerificationToken, error)
	DeleteEmailVerificationTokensByUserID(ctx context.Context, userID uuid.UUID) error
	SetUserEmailVerified(ctx context.Context, id uuid.UUID) error

	// 2FA
	UpdateUserTwoFactor(ctx context.Context, arg db.UpdateUserTwoFactorParams) error
	CreateTwoFactorBackupCode(ctx context.Context, arg db.CreateTwoFactorBackupCodeParams) (db.TwoFactorBackupCode, error)
	GetUnusedTwoFactorBackupCodesByUserID(ctx context.Context, userID uuid.UUID) ([]db.TwoFactorBackupCode, error)
	MarkTwoFactorBackupCodeUsed(ctx context.Context, id uuid.UUID) error
	DeleteTwoFactorBackupCodesByUserID(ctx context.Context, userID uuid.UUID) error

	// Password Reset
	CreatePasswordResetToken(ctx context.Context, arg db.CreatePasswordResetTokenParams) (db.PasswordResetToken, error)
	GetPasswordResetToken(ctx context.Context, token string) (db.PasswordResetToken, error)
	DeletePasswordResetTokensByUserID(ctx context.Context, userID uuid.UUID) error

	// Refresh Tokens
	CreateRefreshToken(ctx context.Context, arg db.CreateRefreshTokenParams) (db.RefreshToken, error)
	GetRefreshTokenByHash(ctx context.Context, tokenHash string) (db.RefreshToken, error)
	RevokeRefreshToken(ctx context.Context, tokenHash string) error
	RevokeAllUserRefreshTokens(ctx context.Context, userID uuid.UUID) error

	// Cultivation (Tu Vi)
	AddUserCultivationExp(ctx context.Context, arg db.AddUserCultivationExpParams) (db.AddUserCultivationExpRow, error)
	GetUserCultivation(ctx context.Context, id uuid.UUID) (db.GetUserCultivationRow, error)

	// OAuth Accounts (Google, Facebook, Apple)
	CreateOAuthAccount(ctx context.Context, arg db.CreateOAuthAccountParams) (db.OauthAccount, error)
	GetOAuthAccountByProvider(ctx context.Context, arg db.GetOAuthAccountByProviderParams) (db.OauthAccount, error)
	GetOAuthAccountsByUserID(ctx context.Context, userID uuid.UUID) ([]db.OauthAccount, error)
}

type userRepo struct {
	q    db.Querier
	pool interface {
		Begin(context.Context) (pgx.Tx, error)
	}
}

func NewUserRepository(q db.Querier, pools ...interface {
	Begin(context.Context) (pgx.Tx, error)
}) UserRepository {
	r := &userRepo{q: q}
	if len(pools) > 0 {
		r.pool = pools[0]
	}
	return r
}

func (r *userRepo) CreateUser(ctx context.Context, arg db.CreateUserParams) (db.CreateUserRow, error) {
	return r.q.CreateUser(ctx, arg)
}

func (r *userRepo) GetUserByID(ctx context.Context, id uuid.UUID) (db.User, error) {
	return r.q.GetUserByID(ctx, id)
}

func (r *userRepo) GetUserByEmail(ctx context.Context, email string) (db.User, error) {
	return r.q.GetUserByEmail(ctx, email)
}

func (r *userRepo) GetUserByUsername(ctx context.Context, username string) (db.User, error) {
	return r.q.GetUserByUsername(ctx, username)
}

func (r *userRepo) UpdateUserProfile(ctx context.Context, arg db.UpdateUserProfileParams) (db.UpdateUserProfileRow, error) {
	return r.q.UpdateUserProfile(ctx, arg)
}

func (r *userRepo) UpdateUserPassword(ctx context.Context, arg db.UpdateUserPasswordParams) error {
	return r.q.UpdateUserPassword(ctx, arg)
}

func (r *userRepo) SoftDeleteUser(ctx context.Context, id uuid.UUID) error {
	return r.q.SoftDeleteUser(ctx, id)
}

func (r *userRepo) CreateEmailVerificationToken(ctx context.Context, arg db.CreateEmailVerificationTokenParams) (db.EmailVerificationToken, error) {
	return r.q.CreateEmailVerificationToken(ctx, arg)
}

func (r *userRepo) GetEmailVerificationToken(ctx context.Context, token string) (db.EmailVerificationToken, error) {
	return r.q.GetEmailVerificationToken(ctx, token)
}

func (r *userRepo) DeleteEmailVerificationTokensByUserID(ctx context.Context, userID uuid.UUID) error {
	return r.q.DeleteEmailVerificationTokensByUserID(ctx, userID)
}

func (r *userRepo) SetUserEmailVerified(ctx context.Context, id uuid.UUID) error {
	return r.q.SetUserEmailVerified(ctx, id)
}

func (r *userRepo) UpdateUserTwoFactor(ctx context.Context, arg db.UpdateUserTwoFactorParams) error {
	return r.q.UpdateUserTwoFactor(ctx, arg)
}

func (r *userRepo) CreateTwoFactorBackupCode(ctx context.Context, arg db.CreateTwoFactorBackupCodeParams) (db.TwoFactorBackupCode, error) {
	return r.q.CreateTwoFactorBackupCode(ctx, arg)
}

func (r *userRepo) GetUnusedTwoFactorBackupCodesByUserID(ctx context.Context, userID uuid.UUID) ([]db.TwoFactorBackupCode, error) {
	return r.q.GetUnusedTwoFactorBackupCodesByUserID(ctx, userID)
}

func (r *userRepo) MarkTwoFactorBackupCodeUsed(ctx context.Context, id uuid.UUID) error {
	return r.q.MarkTwoFactorBackupCodeUsed(ctx, id)
}

func (r *userRepo) DeleteTwoFactorBackupCodesByUserID(ctx context.Context, userID uuid.UUID) error {
	return r.q.DeleteTwoFactorBackupCodesByUserID(ctx, userID)
}

func (r *userRepo) CreatePasswordResetToken(ctx context.Context, arg db.CreatePasswordResetTokenParams) (db.PasswordResetToken, error) {
	return r.q.CreatePasswordResetToken(ctx, arg)
}

func (r *userRepo) GetPasswordResetToken(ctx context.Context, token string) (db.PasswordResetToken, error) {
	return r.q.GetPasswordResetToken(ctx, token)
}

func (r *userRepo) DeletePasswordResetTokensByUserID(ctx context.Context, userID uuid.UUID) error {
	return r.q.DeletePasswordResetTokensByUserID(ctx, userID)
}

func (r *userRepo) CreateRefreshToken(ctx context.Context, arg db.CreateRefreshTokenParams) (db.RefreshToken, error) {
	return r.q.CreateRefreshToken(ctx, arg)
}

func (r *userRepo) GetRefreshTokenByHash(ctx context.Context, tokenHash string) (db.RefreshToken, error) {
	return r.q.GetRefreshTokenByHash(ctx, tokenHash)
}

func (r *userRepo) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	return r.q.RevokeRefreshToken(ctx, tokenHash)
}

func (r *userRepo) RevokeAllUserRefreshTokens(ctx context.Context, userID uuid.UUID) error {
	return r.q.RevokeAllUserRefreshTokens(ctx, userID)
}

func (r *userRepo) AddUserCultivationExp(ctx context.Context, arg db.AddUserCultivationExpParams) (db.AddUserCultivationExpRow, error) {
	return r.q.AddUserCultivationExp(ctx, arg)
}

func (r *userRepo) GetUserCultivation(ctx context.Context, id uuid.UUID) (db.GetUserCultivationRow, error) {
	return r.q.GetUserCultivation(ctx, id)
}

func (r *userRepo) CreateOAuthAccount(ctx context.Context, arg db.CreateOAuthAccountParams) (db.OauthAccount, error) {
	return r.q.CreateOAuthAccount(ctx, arg)
}

func (r *userRepo) GetOAuthAccountByProvider(ctx context.Context, arg db.GetOAuthAccountByProviderParams) (db.OauthAccount, error) {
	return r.q.GetOAuthAccountByProvider(ctx, arg)
}

func (r *userRepo) GetOAuthAccountsByUserID(ctx context.Context, userID uuid.UUID) ([]db.OauthAccount, error) {
	return r.q.GetOAuthAccountsByUserID(ctx, userID)
}
func (r *userRepo) ConsumeEmailVerificationToken(ctx context.Context, token string) (uuid.UUID, error) {
	return r.q.ConsumeEmailVerificationToken(ctx, db.ConsumeEmailVerificationTokenParams{TokenHash: auth.HashTokenSHA256(token), LegacyToken: token})
}
