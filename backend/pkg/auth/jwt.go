package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/golang-jwt/jwt/v5"
)

const (
	// AccessTokenTTL - Thời gian sống của access token (15 phút)
	AccessTokenTTL = 15 * time.Minute

	// RefreshTokenTTL - Thời gian sống của refresh token (30 ngày)
	RefreshTokenTTL = 30 * 24 * time.Hour

	// RefreshTokenBytes - Số byte của refresh token
	RefreshTokenBytes = 32
)

type TokenPair struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	TokenType    string    `json:"token_type"` // "Bearer"
}

// AccessClaims là payload của JWT access token
type AccessTokenClaims struct {
	jwt.RegisteredClaims
	UserID      uuid.UUID `json:"user_id"`
	Email       string    `json:"email"`
	IsPremium   bool      `json:"is_premium"`
	Role        string    `json:"role,omitempty"`
	Roles       []string  `json:"roles,omitempty"`
	Permissions []string  `json:"permissions,omitempty"`
	TokenID     string    `json:"token_id"` // Unique token ID (chống replay)
}

func (c *AccessTokenClaims) HasRole(role string) bool {
	if c.Role == role {
		return true
	}
	for _, r := range c.Roles {
		if r == role {
			return true
		}
	}
	return false
}

// RefreshTokenData là dữ liệu lưu trong refresh token (trước khi hash)
type RefreshTokenData struct {
	Token     string    `json:"token"` // Token gốc gửi cho client (trước khi hash)
	Hash      string    `json:"hash"`  // SHA-256 hash lưu trong DB
	ExpiresAt time.Time `json:"expires_at"`
	UserID    string    `json:"user_id"`
}

// JWT SERVICE

type JWTService struct {
	secret     []byte
	issuer     string
	acessTTL   time.Duration
	refreshTTL time.Duration
}

func NewJWTService(secret, issuer string, accessTTL, refreshTTL time.Duration) *JWTService {
	if accessTTL <= 0 {
		accessTTL = AccessTokenTTL
	}
	if refreshTTL <= 0 {
		refreshTTL = RefreshTokenTTL
	}
	return &JWTService{
		secret:     []byte(secret),
		issuer:     issuer,
		acessTTL:   accessTTL,
		refreshTTL: refreshTTL,
	}
}

func (s *JWTService) GenerateAccessToken(userID uuid.UUID, email string, isPremium bool, roles, permissions []string) (string, time.Time, error) {
	now := time.Now()
	expiresAt := now.Add(s.acessTTL)
	tokenID := uuid.New().String() // Unique token ID

	mainRole := "user"
	if len(roles) > 0 {
		mainRole = roles[0]
	}

	claims := AccessTokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.issuer,
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			ID:        tokenID,
		},
		UserID:      userID,
		Email:       email,
		IsPremium:   isPremium,
		Role:        mainRole,
		Roles:       roles,
		Permissions: permissions,
		TokenID:     tokenID,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(s.secret)
	if err != nil {
		return "", time.Time{}, err
	}

	return signedToken, expiresAt, nil
}

// ParseAccessToken giải mã và validate JWT access token
// Trả về claims nếu token hợp lệ, ngược lại trả về lỗi cụ thể

func (s *JWTService) ParseAccessToken(signedToken string) (*AccessTokenClaims, error) {
	token, err := jwt.ParseWithClaims(signedToken, &AccessTokenClaims{},
		func(token *jwt.Token) (any, error) {
			// Đảm bảo thuật toán là HMAC-SHA256
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return s.secret, nil
		},
		jwt.WithIssuer(s.issuer),
		jwt.WithLeeway(30*time.Second), // Cho phép lệch 5 giây để tránh lỗi clock skew
	)
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*AccessTokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}

// ============================================================================
// REFRESH TOKEN
// ============================================================================

// GenerateRefreshToken tạo refresh token + hash để lưu DB
//
// Cách hoạt động:
//  1. Sinh 32 bytes random → refreshToken (gửi client)
//  2. SHA-256(refreshToken) → hash (lưu DB)
//  3. Client không bao giờ thấy hash, DB không bao giờ thấy raw token
//
// Khi validate: hash(token từ client) so với hash trong DB
func (s *JWTService) GenerateRefreshToken(userID uuid.UUID) (*RefreshTokenData, error) {
	// 1. Sinh 32 bytes random
	raw := make([]byte, RefreshTokenBytes)
	if _, err := rand.Read(raw); err != nil {
		return nil, fmt.Errorf("generate refresh token: %w", err)
	}

	// 2. Encode thành string an toàn cho HTTP header
	token := base64.RawURLEncoding.EncodeToString(raw)

	// 3. Hash để lưu DB
	hash := s.HashToken(token)

	return &RefreshTokenData{
		Token:     token,
		Hash:      hash,
		ExpiresAt: time.Now().Add(s.refreshTTL),
		UserID:    userID.String(),
	}, nil
}

