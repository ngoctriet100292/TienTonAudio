package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestJWTService_GenerateAndParseToken(t *testing.T) {
	secret := "test-secret-key-must-be-long-enough-32-bytes"
	svc := NewJWTService(secret, "test-issuer")

	userID := uuid.New()
	email := "test@example.com"
	roles := []string{"user"}

	tokenStr, expiresAt, err := svc.GenerateAccessToken(userID, email, false, roles, nil)
	if err != nil {
		t.Fatalf("unexpected error generating token: %v", err)
	}

	if tokenStr == "" {
		t.Fatal("expected non-empty token string")
	}

	if expiresAt.Before(time.Now()) {
		t.Fatal("expiresAt should be in the future")
	}

	claims, err := svc.ParseAccessToken(tokenStr)
	if err != nil {
		t.Fatalf("unexpected error parsing token: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("expected userID %s, got %s", userID, claims.UserID)
	}

	if claims.Email != email {
		t.Errorf("expected email %s, got %s", email, claims.Email)
	}
}

func TestPasswordHashing(t *testing.T) {
	password := "SecretPass123!"
	hashed, err := HashPassword(password)
	if err != nil {
		t.Fatalf("unexpected hash error: %v", err)
	}

	if !VerifyPassword(password, hashed) {
		t.Errorf("expected password verification to succeed")
	}

	if VerifyPassword("WrongPass", hashed) {
		t.Errorf("expected wrong password verification to fail")
	}
}

func TestMFAPendingToken(t *testing.T) {
	secret := "test-secret-key-must-be-long-enough-32-bytes"
	svc := NewJWTService(secret, "test-issuer")

	userID := uuid.New()
	email := "mfa-test@example.com"

	tokenStr, err := svc.GenerateMFAPendingToken(userID, email)
	if err != nil {
		t.Fatalf("failed to generate MFA token: %v", err)
	}

	parsedID, parsedEmail, err := svc.VerifyMFAPendingToken(tokenStr)
	if err != nil {
		t.Fatalf("failed to verify MFA token: %v", err)
	}

	if parsedID != userID {
		t.Errorf("expected userID %s, got %s", userID, parsedID)
	}
	if parsedEmail != email {
		t.Errorf("expected email %s, got %s", email, parsedEmail)
	}

	// Tampered token should fail
	_, _, err = svc.VerifyMFAPendingToken(tokenStr + "bad")
	if err == nil {
		t.Error("expected tampered token verification to fail")
	}
}

