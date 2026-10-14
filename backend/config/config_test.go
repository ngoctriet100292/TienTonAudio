package config

import "testing"

func TestProductionRejectsDefaultSecrets(t *testing.T) {
	t.Setenv("ENVIRONMENT", "production")
	t.Setenv("JWT_SECRET_KEY", "")
	t.Setenv("PAYMENT_WEBHOOK_SECRET", "")
	if _, err := LoadConfig("does-not-exist.env"); err == nil {
		t.Fatal("production accepted default secrets")
	}
	t.Setenv("JWT_SECRET_KEY", "a-random-production-key-with-more-than-32-bytes")
	t.Setenv("PAYMENT_WEBHOOK_SECRET", "another-random-key-with-more-than-32-bytes")
	if _, err := LoadConfig("does-not-exist.env"); err != nil {
		t.Fatal(err)
	}
}