// GenerateTokenPair tạo cả access + refresh token trong 1 lần gọi
func (s *JWTService) GenerateTokenPair(userID uuid.UUID, email string, isPremium bool, roles []string, permissions []string) (*TokenPair, error) {
	// Access token
	accessToken, expiresAt, err := s.GenerateAccessToken(userID, email, isPremium, roles, permissions)
	if err != nil {
		return nil, fmt.Errorf("generate token pair: %w", err)
	}

	// Refresh token
	refreshData, err := s.GenerateRefreshToken(userID)
	if err != nil {
		return nil, fmt.Errorf("generate token pair: %w", err)
	}
	_ = refreshData // hash sẽ được lưu bởi repository layer

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshData.Token,
		ExpiresAt:    expiresAt,
		TokenType:    "Bearer",
	}, nil
}

// ============================================================================
// HASHING (SHA-256 HMAC cho refresh token)
// ============================================================================

// HashToken băm refresh token trước khi lưu DB
// Dùng HMAC-SHA256 với secret làm key → chống rainbow table attack
func (s *JWTService) HashToken(token string) string {
	mac := hmac.New(sha256.New, s.secret)
	mac.Write([]byte(token))
	return hex.EncodeToString(mac.Sum(nil))
}

// VerifyTokenHash so sánh token client gửi với hash trong DB
// Dùng hmac.Equal để chống timing attack
func (s *JWTService) VerifyTokenHash(token string, hash string) bool {
	expected := s.HashToken(token)
	return hmac.Equal([]byte(expected), []byte(hash))
}

// HashTokenSHA256 băm đơn giản (dùng cho verification token, không cần HMAC)
func HashTokenSHA256(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// ============================================================================
// UTILS
// ============================================================================

// ExtractBearerToken lấy token từ header "Authorization: Bearer <token>"
func ExtractBearerToken(authHeader string) (string, error) {
	const prefix = "Bearer "
	if len(authHeader) < len(prefix) || authHeader[:len(prefix)] != prefix {
		return "", fmt.Errorf("invalid authorization header: must be 'Bearer <token>'")
	}
	token := authHeader[len(prefix):]
	if token == "" {
		return "", fmt.Errorf("empty token")
	}
	return token, nil
}

// GenerateRandomToken sinh token ngẫu nhiên cho email verification, password reset
func GenerateRandomToken() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("generate random token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

// MFAPendingClaims là claims dùng cho bước tạm thời khi đăng nhập yêu cầu 2FA
type MFAPendingClaims struct {
	jwt.RegisteredClaims
	UserID  uuid.UUID `json:"user_id"`
	Email   string    `json:"email"`
	Purpose string    `json:"purpose"` // "2fa_login"
}

// GenerateMFAPendingToken tạo token tạm thời (5 phút) cho người dùng hoàn tất bước 2FA
func (s *JWTService) GenerateMFAPendingToken(userID uuid.UUID, email string) (string, error) {
	now := time.Now()
	expiresAt := now.Add(5 * time.Minute)
	claims := MFAPendingClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.issuer,
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			ID:        uuid.New().String(),
		},
		UserID:  userID,
		Email:   email,
		Purpose: "2fa_login",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secret)
}

// VerifyMFAPendingToken kiểm tra token 2FA tạm thời và trả về UserID, Email
func (s *JWTService) VerifyMFAPendingToken(tokenStr string) (uuid.UUID, string, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &MFAPendingClaims{},
		func(token *jwt.Token) (any, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return s.secret, nil
		},
		jwt.WithIssuer(s.issuer),
	)
	if err != nil {
		return uuid.Nil, "", err
	}
	claims, ok := token.Claims.(*MFAPendingClaims)
	if !ok || !token.Valid || claims.Purpose != "2fa_login" {
		return uuid.Nil, "", errors.New("invalid or expired 2FA login token")
	}
	return claims.UserID, claims.Email, nil
}

