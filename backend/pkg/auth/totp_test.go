package auth

import (
	"testing"
	"time"
)

func TestTOTP_GenerateAndValidate(t *testing.T) {
	secret, err := GenerateTOTPSecret()
	if err != nil {
		t.Fatalf("unexpected error generating secret: %v", err)
	}
	if len(secret) == 0 {
		t.Fatal("expected secret to not be empty")
	}

	code, err := GenerateTOTPCode(secret, time.Now())
	if err != nil {
		t.Fatalf("unexpected error generating code: %v", err)
	}
	if len(code) != 6 {
		t.Fatalf("expected 6-digit code, got %s", code)
	}

	if !ValidateTOTP(secret, code) {
		t.Fatalf("expected code %s to be valid for secret %s", code, secret)
	}

	// Invalid code should fail
	if ValidateTOTP(secret, "000000") && code != "000000" {
		t.Fatalf("expected invalid code to fail validation")
	}
}

func TestTOTP_RFC6238Vectors(t *testing.T) {
	// Secret: "12345678901234567890" in base32 is "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
	secret := "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"

	// RFC 6238 test times (T0 = 0, step = 30)
	// Time: 59 -> counter = 1 -> RFC 6238 test vector: "287082"
	t1 := time.Unix(59, 0)
	code1, err := GenerateTOTPCode(secret, t1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if code1 != "287082" {
		t.Errorf("expected 287082, got %s", code1)
	}

	// Time: 1111111109 -> counter = 37037036 -> RFC 6238 test vector: "081804"
	t2 := time.Unix(1111111109, 0)
	code2, err := GenerateTOTPCode(secret, t2)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if code2 != "081804" {
		t.Errorf("expected 081804, got %s", code2)
	}

	// Time: 1234567890 -> counter = 41152263 -> RFC 6238 test vector: "005924"
	t3 := time.Unix(1234567890, 0)
	code3, err := GenerateTOTPCode(secret, t3)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if code3 != "005924" {
		t.Errorf("expected 005924, got %s", code3)
	}
}

func TestTOTP_GenerateOTPAuthURL(t *testing.T) {
	url := GenerateOTPAuthURL("TienTonAudio", "test@example.com", "JBSWY3DPEHPK3PXP")
	expectedPrefix := "otpauth://totp/TienTonAudio:test@example.com?"
	if len(url) < len(expectedPrefix) || url[:len(expectedPrefix)] != expectedPrefix {
		t.Errorf("expected url to start with %s, got %s", expectedPrefix, url)
	}
}

func TestGenerateBackupCodes(t *testing.T) {
	codes, err := GenerateBackupCodes(8)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(codes) != 8 {
		t.Fatalf("expected 8 codes, got %d", len(codes))
	}
	for _, c := range codes {
		if len(c) != 9 { // 4 chars + '-' + 4 chars = 9
			t.Errorf("expected 9-character code (XXXX-XXXX), got %s", c)
		}
		if c[4] != '-' {
			t.Errorf("expected hyphen at index 4, got %s", c)
		}
	}
}

