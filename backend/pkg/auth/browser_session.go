package auth

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/IREAKING/tientonaudio/backend/config"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type CookieSessions struct {
	Secure      bool
	SameSite    http.SameSite
	RefreshTTL  time.Duration
	Origins     []string
	Development bool
}
type cookieSessionKey struct{}

func NewCookieSessions(cfg *config.Config) *CookieSessions {
	sameSite := http.SameSiteLaxMode
	if cfg.SessionCookieSameSite == "none" {
		sameSite = http.SameSiteNoneMode
	}
	return &CookieSessions{Secure: cfg.Environment == "production" || strings.HasPrefix(cfg.OAuthPublicURL, "https://"), SameSite: sameSite, RefreshTTL: cfg.RefreshTokenDuration, Origins: append(append([]string{}, cfg.CORSAllowedOrigins...), cfg.AppBaseURL, cfg.OAuthPublicURL), Development: cfg.Environment != "production"}
}
func BrowserSession(r *http.Request) bool {
	return r.Header.Get("X-Session-Mode") == "cookie" || r.Header.Get("Origin") != "" || r.Header.Get("Sec-Fetch-Site") != ""
}
func (s *CookieSessions) name(kind string) string {
	prefix := ""
	if s.Secure {
		prefix = "__Host-"
	}
	return prefix + "tienton_" + kind
}
func (s *CookieSessions) cookie(w http.ResponseWriter, kind, value string, ttl time.Duration) {
	age := int(ttl.Seconds())
	expires := time.Now().Add(ttl)
	if value == "" {
		age = -1
		expires = time.Unix(1, 0)
	}
	http.SetCookie(w, &http.Cookie{Name: s.name(kind), Value: value, Path: "/", HttpOnly: true, Secure: s.Secure, SameSite: s.SameSite, MaxAge: age, Expires: expires})
}
func (s *CookieSessions) Issue(w http.ResponseWriter, access, refresh string, expiresAt time.Time) {
	w.Header().Set("Cache-Control", "no-store")
	s.cookie(w, "access", access, time.Until(expiresAt))
	ttl := s.RefreshTTL
	if ttl <= 0 {
		ttl = RefreshTokenTTL
	}
	s.cookie(w, "refresh", refresh, ttl)
}
func (s *CookieSessions) Clear(w http.ResponseWriter) {
	s.cookie(w, "access", "", -time.Second)
	s.cookie(w, "refresh", "", -time.Second)
}
func (s *CookieSessions) Refresh(r *http.Request) string {
	c, e := r.Cookie(s.name("refresh"))
	if e != nil {
		return ""
	}
	return c.Value
}
func CookieAccessToken(r *http.Request) string {
	s, _ := r.Context().Value(cookieSessionKey{}).(*CookieSessions)
	if s == nil {
		return ""
	}
	c, e := r.Cookie(s.name("access"))
	if e != nil {
		return ""
	}
	return c.Value
}
func (s *CookieSessions) allowed(origin string) bool {
	for _, v := range s.Origins {
		if strings.TrimRight(v, "/") == origin && origin != "" && origin != "null" && origin != "*" {
			return true
		}
	}
	if s.Development {
		u, e := url.Parse(origin)
		return e == nil && u.Scheme == "http" && (u.Hostname() == "localhost" || u.Hostname() == "127.0.0.1")
	}
	return false
}
func (s *CookieSessions) allowedRequest(r *http.Request) bool {
	if origin := r.Header.Get("Origin"); origin != "" {
		return s.allowed(origin)
	}
	if r.Header.Get("Sec-Fetch-Site") == "same-origin" {
		scheme := "http"
		if s.Secure {
			scheme = "https"
		}
		return s.allowed(scheme + "://" + r.Host)
	}
	return false
}
func (s *CookieSessions) CSRF(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Vary", "Origin")
	if !s.allowedRequest(r) {
		utils.ErrorResponse(w, 403, "Origin không hợp lệ")
		return
	}
	// Reuse a browser's random value so concurrent tabs do not invalidate each other.
	token := ""
	if c, e := r.Cookie(s.name("csrf")); e == nil && len(c.Value) == 43 {
		token = c.Value
	}
	if token == "" {
		var e error
		token, e = GenerateRandomToken()
		if e != nil {
			utils.ErrorResponse(w, 500, "Không tạo được phiên bảo vệ")
			return
		}
	}
	s.cookie(w, "csrf", token, 24*time.Hour)
	utils.JSON(w, 200, map[string]string{"csrf_token": token})
}
func (s *CookieSessions) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r = r.WithContext(context.WithValue(r.Context(), cookieSessionKey{}, s))
		if BrowserSession(r) || CookieAccessToken(r) != "" || s.Refresh(r) != "" || r.Header.Get("Authorization") != "" {
			w.Header().Set("Cache-Control", "private, no-store")
			w.Header().Add("Vary", "Cookie")
			w.Header().Add("Vary", "Authorization")
			w.Header().Add("Vary", "X-Session-Mode")
		}
		safe := r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions
		_, a := r.Cookie(s.name("access"))
		_, b := r.Cookie(s.name("refresh"))
		callback := r.URL.Path == "/api/v1/auth/oauth/apple/callback" || r.URL.Path == "/api/v1/auth/oauth/google/callback" || r.URL.Path == "/api/v1/auth/oauth/facebook/callback"
		if !safe && !callback && (BrowserSession(r) || a == nil || b == nil) {
			csrf, e := r.Cookie(s.name("csrf"))
			header := r.Header.Get("X-CSRF-Token")
			if !s.allowedRequest(r) || e != nil || len(header) != 43 || subtle.ConstantTimeCompare([]byte(header), []byte(csrf.Value)) != 1 {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(403)
				_ = json.NewEncoder(w).Encode(map[string]any{"success": false, "error": "Phiên bảo vệ đã hết hạn; vui lòng thử lại", "code": "csrf_failed"})
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
