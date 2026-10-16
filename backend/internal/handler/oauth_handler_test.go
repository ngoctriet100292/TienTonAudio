package handler

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/internal/service"
	providerauth "github.com/IREAKING/tientonaudio/backend/pkg/oauth"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/markbates/goth"
	"github.com/markbates/goth/providers/google"
)

type oauthMemory struct {
	flows    map[string]repository.OAuthFlow
	codes    map[string]repository.OAuthCode
	identity domain.OAuthIdentity
}

func (m *oauthMemory) SaveFlow(_ context.Context, key string, f repository.OAuthFlow) error {
	m.flows[key] = f
	return nil
}
func (m *oauthMemory) ConsumeFlow(_ context.Context, key, binding, provider string) (repository.OAuthFlow, error) {
	f, ok := m.flows[key]
	if !ok || f.BrowserHash != binding || f.Provider != provider {
		return f, errors.New("invalid flow")
	}
	delete(m.flows, key)
	return f, nil
}
func (m *oauthMemory) SaveCode(_ context.Context, key string, c repository.OAuthCode) error {
	m.codes[key] = c
	return nil
}
func (m *oauthMemory) ConsumeCode(_ context.Context, key, binding, provider string) (repository.OAuthCode, error) {
	c, ok := m.codes[key]
	if !ok || c.BrowserHash != binding || c.Provider != provider {
		return c, errors.New("invalid code")
	}
	delete(m.codes, key)
	return c, nil
}
func (m *oauthMemory) ResolveIdentity(_ context.Context, i domain.OAuthIdentity) (uuid.UUID, bool, error) {
	m.identity = i
	return uuid.New(), true, nil
}

type oauthAuthMock struct {
	service.AuthService
	logins int
}

func (s *oauthAuthMock) LoginOAuthUser(context.Context, uuid.UUID) (*domain.LoginResp, error) {
	s.logins++
	return &domain.LoginResp{MFARequired: true, MFAToken: "mfa-pending-not-access"}, nil
}
func (s *oauthAuthMock) ResendVerificationEmail(context.Context, string) error { return nil }

type oauthTransport func(*http.Request) (*http.Response, error)

func (f oauthTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func TestGothGoogleCallbackStateBindingAndExchange(t *testing.T) {
	calls := 0
	p := google.New("client", "secret", "http://api.local/api/v1/auth/oauth/google/callback", "email", "profile")
	p.HTTPClient = &http.Client{Transport: oauthTransport(func(r *http.Request) (*http.Response, error) {
		calls++
		body := `{"access_token":"provider-access","token_type":"Bearer","expires_in":3600}`
		if strings.Contains(r.URL.Path, "userinfo") {
			body = `{"id":"verified-google-subject","email":"verified@example.com","verified_email":true}`
		}
		return &http.Response{StatusCode: 200, Header: http.Header{"Content-Type": []string{"application/json"}}, Body: io.NopCloser(strings.NewReader(body))}, nil
	})}
	memory := &oauthMemory{flows: map[string]repository.OAuthFlow{}, codes: map[string]repository.OAuthCode{}}
	svc := &oauthAuthMock{}
	h := &OAuthHandler{providers: map[string]providerauth.Factory{"google": func() (goth.Provider, error) { return p, nil }}, repo: memory, auth: svc, webURL: "http://web.local", webOrigin: "http://web.local"}
	router := chi.NewRouter()
	router.Get("/oauth/{provider}", h.Begin)
	router.Get("/oauth/{provider}/callback", h.Callback)
	router.Post("/oauth/exchange", h.Exchange)
	begin := httptest.NewRecorder()
	router.ServeHTTP(begin, httptest.NewRequest("GET", "/oauth/google?redirect=https://attacker.example", nil))
	if begin.Code != 303 {
		t.Fatal(begin.Code)
	}
	authURL, _ := url.Parse(begin.Header().Get("Location"))
	state := authURL.Query().Get("state")
	cookie := begin.Result().Cookies()[0]
	if !cookie.HttpOnly || cookie.SameSite != http.SameSiteLaxMode {
		t.Fatal("unsafe OAuth cookie")
	}
	callbackURL := "/oauth/google/callback?state=" + url.QueryEscape(state) + "&code=real-provider-code&email=attacker@example.com"
	wrong := httptest.NewRequest("GET", callbackURL, nil)
	wrong.AddCookie(&http.Cookie{Name: cookie.Name, Value: "attacker-browser"})
	res := httptest.NewRecorder()
	router.ServeHTTP(res, wrong)
	if !strings.Contains(res.Header().Get("Location"), "invalid_state") || calls != 0 {
		t.Fatal("wrong browser reached provider exchange")
	}
	valid := httptest.NewRequest("GET", callbackURL, nil)
	valid.AddCookie(cookie)
	res = httptest.NewRecorder()
	router.ServeHTTP(res, valid)
	if memory.identity.Email != "verified@example.com" || !memory.identity.EmailVerified || memory.identity.Subject != "verified-google-subject" {
		t.Fatalf("untrusted callback supplied identity: %+v", memory.identity)
	}
	destination, _ := url.Parse(res.Header().Get("Location"))
	code := destination.Query().Get("code")
	if code == "" || strings.Contains(destination.String(), "provider-access") {
		t.Fatal("provider tokens leaked in callback")
	}
	replay := httptest.NewRecorder()
	router.ServeHTTP(replay, valid)
	if !strings.Contains(replay.Header().Get("Location"), "invalid_state") {
		t.Fatal("state reused")
	}
	body, _ := json.Marshal(map[string]string{"provider": "google", "code": code})
	exchange := func(origin, binding string) *httptest.ResponseRecorder {
		req := httptest.NewRequest("POST", "/oauth/exchange", strings.NewReader(string(body)))
		req.Header.Set("Origin", origin)
		req.AddCookie(&http.Cookie{Name: cookie.Name, Value: binding})
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		return w
	}
	if exchange("http://attacker.local", cookie.Value).Code != 403 || exchange(h.webOrigin, "attacker-browser").Code != 401 {
		t.Fatal("exchange accepted wrong origin or browser")
	}
	result := exchange(h.webOrigin, cookie.Value)
	if result.Code != 200 || !strings.Contains(result.Body.String(), "mfa_required") || !strings.Contains(result.Body.String(), `"redirect_path":"/"`) {
		t.Fatalf("exchange failed: %s", result.Body.String())
	}
	if exchange(h.webOrigin, cookie.Value).Code != 401 || svc.logins != 1 {
		t.Fatal("one-use login code replayed")
	}
}
func TestOAuthRedirectRestrictions(t *testing.T) {
	for _, path := range []string{"https://evil.example", "//evil.example", "/\\evil.example", "/\r\nLocation: evil"} {
		if validRedirect(path) != "/" {
			t.Fatalf("unsafe redirect %q", path)
		}
	}
	if validRedirect("/settings?tab=profile") != "/settings?tab=profile" {
		t.Fatal("safe redirect rejected")
	}
}
