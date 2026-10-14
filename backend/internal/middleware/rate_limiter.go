package middleware

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/cache"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type clientLimit struct {
	count     int
	resetTime time.Time
}

type RateLimiter struct {
	lastCleanup time.Time
	mu          sync.Mutex
	clients     map[string]*clientLimit
	rateLimit   int
	cache       cache.CacheService
	prefix      string
}

// NewRateLimiter tạo rate limiter mới với số requests mỗi phút và cache backend (Redis hoặc Memory)
func NewRateLimiter(requestsPerMinute int, cacheSvc cache.CacheService, prefix ...string) *RateLimiter {
	p := "rl:"
	if len(prefix) > 0 && prefix[0] != "" {
		p = "rl:" + prefix[0] + ":"
	}

	rl := &RateLimiter{
		clients:   make(map[string]*clientLimit),
		rateLimit: requestsPerMinute,
		cache:     cacheSvc,
		prefix:    p,
	}

	if rl.rateLimit <= 0 {
		rl.rateLimit = 300
	}

	return rl
}

// Proxy headers are resolved only by TrustedProxyMiddleware; direct headers are never trusted here.
func GetClientIP(r *http.Request) string {
	return stripPort(r.RemoteAddr)
}

func stripPort(addr string) string {
	host, _, err := net.SplitHostPort(addr)
	if err == nil {
		return host
	}
	return strings.Trim(addr, "[]")
}

func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Bỏ qua rate limit cho OPTIONS preflight, health checks, static assets, storage và audio streaming
		if r.Method == http.MethodOptions ||
			r.URL.Path == "/health" || r.URL.Path == "/readyz" ||
			strings.HasPrefix(r.URL.Path, "/uploads/") ||
			strings.HasPrefix(r.URL.Path, "/api/v1/storage/") ||
			strings.HasSuffix(r.URL.Path, "/stream") {
			next.ServeHTTP(w, r)
			return
		}

		clientIP := GetClientIP(r)

		// Key kết hợp: UserID nếu đã đăng nhập hoặc có Authorization header, ngược lại dùng Real IP
		key := "ip:" + clientIP
		if claims, ok := auth.GetClaimsFromContext(r.Context()); ok && claims.UserID != uuid.Nil {
			key = "usr:" + claims.UserID.String()
		}

		if rl.cache != nil {
			ctx, cancel := context.WithTimeout(r.Context(), 250*time.Millisecond)
			count, err := rl.cache.Increment(ctx, rl.prefix+key, time.Minute)
			cancel()
			if err == nil {
				if count > int64(rl.rateLimit) {
					w.Header().Set("Retry-After", "60")
					utils.ErrorResponse(w, http.StatusTooManyRequests, "Quá nhiều yêu cầu. Vui lòng thử lại sau giây lát.")
					return
				}
				next.ServeHTTP(w, r)
				return
			}
		}

		// 2. Fallback memory rate limiter
		rl.mu.Lock()
		now := time.Now()
		if now.Sub(rl.lastCleanup) >= time.Minute {
			for key, limit := range rl.clients {
				if !now.Before(limit.resetTime) {
					delete(rl.clients, key)
				}
			}
			rl.lastCleanup = now
		}
		cl, exists := rl.clients[key]
		if !exists || now.After(cl.resetTime) {
			rl.clients[key] = &clientLimit{
				count:     1,
				resetTime: now.Add(1 * time.Minute),
			}
			rl.mu.Unlock()
			next.ServeHTTP(w, r)
			return
		}

		if cl.count >= rl.rateLimit {
			rl.mu.Unlock()
			utils.ErrorResponse(w, http.StatusTooManyRequests, fmt.Sprintf("Too many requests (limit: %d/min). Please try again later.", rl.rateLimit))
			return
		}

		cl.count++
		rl.mu.Unlock()
		next.ServeHTTP(w, r)
	})
}
