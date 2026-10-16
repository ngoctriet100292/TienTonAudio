package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/IREAKING/tientonaudio/backend/config"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/service"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/google/uuid"
)

type browserAuthMock struct {
	service.AuthService
	seenRefresh string
}

func browserTokens() *domain.TokenResp {
	return &domain.TokenResp{AccessToken: "private-access-fixture", RefreshToken: "private-refresh-fixture", ExpiresAt: time.Now().Add(time.Hour)}
}
func (*browserAuthMock) Login(context.Context, domain.LoginReq) (*domain.LoginResp, error) {
	return &domain.LoginResp{User: &domain.UserResp{ID: uuid.New(), Username: "fixture"}, Tokens: browserTokens()}, nil
}
func (*browserAuthMock) VerifyTwoFactorLogin(context.Context, domain.TwoFactorVerifyLoginReq) (*domain.UserResp, *domain.TokenResp, error) {
	return &domain.UserResp{ID: uuid.New()}, browserTokens(), nil
}
func (s *browserAuthMock) RefreshToken(_ context.Context, r domain.RefreshTokenReq) (*domain.TokenResp, error) {
	s.seenRefresh = r.RefreshToken
	return browserTokens(), nil
}
func (s *browserAuthMock) Logout(_ context.Context, r domain.LogoutReq) error {
	s.seenRefresh = r.RefreshToken
	return nil
}
func TestBrowserAuthenticationDoesNotReturnCredentials(t *testing.T) {
	cfg := &config.Config{Environment: "production", AppBaseURL: "https://web.example", OAuthPublicURL: "https://api.example"}
	sessions := auth.NewCookieSessions(cfg)
	service := &browserAuthMock{}
	h := NewAuthHandler(service, cfg.AppBaseURL)
	h.SetCookieSessions(sessions)
	for _, test := range []struct {
		name    string
		handler http.HandlerFunc
		body    string
	}{{"login", h.Login, `{"email":"test@example.invalid","password":"fixture"}`}, {"2fa", h.VerifyTwoFactorLogin, `{"mfa_token":"fixture","code":"123456"}`}, {"refresh", h.RefreshToken, `{}`}, {"logout", h.Logout, `{}`}} {
		t.Run(test.name, func(t *testing.T) {
			init := httptest.NewRequest("GET", "https://api.example/api/v1/auth/csrf", nil)
			init.Header.Set("Origin", cfg.AppBaseURL)
			seed := httptest.NewRecorder()
			sessions.CSRF(seed, init)
			csrf := seed.Result().Cookies()[0]
			r := httptest.NewRequest("POST", "https://api.example/api/v1/auth/"+test.name, strings.NewReader(test.body))
			r.Header.Set("Origin", cfg.AppBaseURL)
			r.Header.Set("X-CSRF-Token", csrf.Value)
			r.AddCookie(csrf)
			r.AddCookie(&http.Cookie{Name: "__Host-tienton_refresh", Value: "cookie-refresh-fixture"})
			w := httptest.NewRecorder()
			sessions.Middleware(test.handler).ServeHTTP(w, r)
			if w.Code != 200 {
				t.Fatalf("status %d: %s", w.Code, w.Body.String())
			}
			if strings.Contains(w.Body.String(), "private-access-fixture") || strings.Contains(w.Body.String(), "private-refresh-fixture") {
				t.Fatal("credentials exposed in browser JSON")
			}
			if len(w.Result().Cookies()) != 2 {
				t.Fatal("session cookies missing")
			}
			for _, c := range w.Result().Cookies() {
				if !c.HttpOnly || !c.Secure || c.Path != "/" || c.Domain != "" {
					t.Fatal("unsafe session cookie")
				}
			}
			if test.name == "refresh" || test.name == "logout" {
				if service.seenRefresh != "cookie-refresh-fixture" {
					t.Fatal("refresh token not read from HttpOnly cookie")
				}
			}
		})
	}
	t.Run("native token contract", func(t *testing.T) {
		r := httptest.NewRequest("POST", "/login", strings.NewReader(`{"email":"test@example.invalid","password":"fixture"}`))
		w := httptest.NewRecorder()
		h.Login(w, r)
		if !strings.Contains(w.Body.String(), "private-access-fixture") || len(w.Result().Cookies()) != 0 {
			t.Fatal("native contract changed")
		}
	})
}
