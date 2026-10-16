package auth_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/IREAKING/tientonaudio/backend/config"
	"github.com/IREAKING/tientonaudio/backend/internal/middleware"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/google/uuid"
)

func TestBrowserSessionCookieAndCSRF(t *testing.T) {
	cfg := &config.Config{Environment: "production", AppBaseURL: "https://web.example", OAuthPublicURL: "https://api.example", RefreshTokenDuration: 7 * 24 * time.Hour}
	sessions := auth.NewCookieSessions(cfg)
	init := httptest.NewRequest("GET", "https://api.example/api/v1/auth/csrf", nil)
	init.Header.Set("Origin", cfg.AppBaseURL)
	w := httptest.NewRecorder()
	sessions.CSRF(w, init)
	if w.Code != 200 {
		t.Fatal(w.Code)
	}
	csrf := w.Result().Cookies()[0]
	if !csrf.HttpOnly || !csrf.Secure || csrf.Domain != "" || csrf.Path != "/" || !strings.HasPrefix(csrf.Name, "__Host-") {
		t.Fatal("unsafe CSRF cookie attributes")
	}
	jwt := auth.NewJWTService(strings.Repeat("s", 32), "test", time.Hour, 7*24*time.Hour)
	token, expires, err := jwt.GenerateAccessToken(uuid.New(), "test@example.invalid", false, []string{"user"}, nil)
	if err != nil {
		t.Fatal(err)
	}
	issued := httptest.NewRecorder()
	sessions.Issue(issued, token, "refresh-fixture", expires)
	var access *http.Cookie
	for _, c := range issued.Result().Cookies() {
		if !c.HttpOnly || !c.Secure || c.SameSite != http.SameSiteLaxMode || c.Path != "/" || c.Domain != "" {
			t.Fatal("unsafe auth cookie")
		}
		if strings.HasSuffix(c.Name, "_access") {
			access = c
		}
	}
	next := sessions.Middleware(middleware.AuthMiddleware(jwt)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := auth.GetClaimsFromContext(r.Context()); !ok {
			t.Error("no claims")
		}
		w.WriteHeader(204)
	})))
	for _, test := range []struct {
		name, origin, header string
		cookie               bool
		want                 int
	}{{"allowed", cfg.AppBaseURL, csrf.Value, true, 204}, {"missing token", cfg.AppBaseURL, "", true, 403}, {"wrong token", cfg.AppBaseURL, strings.Repeat("x", 43), true, 403}, {"foreign origin", "https://evil.example", csrf.Value, true, 403}, {"no cookie", cfg.AppBaseURL, csrf.Value, false, 403}, {"missing origin", "", csrf.Value, true, 403}} {
		t.Run(test.name, func(t *testing.T) {
			r := httptest.NewRequest("POST", "https://api.example/api/v1/chapters/progress", strings.NewReader("{}"))
			r.Header.Set("Origin", test.origin)
			r.Header.Set("X-CSRF-Token", test.header)
			r.AddCookie(access)
			if test.cookie {
				r.AddCookie(csrf)
			}
			w := httptest.NewRecorder()
			next.ServeHTTP(w, r)
			if w.Code != test.want {
				t.Fatalf("got %d want %d", w.Code, test.want)
			}
		})
	}
	t.Run("same-origin browser without Origin header", func(t *testing.T) {
		r := httptest.NewRequest("POST", "https://api.example/api/v1/chapters/progress", nil)
		r.Header.Set("Sec-Fetch-Site", "same-origin")
		r.Header.Set("X-CSRF-Token", csrf.Value)
		r.AddCookie(access)
		r.AddCookie(csrf)
		w := httptest.NewRecorder()
		next.ServeHTTP(w, r)
		if w.Code != 204 {
			t.Fatalf("same-origin rejected %d", w.Code)
		}
	})
	t.Run("native bearer remains supported", func(t *testing.T) {
		r := httptest.NewRequest("POST", "https://api.example/api/v1/chapters/progress", nil)
		r.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		next.ServeHTTP(w, r)
		if w.Code != 204 {
			t.Fatal(w.Code)
		}
	})
	t.Run("clear cookies", func(t *testing.T) {
		w := httptest.NewRecorder()
		sessions.Clear(w)
		for _, c := range w.Result().Cookies() {
			if c.MaxAge != -1 || c.Value != "" {
				t.Fatal("cookie not deleted")
			}
		}
	})
}
