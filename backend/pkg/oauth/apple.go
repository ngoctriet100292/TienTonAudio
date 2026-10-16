package oauth

import (
	"context"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"math/big"
	"net/http"
	"net/url"

	"github.com/golang-jwt/jwt/v5"
	"github.com/markbates/goth"
	"github.com/markbates/goth/providers/apple"
	"golang.org/x/oauth2"
)

type appleClaims struct {
	jwt.RegisteredClaims
	Nonce           string           `json:"nonce"`
	Email           string           `json:"email"`
	EmailVerified   apple.BoolString `json:"email_verified"`
	PrivateEmail    apple.BoolString `json:"is_private_email"`
	AccessTokenHash string           `json:"at_hash"`
}

// Goth's Apple Session.Authorize requires at_hash, which can be absent in a
// code-flow ID token. Verify signature, issuer, audience, expiry and nonce here;
// validate at_hash as well when Apple supplies it.
func AuthorizeApple(ctx context.Context, p *apple.Provider, s *apple.Session, params goth.Params) error {
	client := p.Client()
	ctx = context.WithValue(ctx, oauth2.HTTPClient, client)
	cfg := oauth2.Config{ClientID: p.ClientId(), ClientSecret: p.Secret(), RedirectURL: p.RedirectURL(), Endpoint: oauth2.Endpoint{AuthURL: "https://appleid.apple.com/auth/authorize", TokenURL: "https://appleid.apple.com/auth/token", AuthStyle: oauth2.AuthStyleInParams}}
	token, err := cfg.Exchange(ctx, params.Get("code"))
	if err != nil {
		return errors.New("Apple code exchange failed")
	}
	raw, ok := token.Extra("id_token").(string)
	if !ok || !token.Valid() {
		return errors.New("Apple did not return a valid identity token")
	}
	authURL, err := url.Parse(s.AuthURL)
	if err != nil {
		return err
	}
	nonce := authURL.Query().Get("nonce")
	if nonce == "" {
		return errors.New("missing Apple nonce")
	}
	claims, err := verifyAppleToken(ctx, client, raw, p.ClientId(), nonce, token.AccessToken, "https://appleid.apple.com/auth/keys")
	if err != nil {
		return err
	}
	s.AccessToken = token.AccessToken
	s.ExpiresAt = token.Expiry
	s.ID = apple.ID{Sub: claims.Subject, Email: claims.Email, EmailVerified: claims.EmailVerified.Value(), IsPrivateEmail: claims.PrivateEmail.Value()}
	return nil
}
func verifyAppleToken(ctx context.Context, client *http.Client, raw, audience, nonce, accessToken, keyURL string) (*appleClaims, error) {
	claims := &appleClaims{}
	token, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (any, error) {
		kid, ok := t.Header["kid"].(string)
		if !ok || kid == "" {
			return nil, errors.New("missing signing key ID")
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, keyURL, nil)
		if err != nil {
			return nil, err
		}
		res, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		defer res.Body.Close()
		if res.StatusCode != 200 {
			return nil, errors.New("Apple signing keys unavailable")
		}
		var set struct {
			Keys []struct{ Kty, Kid, N, E, Use, Alg string }
		}
		if err = json.NewDecoder(io.LimitReader(res.Body, 65536)).Decode(&set); err != nil {
			return nil, err
		}
		for _, key := range set.Keys {
			if key.Kid != kid || key.Kty != "RSA" || (key.Use != "" && key.Use != "sig") || (key.Alg != "" && key.Alg != "RS256") {
				continue
			}
			n, err := base64.RawURLEncoding.DecodeString(key.N)
			if err != nil {
				return nil, err
			}
			e, err := base64.RawURLEncoding.DecodeString(key.E)
			if err != nil || len(e) > 4 {
				return nil, errors.New("invalid RSA exponent")
			}
			exponent := 0
			for _, b := range e {
				exponent = exponent*256 + int(b)
			}
			modulus := new(big.Int).SetBytes(n)
			if exponent < 3 || modulus.BitLen() < 2048 {
				return nil, errors.New("invalid Apple signing key")
			}
			return &rsa.PublicKey{N: modulus, E: exponent}, nil
		}
		return nil, errors.New("unknown Apple signing key")
	}, jwt.WithValidMethods([]string{"RS256"}), jwt.WithIssuer(apple.AppleAudOrIss), jwt.WithAudience(audience), jwt.WithExpirationRequired())
	if err != nil || !token.Valid {
		return nil, errors.New("invalid Apple identity token")
	}
	if claims.Subject == "" || subtle.ConstantTimeCompare([]byte(claims.Nonce), []byte(nonce)) != 1 {
		return nil, errors.New("invalid Apple subject or nonce")
	}
	if claims.AccessTokenHash != "" {
		hash := sha256.Sum256([]byte(accessToken))
		if claims.AccessTokenHash != base64.RawURLEncoding.EncodeToString(hash[:16]) {
			return nil, errors.New("invalid Apple access token hash")
		}
	}
	return claims, nil
}
