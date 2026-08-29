package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"crypto/subtle"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"net/url"
	"strings"
	"time"
)

const (
	// TOTPPeriod là chu kỳ làm mới mã TOTP (30 giây theo RFC 6238)
	TOTPPeriod = 30
	// TOTPDigits là số chữ số của mã OTP
	TOTPDigits = 6
	// TOTPSecretBytes là độ dài byte của secret ngẫu nhiên (20 bytes = 160 bits)
	TOTPSecretBytes = 20
)

var b32Encoding = base32.StdEncoding.WithPadding(base32.NoPadding)

// GenerateTOTPSecret sinh một secret ngẫu nhiên 20-byte và mã hóa base32.
func GenerateTOTPSecret() (string, error) {
	bytes := make([]byte, TOTPSecretBytes)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random secret: %w", err)
	}
	return b32Encoding.EncodeToString(bytes), nil
}

// GenerateTOTPCode tính mã OTP 6 số tại thời điểm t dựa trên secret.
func GenerateTOTPCode(secret string, t time.Time) (string, error) {
	cleanSecret := strings.ToUpper(strings.TrimSpace(secret))
	key, err := b32Encoding.DecodeString(cleanSecret)
	if err != nil {
		return "", fmt.Errorf("invalid base32 secret: %w", err)
	}

	counter := uint64(t.Unix() / TOTPPeriod)
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, counter)

	mac := hmac.New(sha1.New, key)
	mac.Write(buf)
	hash := mac.Sum(nil)

	offset := hash[len(hash)-1] & 0x0f
	codeInt := (int(hash[offset]&0x7f) << 24) |
		(int(hash[offset+1]&0xff) << 16) |
		(int(hash[offset+2]&0xff) << 8) |
		int(hash[offset+3]&0xff)

	otp := codeInt % 1000000
	return fmt.Sprintf("%06d", otp), nil
}

// ValidateTOTP kiểm tra mã code 6 số với secret trong cửa sổ dung sai +/- 1 chu kỳ (30s).
func ValidateTOTP(secret, code string) bool {
	if len(code) != TOTPDigits {
		return false
	}

	now := time.Now()
	// Kiểm tra cửa sổ: -1 bước, hiện tại, +1 bước để bù trôi lệch đồng hồ
	for step := -1; step <= 1; step++ {
		targetTime := now.Add(time.Duration(step*TOTPPeriod) * time.Second)
		generated, err := GenerateTOTPCode(secret, targetTime)
		if err != nil {
			return false
		}
		if subtle.ConstantTimeCompare([]byte(generated), []byte(code)) == 1 {
			return true
		}
	}

	return false
}

// GenerateOTPAuthURL tạo đường dẫn chuẩn otpauth:// dùng cho mã QR.
func GenerateOTPAuthURL(issuer, accountName, secret string) string {
	label := fmt.Sprintf("%s:%s", issuer, accountName)
	v := url.Values{}
	v.Set("secret", secret)
	v.Set("issuer", issuer)
	v.Set("algorithm", "SHA1")
	v.Set("digits", fmt.Sprintf("%d", TOTPDigits))
	v.Set("period", fmt.Sprintf("%d", TOTPPeriod))

	u := url.URL{
		Scheme:   "otpauth",
		Host:     "totp",
		Path:     "/" + label,
		RawQuery: v.Encode(),
	}

	return u.String()
}

// GenerateBackupCodes sinh danh sách các mã dự phòng cứu hộ 2FA (format: XXXX-XXXX)
func GenerateBackupCodes(count int) ([]string, error) {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // loại bỏ các ký tự dễ nhầm: 0, O, 1, I
	codes := make([]string, count)
	for i := 0; i < count; i++ {
		bytes := make([]byte, 8)
		if _, err := rand.Read(bytes); err != nil {
			return nil, fmt.Errorf("failed to generate backup code: %w", err)
		}
		var sb strings.Builder
		for j, b := range bytes {
			if j == 4 {
				sb.WriteByte('-')
			}
			sb.WriteByte(charset[int(b)%len(charset)])
		}
		codes[i] = sb.String()
	}
	return codes, nil
}

