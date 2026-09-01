package middleware

import (
	"net/http"

	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

// AuthMiddleware creates a middleware that validates JWT Access Token
func AuthMiddleware(jwtService *auth.JWTService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				utils.ErrorResponse(w, http.StatusUnauthorized, "Missing Authorization header")
				return
			}

			tokenStr, err := auth.ExtractBearerToken(authHeader)
			if err != nil {
				utils.ErrorResponse(w, http.StatusUnauthorized, err.Error())
				return
			}

			claims, err := jwtService.ParseAccessToken(tokenStr)
			if err != nil {
				utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid or expired access token")
				return
			}

			ctx := auth.SetClaimsToContext(r.Context(), claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// OptionalAuthMiddleware validates JWT if present, but allows unauthenticated requests
func OptionalAuthMiddleware(jwtService *auth.JWTService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader != "" {
				if tokenStr, err := auth.ExtractBearerToken(authHeader); err == nil {
					if claims, err := jwtService.ParseAccessToken(tokenStr); err == nil {
						r = r.WithContext(auth.SetClaimsToContext(r.Context(), claims))
					}
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RequireAdmin creates a middleware that verifies the user has the 'admin' role
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.GetClaimsFromContext(r.Context())
		if !ok {
			utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		if !claims.HasRole("admin") {
			utils.ErrorResponse(w, http.StatusForbidden, "Forbidden: Admin access required")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// RequireRoles creates a middleware that verifies the user has at least one of the specified roles
func RequireRoles(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := auth.GetClaimsFromContext(r.Context())
			if !ok {
				utils.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
				return
			}

			for _, role := range roles {
				if claims.HasRole(role) {
					next.ServeHTTP(w, r)
					return
				}
			}

			utils.ErrorResponse(w, http.StatusForbidden, "Forbidden: Bạn chưa có quyền Đối Tác hoặc Quản Trị Viên")
		})
	}
}

// RequirePartnerOrAdmin cho phép đối tác sáng tác, người đọc audio và admin
func RequirePartnerOrAdmin(next http.Handler) http.Handler {
	return RequireRoles("partner", "narrator", "creator", "admin")(next)
}