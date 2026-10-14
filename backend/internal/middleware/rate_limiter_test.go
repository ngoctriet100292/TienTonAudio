package middleware_test

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/IREAKING/tientonaudio/backend/internal/middleware"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/cache"
	"github.com/google/uuid"
)

func TestGetClientIP(t *testing.T) {
	tests := []struct {
		name       string
		remoteAddr string
		headers    map[string]string
		expected   string
	}{
		{
			name:       "remote addr with port",
			remoteAddr: "192.168.1.10:54321",
			expected:   "192.168.1.10",
		},
		{
			name:       "remote addr without port",
			remoteAddr: "192.168.1.10",
			expected:   "192.168.1.10",
		},
		{
			name:       "x-forwarded-for single",
			remoteAddr: "10.0.0.1:1234",
			headers:    map[string]string{"X-Forwarded-For": "203.0.113.195"},
			expected:   "10.0.0.1",
		},
		{
			name:       "x-forwarded-for multi",
			remoteAddr: "10.0.0.1:1234",
			headers:    map[string]string{"X-Forwarded-For": "203.0.113.195, 70.41.3.18, 150.172.238.178"},
			expected:   "10.0.0.1",
		},
		{
			name:       "x-real-ip header",
			remoteAddr: "10.0.0.1:1234",
			headers:    map[string]string{"X-Real-IP": "198.51.100.1"},
			expected:   "10.0.0.1",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/test", nil)
			req.RemoteAddr = tc.remoteAddr
			for k, v := range tc.headers {
				req.Header.Set(k, v)
			}

			ip := middleware.GetClientIP(req)
			if ip != tc.expected {
				t.Fatalf("expected %s, got %s", tc.expected, ip)
			}
		})
	}
}

func TestRateLimiterWithCache(t *testing.T) {
	c := cache.NewMemoryCache()
	defer c.Close()

	limiter := middleware.NewRateLimiter(3, c, "test_rl")

	handler := limiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	for i := 1; i <= 3; i++ {
		req := httptest.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "1.2.3.4:1234"
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("request %d: expected 200, got %d", i, rr.Code)
		}
	}

	// 4th request must be 429 Too Many Requests
	req := httptest.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "1.2.3.4:1234"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("request 4: expected 429, got %d", rr.Code)
	}

	// Different IP should still be allowed
	req2 := httptest.NewRequest("GET", "/test", nil)
	req2.RemoteAddr = "5.6.7.8:1234"
	rr2 := httptest.NewRecorder()
	handler.ServeHTTP(rr2, req2)
	if rr2.Code != http.StatusOK {
		t.Fatalf("different ip: expected 200, got %d", rr2.Code)
	}
}

func TestRateLimiterAuthenticatedUser(t *testing.T) {
	c := cache.NewMemoryCache()
	defer c.Close()

	limiter := middleware.NewRateLimiter(2, c, "user_rl")

	handler := limiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	userID := uuid.New()
	claims := &auth.AccessTokenClaims{UserID: userID}

	// 2 requests for this user should pass
	for i := 1; i <= 2; i++ {
		req := httptest.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "1.2.3.4:1234"
		ctx := auth.SetClaimsToContext(req.Context(), claims)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("user request %d: expected 200, got %d", i, rr.Code)
		}
	}

	// 3rd request from same user from a DIFFERENT IP should still be blocked (keyed by user ID)
	req := httptest.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "9.9.9.9:5555"
	ctx := auth.SetClaimsToContext(req.Context(), claims)
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("user request 3: expected 429, got %d", rr.Code)
	}
}

func TestConcurrentRateLimitAndForgedHeaders(t *testing.T) {
	for _, cached := range []bool{false, true} {
		var c cache.CacheService
		if cached {
			c = cache.NewMemoryCache()
			defer c.Close()
		}
		limiter := middleware.NewRateLimiter(10, c)
		var allowed atomic.Int32
		h := limiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { allowed.Add(1); w.WriteHeader(http.StatusOK) }))
		var wg sync.WaitGroup
		for i := 0; i < 100; i++ {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				req := httptest.NewRequest("POST", "/api/v1/auth/login", nil)
				req.RemoteAddr = "192.0.2.10:5000"
				req.Header.Set("X-Forwarded-For", fmt.Sprintf("198.51.100.%d", i))
				req.Header.Set("Authorization", fmt.Sprintf("Bearer forged-token-%020d", i))
				h.ServeHTTP(httptest.NewRecorder(), req)
			}(i)
		}
		wg.Wait()
		if allowed.Load() != 10 {
			t.Fatalf("cached=%v: allowed %d requests, want 10", cached, allowed.Load())
		}
	}
}

func TestTrustedProxyChain(t *testing.T) {
	for _, tc := range []struct{ remote, forwarded, want string }{
		{"192.0.2.1:5000", "198.51.100.1", "192.0.2.1"},
		{"127.0.0.1:5000", "198.51.100.1, 10.0.0.2", "198.51.100.1"},
		{"127.0.0.1:5000", "203.0.113.1, 198.51.100.2", "198.51.100.2"},
		{"127.0.0.1:5000", "invalid", "127.0.0.1"},
	} {
		h := middleware.TrustedProxyMiddleware([]string{"127.0.0.1/32", "10.0.0.0/8"})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if got := middleware.GetClientIP(r); got != tc.want {
				t.Errorf("got %s,want %s", got, tc.want)
			}
		}))
		req := httptest.NewRequest("GET", "/", nil)
		req.RemoteAddr = tc.remote
		req.Header.Set("X-Forwarded-For", tc.forwarded)
		h.ServeHTTP(httptest.NewRecorder(), req)
	}
}
