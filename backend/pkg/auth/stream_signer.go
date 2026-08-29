package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/google/uuid"
)

type StreamSigner struct {
	secretKey []byte
}

func NewStreamSigner(secretKey string) *StreamSigner {
	return &StreamSigner{secretKey: []byte(secretKey)}
}

// GenerateSignedStreamToken tạo chữ ký cho luồng audio
func (s *StreamSigner) GenerateSignedStreamToken(chapterID uuid.UUID, userID uuid.UUID, quality string, ttl time.Duration) (string, time.Time) {
	expiresAt := time.Now().Add(ttl)
	expiresUnix := expiresAt.Unix()

	payload := fmt.Sprintf("%s:%s:%s:%d", chapterID.String(), userID.String(), quality, expiresUnix)
	h := hmac.New(sha256.New, s.secretKey)
	h.Write([]byte(payload))
	signature := hex.EncodeToString(h.Sum(nil))

	token := fmt.Sprintf("%d.%s", expiresUnix, signature)
	return token, expiresAt
}

// ValidateSignedStreamToken kiểm tra token phát nhạc an toàn
func (s *StreamSigner) ValidateSignedStreamToken(token string, chapterID uuid.UUID, userID uuid.UUID, quality string) error {
	var expiresUnix int64
	var signature string

	n, err := fmt.Sscanf(token, "%d.%s", &expiresUnix, &signature)
	if err != nil || n != 2 {
		return errors.New("malformed stream token")
	}

	if time.Now().Unix() > expiresUnix {
		return errors.New("stream token has expired")
	}

	expectedPayload := fmt.Sprintf("%s:%s:%s:%d", chapterID.String(), userID.String(), quality, expiresUnix)
	h := hmac.New(sha256.New, s.secretKey)
	h.Write([]byte(expectedPayload))
	expectedSignature := hex.EncodeToString(h.Sum(nil))

	if subtle.ConstantTimeCompare([]byte(signature), []byte(expectedSignature)) != 1 {
		return errors.New("invalid stream token signature")
	}

	return nil
}

// BuildSignedAudioURL gắn token vào URL gốc của file audio
func BuildSignedAudioURL(rawAudioURL string, token string, expiresAt time.Time) string {
	separator := "?"
	for i := 0; i < len(rawAudioURL); i++ {
		if rawAudioURL[i] == '?' {
			separator = "&"
			break
		}
	}
	return fmt.Sprintf("%s%stoken=%s&expires=%s", rawAudioURL, separator, token, strconv.FormatInt(expiresAt.Unix(), 10))
}
