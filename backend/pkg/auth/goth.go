package auth

import (
	"log/slog"
	"net/http"

	"github.com/gorilla/sessions"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/google"
)

const (
	ProviderGoogle   = "google"
	ProviderApple    = "apple"
	ProviderFacebook = "facebook"
)

const (
	MaxAge = 86400 * 30
)

func NewAuth(googleClientID, googleClientSecret, googleRedirectURL, sessionKey string, isProd bool) {
	store := sessions.NewCookieStore([]byte(sessionKey))
	store.MaxAge(MaxAge)

	store.Options.Path = "/"
	store.Options.HttpOnly = true
	store.Options.Secure = isProd
	store.Options.SameSite = sameSiteMode(isProd)

	gothic.Store = store
	goth.UseProviders(
		google.New(googleClientID, googleClientSecret, googleRedirectURL, "email", "profile"),
	)
	slog.Info("oauth initialized", "provider", ProviderGoogle)
}

func sameSiteMode(isProd bool) http.SameSite {
	if isProd {
		return http.SameSiteLaxMode
	}
	return http.SameSiteDefaultMode
}