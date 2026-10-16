package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"

	"github.com/IREAKING/tientonaudio/backend/config"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/internal/service"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	providerauth "github.com/IREAKING/tientonaudio/backend/pkg/oauth"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/markbates/goth/providers/apple"
)

type OAuthHandler struct {
	providers         map[string]providerauth.Factory
	repo              repository.OAuthRepository
	auth              service.AuthService
	webURL, webOrigin string
	secure            bool
	sessions          *auth.CookieSessions
}

func NewOAuthHandler(cfg *config.Config, repo repository.OAuthRepository, svc service.AuthService) (*OAuthHandler, error) {
	providers, err := providerauth.Providers(cfg)
	if err != nil {
		return nil, err
	}
	web, err := url.Parse(cfg.AppBaseURL)
	if err != nil || web.Host == "" || web.User != nil || web.RawQuery != "" || web.Fragment != "" || (web.Scheme != "http" && web.Scheme != "https") {
		return nil, errors.New("invalid APP_BASE_URL")
	}
	if cfg.Environment == "production" && web.Scheme != "https" {
		return nil, errors.New("production web URL must use HTTPS")
	}
	return &OAuthHandler{sessions: auth.NewCookieSessions(cfg), providers: providers, repo: repo, auth: svc, webURL: strings.TrimRight(cfg.AppBaseURL, "/"), webOrigin: web.Scheme + "://" + web.Host, secure: strings.HasPrefix(cfg.OAuthPublicURL, "https://")}, nil
}
func validRedirect(path string) string {
	if !strings.HasPrefix(path, "/") || strings.HasPrefix(path, "//") || strings.ContainsAny(path, "\\\r\n") {
		return "/"
	}
	u, err := url.Parse(path)
	if err != nil || u.IsAbs() || u.Host != "" {
		return "/"
	}
	return path
}
func (h *OAuthHandler) cookie(w http.ResponseWriter, provider, value string, maxAge int) {
	sameSite := http.SameSiteLaxMode
	if h.secure {
		sameSite = http.SameSiteNoneMode
	}
	http.SetCookie(w, &http.Cookie{Name: "tienton_oauth_" + provider, Value: value, Path: "/api/v1/auth/oauth", HttpOnly: true, Secure: h.secure, SameSite: sameSite, MaxAge: maxAge})
}
func (h *OAuthHandler) fail(w http.ResponseWriter, r *http.Request, code string) {
	if r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/link") {
		utils.ErrorResponse(w, 400, "Không thể bắt đầu liên kết đăng nhập; vui lòng thử lại sau")
		return
	}
	http.Redirect(w, r, h.webURL+"/auth/callback?error="+url.QueryEscape(code), http.StatusSeeOther)
}
func oauthHeaders(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Referrer-Policy", "no-referrer")
}
func (h *OAuthHandler) Providers(w http.ResponseWriter, r *http.Request) {
	oauthHeaders(w)
	available := map[string]bool{}
	for _, name := range []string{"google", "facebook", "apple"} {
		_, available[name] = h.providers[name]
	}
	utils.JSON(w, http.StatusOK, available)
}
func (h *OAuthHandler) Begin(w http.ResponseWriter, r *http.Request) {
	oauthHeaders(w)
	name := chi.URLParam(r, "provider")
	factory, ok := h.providers[name]
	if !ok {
		h.fail(w, r, "provider_unavailable")
		return
	}
	provider, err := factory()
	if err != nil {
		h.fail(w, r, "provider_unavailable")
		return
	}
	state, err := auth.GenerateRandomToken()
	if err != nil {
		h.fail(w, r, "login_failed")
		return
	}
	binding, err := auth.GenerateRandomToken()
	if err != nil {
		h.fail(w, r, "login_failed")
		return
	}
	session, err := provider.BeginAuth(state)
	if err != nil {
		h.fail(w, r, "login_failed")
		return
	}
	if s, ok := session.(*apple.Session); ok {
		u, err := url.Parse(s.AuthURL)
		if err != nil {
			h.fail(w, r, "login_failed")
			return
		}
		q := u.Query()
		q.Set("nonce", state)
		u.RawQuery = q.Encode()
		s.AuthURL = u.String()
	}
	authURL, err := session.GetAuthURL()
	if err != nil {
		h.fail(w, r, "login_failed")
		return
	}
	flow := repository.OAuthFlow{Provider: name, BrowserHash: auth.HashTokenSHA256(binding), SessionData: session.Marshal(), RedirectPath: validRedirect(r.URL.Query().Get("redirect"))}
	if r.Method == http.MethodPost {
		claims, ok := auth.GetClaimsFromContext(r.Context())
		if !ok {
			utils.ErrorResponse(w, 401, "Cần đăng nhập")
			return
		}
		profile, err := h.auth.GetProfile(r.Context(), claims.UserID)
		if err != nil || !profile.IsEmailVerified {
			utils.ErrorResponse(w, 403, "Cần xác thực email trước khi liên kết")
			return
		}
		flow.LinkUserID = &claims.UserID
		flow.RedirectPath = "/settings"
	}
	if err = h.repo.SaveFlow(r.Context(), auth.HashTokenSHA256(state), flow); err != nil {
		h.fail(w, r, "login_failed")
		return
	}
	h.cookie(w, name, binding, 600)
	if r.Method == http.MethodPost {
		utils.JSON(w, 200, map[string]string{"auth_url": authURL})
		return
	}
	http.Redirect(w, r, authURL, http.StatusSeeOther)
}
func (h *OAuthHandler) Callback(w http.ResponseWriter, r *http.Request) {
	oauthHeaders(w)
	name := chi.URLParam(r, "provider")
	factory, ok := h.providers[name]
	if !ok {
		h.fail(w, r, "provider_unavailable")
		return
	}
	if (name == "apple" && r.Method != http.MethodPost) || (name != "apple" && r.Method != http.MethodGet) {
		h.fail(w, r, "invalid_callback")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 65536)
	if err := r.ParseForm(); err != nil {
		h.fail(w, r, "invalid_callback")
		return
	}
	params := r.URL.Query()
	if r.Method == http.MethodPost {
		params = r.PostForm
	}
	cookie, err := r.Cookie("tienton_oauth_" + name)
	if err != nil || params.Get("state") == "" {
		h.fail(w, r, "invalid_state")
		return
	}
	flow, err := h.repo.ConsumeFlow(r.Context(), auth.HashTokenSHA256(params.Get("state")), auth.HashTokenSHA256(cookie.Value), name)
	if err != nil {
		h.fail(w, r, "invalid_state")
		return
	}
	if params.Get("error") != "" {
		h.cookie(w, name, "", -1)
		h.fail(w, r, "access_denied")
		return
	}
	if params.Get("code") == "" {
		h.fail(w, r, "invalid_callback")
		return
	}
	provider, err := factory()
	if err != nil {
		h.fail(w, r, "login_failed")
		return
	}
	session, err := provider.UnmarshalSession(flow.SessionData)
	if err != nil {
		h.fail(w, r, "login_failed")
		return
	}
	if p, ok := provider.(*apple.Provider); ok {
		s, ok := session.(*apple.Session)
		if !ok {
			h.fail(w, r, "login_failed")
			return
		}
		err = providerauth.AuthorizeApple(r.Context(), p, s, params)
	} else {
		_, err = session.Authorize(provider, params)
	}
	if err != nil {
		h.fail(w, r, "login_failed")
		return
	}
	user, err := provider.FetchUser(session)
	if err != nil {
		h.fail(w, r, "login_failed")
		return
	}
	identity, err := providerauth.Identity(provider, session, user)
	if err != nil {
		h.fail(w, r, "login_failed")
		return
	}
	if flow.LinkUserID != nil {
		linker, ok := h.repo.(interface {
			LinkIdentity(context.Context, uuid.UUID, domain.OAuthIdentity) error
		})
		if !ok {
			h.fail(w, r, "login_failed")
			return
		}
		if err = linker.LinkIdentity(r.Context(), *flow.LinkUserID, identity); err != nil {
			h.fail(w, r, "email_conflict")
			return
		}
		h.cookie(w, name, "", -1)
		http.Redirect(w, r, h.webURL+"/account?linked="+name, http.StatusSeeOther)
		return
	}
	id, created, err := h.repo.ResolveIdentity(r.Context(), identity)
	if errors.Is(err, repository.ErrOAuthEmailConflict) {
		h.fail(w, r, "email_conflict")
		return
	}
	if err != nil {
		h.fail(w, r, "email_unavailable")
		return
	}
	if created && !identity.EmailVerified {
		_ = h.auth.ResendVerificationEmail(r.Context(), identity.Email)
	}
	code, err := auth.GenerateRandomToken()
	if err != nil {
		h.fail(w, r, "login_failed")
		return
	}
	if err = h.repo.SaveCode(r.Context(), auth.HashTokenSHA256(code), repository.OAuthCode{Provider: name, BrowserHash: flow.BrowserHash, UserID: id, RedirectPath: flow.RedirectPath}); err != nil {
		h.fail(w, r, "login_failed")
		return
	}
	http.Redirect(w, r, h.webURL+"/auth/callback?provider="+name+"&code="+url.QueryEscape(code), http.StatusSeeOther)
}
func (h *OAuthHandler) Exchange(w http.ResponseWriter, r *http.Request) {
	oauthHeaders(w)
	if r.Header.Get("Origin") != h.webOrigin {
		utils.ErrorResponse(w, http.StatusForbidden, "Origin không hợp lệ")
		return
	}
	var req struct {
		Code     string `json:"code"`
		Provider string `json:"provider"`
	}
	if json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req) != nil || req.Code == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Mã đăng nhập không hợp lệ")
		return
	}
	if _, ok := h.providers[req.Provider]; !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Nhà cung cấp không hợp lệ")
		return
	}
	cookie, err := r.Cookie("tienton_oauth_" + req.Provider)
	if err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Phiên đăng nhập đã hết hạn")
		return
	}
	code, err := h.repo.ConsumeCode(r.Context(), auth.HashTokenSHA256(req.Code), auth.HashTokenSHA256(cookie.Value), req.Provider)
	if err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Mã đăng nhập đã hết hạn hoặc đã được dùng")
		return
	}
	h.cookie(w, req.Provider, "", -1)
	resp, err := h.auth.LoginOAuthUser(r.Context(), code.UserID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Không thể đăng nhập tài khoản")
		return
	}
	if auth.BrowserSession(r) && resp.Tokens != nil {
		tokens := resp.Tokens
		h.sessions.Issue(w, tokens.AccessToken, tokens.RefreshToken, tokens.ExpiresAt)
		resp.Tokens = nil
		resp.CookieSession = true
	}
	resp.RedirectPath = validRedirect(code.RedirectPath)
	utils.JSON(w, http.StatusOK, resp)
}
