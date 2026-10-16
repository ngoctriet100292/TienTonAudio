package service

import (
	"context"
	"errors"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/storage"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"net/url"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestSocialLoginRejectsUnverifiedIdentity(t *testing.T) {
	svc := NewAuthService(nil, nil, nil)
	for _, token := range []string{"", "forged-provider-token"} {
		resp, err := svc.SocialLogin(context.Background(), domain.SocialLoginReq{Provider: "google", Email: "admin@example.com", ProviderUserID: "victim", Token: token})
		if err == nil || resp != nil {
			t.Fatal("unverified social identity accepted")
		}
	}
}

func TestAutoConfirmationCannotActivatePayment(t *testing.T) {
	svc := NewPaymentService(nil, nil, nil)
	if resp, err := svc.AutoConfirmPayment(context.Background(), uuid.New()); err == nil || resp != nil {
		t.Fatal("payment self-confirmation accepted")
	}
}

type localAudioFixture struct {
	storage.StorageService
	path string
}

func (f localAudioFixture) GetPresignedReadURL(context.Context, string, time.Duration) (string, error) {
	return "", nil
}
func (f localAudioFixture) OpenLocalFile(string) (*os.File, error) { return os.Open(f.path) }

type subscriptionFixture struct {
	repository.PaymentRepository
	active bool
}

func (f subscriptionFixture) GetUserActiveSubscription(context.Context, uuid.UUID) (db.GetUserActiveSubscriptionRow, error) {
	if !f.active {
		return db.GetUserActiveSubscriptionRow{}, errors.New("no active subscription")
	}
	status := "active"
	return db.GetUserActiveSubscriptionRow{Status: &status, ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(time.Hour), Valid: true}}, nil
}

func TestLocalMediaRequiresValidChapterBoundToken(t *testing.T) {
	repo := newMockChapterRepo()
	id := uuid.New()
	repo.chapters[id] = db.Chapter{ID: id}
	repo.audioFiles[id] = []db.ChapterAudioFile{{ChapterID: id, Quality: "128k", AudioUrl: "/api/v1/storage/stories/audio/sample.mp3"}}
	path := filepath.Join(t.TempDir(), "sample.mp3")
	if err := os.WriteFile(path, []byte("audio fixture"), 0600); err != nil {
		t.Fatal(err)
	}
	svc := NewChapterService(repo, nil, auth.NewStreamSigner("secret-for-stream-tests"), localAudioFixture{path: path})
	signed, err := svc.GetSignedStreamURL(context.Background(), nil, id, "128k", nil)
	if err != nil {
		t.Fatal(err)
	}
	parsed, err := url.Parse(signed.StreamURL)
	if err != nil {
		t.Fatal(err)
	}
	token := parsed.Query().Get("token")
	for _, bad := range []string{"", "forged", token + "tampered"} {
		if file, err := svc.GetStreamFile(context.Background(), id, uuid.Nil, "128k", bad); err == nil {
			file.Close()
			t.Fatal("unsigned or tampered stream accepted")
		}
	}
	if _, err := svc.GetStreamFile(context.Background(), uuid.New(), uuid.Nil, "128k", token); err == nil {
		t.Fatal("token accepted for another chapter")
	}
	file, err := svc.GetStreamFile(context.Background(), id, uuid.Nil, "128k", token)
	if err != nil {
		t.Fatal(err)
	}
	file.Close()
}

func TestPremiumContentAndRawAudioAreNotPublic(t *testing.T) {
	repo := newMockChapterRepo()
	id := uuid.New()
	premium, content, contentURL := true, "private chapter", "https://media.example/private.txt"
	repo.chapters[id] = db.Chapter{ID: id, IsPremium: &premium, Content: &content, ContentUrl: &contentURL}
	repo.audioFiles[id] = []db.ChapterAudioFile{{AudioUrl: "https://media.example/private.mp3", Quality: "128k"}}
	for _, active := range []bool{false, true} {
		svc := NewChapterService(repo, subscriptionFixture{active: active}, nil, nil)
		ctx := context.Background()
		if active {
			ctx = auth.SetClaimsToContext(ctx, &auth.AccessTokenClaims{UserID: uuid.New()})
		}
		chapter, err := svc.GetChapterByID(ctx, id)
		if err != nil {
			t.Fatal(err)
		}
		if active && (chapter.Content == nil || *chapter.Content != content) {
			t.Fatal("VIP reader lost access to text")
		}
		if !active && chapter.Content != nil {
			t.Fatal("premium content leaked to guest")
		}
		if chapter.ContentURL != nil || chapter.AudioFiles[0].AudioURL != "" {
			t.Fatal("raw storage URL exposed")
		}
	}
	userID := uuid.New()
	svc := NewChapterService(repo, nil, auth.NewStreamSigner("stream-secret"), nil)
	if _, err := svc.GetSignedStreamURL(context.Background(), &userID, id, "128k", nil); err == nil {
		t.Fatal("premium check failed open without payment repository")
	}
}

func TestOAuthLoginPreservesVerificationAndTwoFactor(t *testing.T) {
	repo := newMockUserRepo()
	jwtSvc := auth.NewJWTService("a-test-secret-with-enough-characters", "tientonaudio", time.Minute, time.Hour)
	svc := NewAuthService(repo, jwtSvc, nil)
	id := uuid.New()
	role := "admin"
	repo.users[id] = db.User{ID: id, Email: "oauth@example.com", Role: &role}
	pending, err := svc.LoginOAuthUser(context.Background(), id)
	if err != nil || !pending.VerificationRequired || pending.Tokens != nil {
		t.Fatalf("unverified login granted a session: %+v %v", pending, err)
	}
	user := repo.users[id]
	user.IsEmailVerified = true
	user.TwoFactorEnabled = true
	repo.users[id] = user
	mfa, err := svc.LoginOAuthUser(context.Background(), id)
	if err != nil || !mfa.MFARequired || mfa.MFAToken == "" || mfa.Tokens != nil {
		t.Fatalf("2FA bypassed: %+v %v", mfa, err)
	}
	user.TwoFactorEnabled = false
	repo.users[id] = user
	logged, err := svc.LoginOAuthUser(context.Background(), id)
	if err != nil || logged.User.Role != "admin" || logged.Tokens == nil {
		t.Fatalf("OAuth login changed role or failed: %+v %v", logged, err)
	}
}

func TestVerificationTokensAreHashedAndSingleUse(t *testing.T) {
	repo := newMockUserRepo()
	emailSvc := newMockEmailService()
	svc := NewAuthService(repo, nil, emailSvc)
	_, err := svc.Register(context.Background(), domain.RegisterReq{Username: "verify_hash", Email: "hash@example.com", Password: "Password123!"})
	if err != nil {
		t.Fatal(err)
	}
	raw := emailSvc.sentVerificationTokens["hash@example.com"]
	if _, exists := repo.emailTokens[raw]; exists {
		t.Fatal("plaintext verification token persisted")
	}
	if _, exists := repo.emailTokens[auth.HashTokenSHA256(raw)]; !exists {
		t.Fatal("hashed verification token missing")
	}
	if svc.VerifyEmail(context.Background(), auth.HashTokenSHA256(raw)) == nil {
		t.Fatal("database hash can be used as a bearer token")
	}
	if err = svc.VerifyEmail(context.Background(), raw); err != nil {
		t.Fatal(err)
	}
	if svc.VerifyEmail(context.Background(), raw) == nil {
		t.Fatal("verification token reused")
	}
}
