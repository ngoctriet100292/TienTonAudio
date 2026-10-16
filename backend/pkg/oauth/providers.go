package oauth

import (
	"errors"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/IREAKING/tientonaudio/backend/config"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/markbates/goth"
	"github.com/markbates/goth/providers/apple"
	"github.com/markbates/goth/providers/facebook"
	"github.com/markbates/goth/providers/google"
)

type Factory func() (goth.Provider, error)

func Providers(cfg *config.Config) (map[string]Factory, error) {
	base, err := url.Parse(strings.TrimRight(cfg.OAuthPublicURL, "/"))
	if err != nil || base.Host == "" || base.User != nil || base.RawQuery != "" || base.Fragment != "" || (base.Scheme != "https" && base.Scheme != "http") {
		return nil, errors.New("invalid OAUTH_PUBLIC_URL")
	}
	if cfg.Environment == "production" && base.Scheme != "https" {
		return nil, errors.New("production OAuth requires HTTPS")
	}
	callback := func(name string) string {
		return strings.TrimRight(cfg.OAuthPublicURL, "/") + "/api/v1/auth/oauth/" + name + "/callback"
	}
	client := &http.Client{Timeout: 15 * time.Second}
	providers := map[string]Factory{}
	if (cfg.GoogleClientID == "") != (cfg.GoogleClientSecret == "") {
		return nil, errors.New("Google requires both client ID and secret")
	}
	if cfg.GoogleClientID != "" {
		p := google.New(cfg.GoogleClientID, cfg.GoogleClientSecret, callback("google"), "openid", "email", "profile")
		p.HTTPClient = client
		p.SetPrompt("select_account")
		p.SetAccessType("online")
		providers["google"] = func() (goth.Provider, error) { return p, nil }
	}
	if (cfg.FacebookClientID == "") != (cfg.FacebookClientSecret == "") {
		return nil, errors.New("Facebook requires both app ID and secret")
	}
	if cfg.FacebookClientID != "" {
		p := facebook.New(cfg.FacebookClientID, cfg.FacebookClientSecret, callback("facebook"), "email", "public_profile")
		p.HTTPClient = client
		p.SetCustomFields([]string{"id", "name", "email", "picture"})
		providers["facebook"] = func() (goth.Provider, error) { return p, nil }
	}
	if cfg.AppleClientID != "" || cfg.AppleTeamID != "" || cfg.AppleKeyID != "" || cfg.ApplePrivateKeyFile != "" {
		if cfg.AppleClientID == "" || cfg.AppleTeamID == "" || cfg.AppleKeyID == "" || cfg.ApplePrivateKeyFile == "" || base.Scheme != "https" {
			return nil, errors.New("Apple requires HTTPS callback, Services ID, Team ID, Key ID and private key file")
		}
		key, err := os.ReadFile(cfg.ApplePrivateKeyFile)
		if err != nil {
			return nil, errors.New("could not read Apple private key file")
		}
		factory := func() (goth.Provider, error) {
			now := time.Now()
			secret, err := apple.MakeSecret(apple.SecretParams{PKCS8PrivateKey: string(key), TeamId: cfg.AppleTeamID, KeyId: cfg.AppleKeyID, ClientId: cfg.AppleClientID, Iat: int(now.Unix()), Exp: int(now.Add(5 * time.Minute).Unix())})
			if err != nil {
				return nil, errors.New("invalid Apple signing key")
			}
			return apple.New(cfg.AppleClientID, *secret, callback("apple"), client, apple.ScopeEmail, apple.ScopeName), nil
		}
		if _, err := factory(); err != nil {
			return nil, err
		}
		providers["apple"] = factory
	}
	return providers, nil
}
func Identity(provider goth.Provider, session goth.Session, user goth.User) (domain.OAuthIdentity, error) {
	if user.Provider != provider.Name() || user.UserID == "" {
		return domain.OAuthIdentity{}, errors.New("invalid provider identity")
	}
	verified := false
	switch provider.Name() {
	case "google":
		verified, _ = user.RawData["verified_email"].(bool)
	case "apple":
		s, ok := session.(*apple.Session)
		if !ok || s.Sub != user.UserID {
			return domain.OAuthIdentity{}, errors.New("invalid Apple session")
		}
		verified = s.EmailVerified
	}
	return domain.OAuthIdentity{Provider: user.Provider, Subject: user.UserID, Email: user.Email, Name: user.Name, AvatarURL: user.AvatarURL, EmailVerified: verified}, nil
}
