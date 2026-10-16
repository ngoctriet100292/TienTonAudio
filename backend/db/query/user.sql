-- name: CreateUser :one
INSERT INTO users (
    username,
    email,
    password_hash,
    avatar_url,
    role
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING id, username, email, avatar_url, role, is_email_verified, two_factor_enabled, cultivation_exp, cultivation_realm, created_at, updated_at;

-- name: GetUserByID :one
SELECT id, username, email, password_hash, avatar_url, role, is_email_verified, two_factor_enabled, two_factor_secret, cultivation_exp, cultivation_realm, provider, provider_id, deleted_at, created_at, updated_at, last_listening_reward_at
FROM users
WHERE id = $1 AND deleted_at IS NULL;

-- name: GetUserByEmail :one
SELECT id, username, email, password_hash, avatar_url, role, is_email_verified, two_factor_enabled, two_factor_secret, cultivation_exp, cultivation_realm, provider, provider_id, deleted_at, created_at, updated_at, last_listening_reward_at
FROM users
WHERE email = $1 AND deleted_at IS NULL;

-- name: GetUserByUsername :one
SELECT id, username, email, password_hash, avatar_url, role, is_email_verified, two_factor_enabled, two_factor_secret, cultivation_exp, cultivation_realm, provider, provider_id, deleted_at, created_at, updated_at, last_listening_reward_at
FROM users
WHERE username = $1 AND deleted_at IS NULL;

-- name: UpdateUserProfile :one
UPDATE users
SET 
    username = $2,
    avatar_url = $3,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND deleted_at IS NULL
RETURNING id, username, email, avatar_url, role, is_email_verified, two_factor_enabled, cultivation_exp, cultivation_realm, created_at, updated_at;

-- name: AddUserCultivationExp :one
UPDATE users
SET 
    cultivation_exp = cultivation_exp + $2,
    cultivation_realm = $3,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND deleted_at IS NULL
RETURNING id, username, email, avatar_url, role, is_email_verified, two_factor_enabled, cultivation_exp, cultivation_realm, created_at, updated_at;

-- name: GetUserCultivation :one
SELECT id, username, cultivation_exp, cultivation_realm
FROM users
WHERE id = $1 AND deleted_at IS NULL;

-- name: UpdateUserPassword :exec
UPDATE users
SET 
    password_hash = $2,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND deleted_at IS NULL;

-- name: SoftDeleteUser :exec
UPDATE users
SET 
    deleted_at = CURRENT_TIMESTAMP
WHERE id = $1;

-- name: CreateEmailVerificationToken :one
INSERT INTO email_verification_tokens (
    user_id,
    token,
    expires_at
) VALUES (
    $1, $2, $3
)
RETURNING id, user_id, token, expires_at, created_at;

-- name: GetEmailVerificationToken :one
SELECT id, user_id, token, expires_at, created_at
FROM email_verification_tokens
WHERE token = $1;

-- name: DeleteEmailVerificationTokensByUserID :exec
DELETE FROM email_verification_tokens
WHERE user_id = $1;

-- name: SetUserEmailVerified :exec
UPDATE users
SET 
    is_email_verified = TRUE,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1;

-- name: UpdateUserTwoFactor :exec
UPDATE users
SET 
    two_factor_enabled = $2,
    two_factor_secret = $3,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND deleted_at IS NULL;

-- name: CreatePasswordResetToken :one
INSERT INTO password_reset_tokens (
    user_id,
    token,
    expires_at
) VALUES (
    $1, $2, $3
)
RETURNING id, user_id, token, expires_at, created_at;

-- name: GetPasswordResetToken :one
SELECT id, user_id, token, expires_at, created_at
FROM password_reset_tokens
WHERE token = $1;

-- name: DeletePasswordResetTokensByUserID :exec
DELETE FROM password_reset_tokens
WHERE user_id = $1;

-- name: CreateRefreshToken :one
INSERT INTO refresh_tokens (
    user_id,
    token_hash,
    expires_at
) VALUES (
    $1, $2, $3
)
RETURNING id, user_id, token_hash, revoked, expires_at, created_at;

-- name: GetRefreshTokenByHash :one
SELECT id, user_id, token_hash, revoked, expires_at, created_at
FROM refresh_tokens
WHERE token_hash = $1;

-- name: RevokeRefreshToken :exec
UPDATE refresh_tokens
SET revoked = TRUE
WHERE token_hash = $1;

-- name: RevokeAllUserRefreshTokens :exec
UPDATE refresh_tokens
SET revoked = TRUE
WHERE user_id = $1;

-- name: CreateTwoFactorBackupCode :one
INSERT INTO two_factor_backup_codes (
    user_id,
    code_hash
) VALUES (
    $1, $2
)
RETURNING id, user_id, code_hash, used, used_at, created_at;

-- name: GetUnusedTwoFactorBackupCodesByUserID :many
SELECT id, user_id, code_hash, used, used_at, created_at
FROM two_factor_backup_codes
WHERE user_id = $1 AND used = FALSE;

-- name: MarkTwoFactorBackupCodeUsed :exec
UPDATE two_factor_backup_codes
SET 
    used = TRUE,
    used_at = CURRENT_TIMESTAMP
WHERE id = $1;

-- name: DeleteTwoFactorBackupCodesByUserID :exec
DELETE FROM two_factor_backup_codes
WHERE user_id = $1;

-- name: CreateOAuthAccount :one
INSERT INTO oauth_accounts (
    user_id,
    provider,
    provider_user_id,
    email,
    avatar_url
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING id, user_id, provider, provider_user_id, email, avatar_url, created_at;

-- name: GetOAuthAccountByProvider :one
SELECT id, user_id, provider, provider_user_id, email, avatar_url, created_at
FROM oauth_accounts
WHERE provider = $1 AND provider_user_id = $2;

-- name: GetOAuthAccountsByUserID :many
SELECT id, user_id, provider, provider_user_id, email, avatar_url, created_at
FROM oauth_accounts
WHERE user_id = $1;



-- name: ConsumeEmailVerificationToken :one
WITH consumed AS (
 DELETE FROM email_verification_tokens
 WHERE (token = sqlc.arg(token_hash) OR (length(token) <> 64 AND token = sqlc.arg(legacy_token))) AND expires_at > CURRENT_TIMESTAMP
 RETURNING user_id
)
UPDATE users SET is_email_verified = TRUE, updated_at = CURRENT_TIMESTAMP
WHERE id = (SELECT user_id FROM consumed LIMIT 1) AND deleted_at IS NULL
RETURNING id;
