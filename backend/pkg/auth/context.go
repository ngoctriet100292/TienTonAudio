// ============================================================================
// AUTH - CONTEXT HELPERS
// ============================================================================
// Helper functions để lưu và lấy claims từ request context.
// Dùng trong middleware (set) và handlers (get).
// ============================================================================

package auth

import "context"

// contextKey là kiểu private để tránh xung đột key trong context
type contextKey string

const claimsContextKey contextKey = "auth_claims"

// SetClaimsToContext lưu AccessClaims vào context
// Dùng trong auth middleware sau khi parse token thành công
func SetClaimsToContext(ctx context.Context, claims *AccessTokenClaims) context.Context {
	return context.WithValue(ctx, claimsContextKey, claims)
}

// GetClaimsFromContext lấy AccessClaims từ context
// Dùng trong handlers để lấy thông tin user đã xác thực
func GetClaimsFromContext(ctx context.Context) (*AccessTokenClaims, bool) {
	claims, ok := ctx.Value(claimsContextKey).(*AccessTokenClaims)
	return claims, ok
}