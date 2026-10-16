package router_test

import (
	"encoding/json"
	"github.com/IREAKING/tientonaudio/backend/internal/handler"
	"github.com/google/uuid"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/IREAKING/tientonaudio/backend/config"
	"github.com/IREAKING/tientonaudio/backend/internal/router"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/cache"
)

func TestHealthAndReadyzEndpoints(t *testing.T) {
	cfg := &config.Config{
		ServerAddress:      ":8080",
		Environment:        "test",
		CORSAllowedOrigins: []string{"http://localhost:3000"},
	}
	jwtService := auth.NewJWTService("test-secret", "test", 0, 0)
	cacheSvc := cache.NewMemoryCache()
	defer cacheSvc.Close()

	r := router.NewRouter(router.RouterOptions{
		Config:       cfg,
		JWTService:   jwtService,
		CacheService: cacheSvc,
		// DBService is nil in this test unit
	})

	// 1. Test /health (Liveness)
	reqHealth := httptest.NewRequest("GET", "/health", nil)
	rrHealth := httptest.NewRecorder()
	r.ServeHTTP(rrHealth, reqHealth)

	if rrHealth.Code != http.StatusOK {
		t.Fatalf("expected /health to return 200, got %d", rrHealth.Code)
	}

	// 2. Test /readyz (Readiness)
	// DBService is nil, so readiness check will report db: not connected -> 503
	reqReady := httptest.NewRequest("GET", "/readyz", nil)
	rrReady := httptest.NewRecorder()
	r.ServeHTTP(rrReady, reqReady)

	if rrReady.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected /readyz without DB to return 503, got %d", rrReady.Code)
	}

	var readyResp map[string]any
	if err := json.NewDecoder(rrReady.Body).Decode(&readyResp); err != nil {
		t.Fatalf("failed to decode /readyz response: %v", err)
	}
	if readyResp["status"] != "degraded" {
		t.Fatalf("expected status degraded, got %v", readyResp["status"])
	}
}

func TestSwaggerDocEndpoint(t *testing.T) {
	cfg := &config.Config{
		ServerAddress: ":8080",
		Environment:   "test",
	}
	jwtService := auth.NewJWTService("test-secret", "test", 0, 0)

	r := router.NewRouter(router.RouterOptions{
		Config:     cfg,
		JWTService: jwtService,
	})

	req := httptest.NewRequest("GET", "/swagger/doc.json", nil)
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected /swagger/doc.json to return 200, got %d", rr.Code)
	}

	var swaggerDoc map[string]any
	if err := json.NewDecoder(rr.Body).Decode(&swaggerDoc); err != nil {
		t.Fatalf("invalid json returned from /swagger/doc.json: %v", err)
	}
	if swaggerDoc["swagger"] != "2.0" {
		t.Fatalf("expected swagger 2.0 version, got %v", swaggerDoc["swagger"])
	}
}

func TestCORSVaryOrigin(t *testing.T) {
	cfg := &config.Config{
		ServerAddress:      ":8080",
		Environment:        "production",
		CORSAllowedOrigins: []string{"https://tientonaudio.com"},
	}
	jwtService := auth.NewJWTService("test-secret", "test", 0, 0)

	r := router.NewRouter(router.RouterOptions{
		Config:     cfg,
		JWTService: jwtService,
	})

	// Valid origin
	req := httptest.NewRequest("GET", "/health", nil)
	req.Header.Set("Origin", "https://tientonaudio.com")
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Header().Get("Vary") != "Origin" {
		t.Fatalf("expected Vary: Origin header, got %s", rr.Header().Get("Vary"))
	}
	if rr.Header().Get("Access-Control-Allow-Origin") != "https://tientonaudio.com" {
		t.Fatalf("expected allow origin header https://tientonaudio.com, got %s", rr.Header().Get("Access-Control-Allow-Origin"))
	}

	// Disallowed preflight origin
	reqOptions := httptest.NewRequest("OPTIONS", "/api/v1/stories", nil)
	reqOptions.Header.Set("Origin", "https://malicious-site.com")
	reqOptions.Header.Set("Access-Control-Request-Method", "POST")
	rrOptions := httptest.NewRecorder()
	r.ServeHTTP(rrOptions, reqOptions)

	if rrOptions.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden for unauthorized CORS preflight, got %d", rrOptions.Code)
	}
}

func TestPlatformRoutesRequireAuthentication(t *testing.T) {
	cfg := &config.Config{Environment: "test"}
	jwt := auth.NewJWTService("test-secret", "test", time.Hour, time.Hour)
	r := router.NewRouter(router.RouterOptions{Config: cfg, JWTService: jwt, PlatformHandler: handler.NewPlatformHandler(nil)})
	for _, route := range []struct{ method, path string }{
		{"GET", "/users/continue-listening"}, {"GET", "/users/chapters/00000000-0000-0000-0000-000000000001/progress"},
		{"GET", "/users/achievements"}, {"GET", "/users/oauth/accounts"}, {"PUT", "/stories/00000000-0000-0000-0000-000000000001/follow"},
		{"PUT", "/stories/00000000-0000-0000-0000-000000000001/reviews"}, {"GET", "/partner/publications"},
		{"GET", "/partner/analytics"}, {"POST", "/support/tickets"}, {"GET", "/admin/cultivation/realms"}, {"GET", "/admin/subscription-plans"},
	} {
		t.Run(route.method+route.path, func(t *testing.T) {
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest(route.method, "/api/v1"+route.path, nil))
			if w.Code != 401 {
				t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
			}
		})
	}
	token, _, err := jwt.GenerateAccessToken(uuid.New(), "verify@example.invalid", false, []string{"user"}, nil)
	if err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"/admin/cultivation/realms", "/admin/subscription-plans", "/partner/publications", "/partner/analytics"} {
		req := httptest.NewRequest("GET", "/api/v1"+path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != 403 {
			t.Errorf("%s status=%d want=403", path, w.Code)
		}
	}
}
