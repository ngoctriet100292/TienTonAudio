package oauth

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"github.com/golang-jwt/jwt/v5"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestAppleIdentityTokenValidation(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": []any{map[string]string{"kid": "key-1", "kty": "RSA", "alg": "RS256", "n": base64.RawURLEncoding.EncodeToString(key.N.Bytes()), "e": base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.E)).Bytes())}}})
	}))
	defer server.Close()
	original := jwt.MapClaims{"iss": "https://appleid.apple.com", "aud": "service-id", "sub": "apple-user", "exp": time.Now().Add(time.Minute).Unix(), "nonce": "browser-nonce", "email": "relay@example.com", "email_verified": "true"}
	for _, tc := range []struct {
		name, key, value string
		valid            bool
	}{
		{name: "code flow without at_hash", valid: true},
		{name: "wrong audience", key: "aud", value: "attacker-service"},
		{name: "wrong issuer", key: "iss", value: "https://attacker.example"},
		{name: "wrong nonce", key: "nonce", value: "attacker-nonce"},
		{name: "wrong access token hash", key: "at_hash", value: "wrong"},
		{name: "expired", key: "exp"},
		{name: "missing subject", key: "sub"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			claims := jwt.MapClaims{}
			for k, v := range original {
				claims[k] = v
			}
			if tc.key != "" {
				claims[tc.key] = tc.value
			}
			if tc.key == "exp" {
				claims["exp"] = time.Now().Add(-time.Minute).Unix()
			}
			token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
			token.Header["kid"] = "key-1"
			raw, err := token.SignedString(key)
			if err != nil {
				t.Fatal(err)
			}
			actual, err := verifyAppleToken(context.Background(), server.Client(), raw, "service-id", "browser-nonce", "access-token", server.URL)
			if tc.valid {
				if err != nil || !actual.EmailVerified.Value() {
					t.Fatalf("valid token rejected: %v", err)
				}
			} else if err == nil {
				t.Fatal("invalid token accepted")
			}
		})
	}
}
