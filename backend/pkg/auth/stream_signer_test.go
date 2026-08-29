package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestStreamSigner_GenerateAndValidate(t *testing.T) {
	signer := NewStreamSigner("my-super-secret-stream-signing-key")
	chapterID := uuid.New()
	userID := uuid.New()
	quality := "128k"

	// 1. Sinh token hợp lệ 2 giờ
	token, expiresAt := signer.GenerateSignedStreamToken(chapterID, userID, quality, 2*time.Hour)
	if token == "" || expiresAt.Before(time.Now()) {
		t.Fatalf("failed to generate valid stream token: %s", token)
	}

	// 2. Validate token đúng
	err := signer.ValidateSignedStreamToken(token, chapterID, userID, quality)
	if err != nil {
		t.Fatalf("expected valid token, got error: %v", err)
	}

	// 3. Validate sai chapterID -> phải lỗi
	err = signer.ValidateSignedStreamToken(token, uuid.New(), userID, quality)
	if err == nil {
		t.Fatal("expected error for mismatched chapterID")
	}

	// 4. Validate sai quality -> phải lỗi
	err = signer.ValidateSignedStreamToken(token, chapterID, userID, "320k")
	if err == nil {
		t.Fatal("expected error for mismatched quality")
	}

	// 5. Test hết hạn
	expiredToken, _ := signer.GenerateSignedStreamToken(chapterID, userID, quality, -1*time.Minute)
	err = signer.ValidateSignedStreamToken(expiredToken, chapterID, userID, quality)
	if err == nil {
		t.Fatal("expected error for expired token")
	}

	// 6. Test BuildSignedAudioURL
	url := BuildSignedAudioURL("https://cdn.tientonaudio.vn/audios/ep1.mp3", token, expiresAt)
	if len(url) == 0 || url[:39] != "https://cdn.tientonaudio.vn/audios/ep1." {
		t.Fatalf("unexpected signed audio url: %s", url)
	}
}
