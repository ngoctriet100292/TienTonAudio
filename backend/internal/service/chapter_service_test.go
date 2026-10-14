package service

import (
	"context"
	"github.com/IREAKING/tientonaudio/backend/pkg/storage"
	"testing"
	"time"

	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type mockChapterRepo struct {
	chapters   map[uuid.UUID]db.Chapter
	audioFiles map[uuid.UUID][]db.ChapterAudioFile
}

func newMockChapterRepo() *mockChapterRepo {
	return &mockChapterRepo{
		chapters:   make(map[uuid.UUID]db.Chapter),
		audioFiles: make(map[uuid.UUID][]db.ChapterAudioFile),
	}
}

func (m *mockChapterRepo) ListChaptersByStory(ctx context.Context, storyID uuid.UUID) ([]db.ListChaptersByStoryRow, error) {
	return nil, nil
}

func (m *mockChapterRepo) GetChapterByID(ctx context.Context, id uuid.UUID) (db.GetChapterByIDRow, error) {
	ch, ok := m.chapters[id]
	if !ok {
		return db.GetChapterByIDRow{}, nil
	}
	return db.GetChapterByIDRow{
		ID:              ch.ID,
		StoryID:         ch.StoryID,
		ChapterNumber:   ch.ChapterNumber,
		Title:           ch.Title,
		Content:         ch.Content,
		ContentUrl:      ch.ContentUrl,
		DurationSeconds: ch.DurationSeconds,
		IsPremium:       ch.IsPremium,
	}, nil
}

func (m *mockChapterRepo) GetChapterByNumber(ctx context.Context, arg db.GetChapterByNumberParams) (db.GetChapterByNumberRow, error) {
	return db.GetChapterByNumberRow{}, nil
}

func (m *mockChapterRepo) UpdateChapter(ctx context.Context, arg db.UpdateChapterParams) (db.Chapter, error) {
	return db.Chapter{}, nil
}

func (m *mockChapterRepo) DeleteChapter(ctx context.Context, id uuid.UUID) error {
	delete(m.chapters, id)
	return nil
}

func (m *mockChapterRepo) IncrementChapterListenCount(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (m *mockChapterRepo) CreateChapter(ctx context.Context, arg db.CreateChapterParams) (db.Chapter, error) {
	id := uuid.New()
	ch := db.Chapter{
		ID:              id,
		StoryID:         arg.StoryID,
		ChapterNumber:   arg.ChapterNumber,
		Title:           arg.Title,
		DurationSeconds: arg.DurationSeconds,
		IsPremium:       arg.IsPremium,
		CreatedAt:       pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt:       pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	m.chapters[id] = ch
	return ch, nil
}

func (m *mockChapterRepo) UpsertChapter(ctx context.Context, arg db.UpsertChapterParams) (db.Chapter, error) {
	id := uuid.New()
	ch := db.Chapter{
		ID:              id,
		StoryID:         arg.StoryID,
		ChapterNumber:   arg.ChapterNumber,
		Title:           arg.Title,
		Content:         arg.Content,
		DurationSeconds: arg.DurationSeconds,
		IsPremium:       arg.IsPremium,
		CreatedAt:       pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt:       pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	m.chapters[id] = ch
	return ch, nil
}

func (m *mockChapterRepo) AddChapterAudioFile(ctx context.Context, arg db.AddChapterAudioFileParams) (db.ChapterAudioFile, error) {
	af := db.ChapterAudioFile{
		ID:        uuid.New(),
		ChapterID: arg.ChapterID,
		Quality:   arg.Quality,
		AudioUrl:  arg.AudioUrl,
		IsPrimary: arg.IsPrimary,
	}
	m.audioFiles[arg.ChapterID] = append(m.audioFiles[arg.ChapterID], af)
	return af, nil
}

func (m *mockChapterRepo) GetChapterAudioFiles(ctx context.Context, chapterID uuid.UUID) ([]db.ChapterAudioFile, error) {
	return m.audioFiles[chapterID], nil
}

func TestPlaybackSpeedsValidation(t *testing.T) {
	validSpeeds := []float64{0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0}
	for _, speed := range validSpeeds {
		if !domain.IsValidPlaybackSpeed(speed) {
			t.Errorf("Expected speed %.2f to be valid, got invalid", speed)
		}
	}

	invalidSpeeds := []float64{-1.0, 0.0, 0.3, 1.1, 4.0, 10.0}
	for _, speed := range invalidSpeeds {
		if domain.IsValidPlaybackSpeed(speed) {
			t.Errorf("Expected speed %.2f to be invalid, got valid", speed)
		}
	}
}

func TestGetPlaybackSpeeds(t *testing.T) {
	repo := newMockChapterRepo()
	signer := auth.NewStreamSigner("test-secret-key-at-least-32-chars-long")
	svc := NewChapterService(repo, nil, signer, testAudioStorage{})

	speeds := svc.GetPlaybackSpeeds()
	if len(speeds) == 0 {
		t.Fatal("Expected playback speeds list, got empty")
	}

	found15 := false
	for _, s := range speeds {
		if s.Value == 1.5 {
			found15 = true
			if s.Label != "1.5x" {
				t.Errorf("Expected label 1.5x, got %s", s.Label)
			}
		}
	}
	if !found15 {
		t.Errorf("Expected 1.5x to be in presets")
	}
}

func TestGetSignedStreamURLWithSpeed(t *testing.T) {
	repo := newMockChapterRepo()
	signer := auth.NewStreamSigner("test-secret-key-at-least-32-chars-long")
	svc := NewChapterService(repo, nil, signer, testAudioStorage{})

	ctx := context.Background()
	storyID := uuid.New()
	isPrem := false
	ch, _ := repo.CreateChapter(ctx, db.CreateChapterParams{
		StoryID:         storyID,
		ChapterNumber:   utils.Float64ToNumeric(1.0),
		Title:           "Chương 1",
		DurationSeconds: 1200,
		IsPremium:       &isPrem,
	})

	isPrimary := true
	repo.AddChapterAudioFile(ctx, db.AddChapterAudioFileParams{
		ChapterID: ch.ID,
		Quality:   "128k",
		AudioUrl:  "https://r2.tientonaudio.com/ch1.mp3",
		IsPrimary: &isPrimary,
	})

	speed := 1.75
	resp, err := svc.GetSignedStreamURL(ctx, nil, ch.ID, "128k", &speed)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if resp.PlaybackSpeed != 1.75 {
		t.Errorf("Expected playback speed 1.75, got %.2f", resp.PlaybackSpeed)
	}

	if len(resp.AvailableSpeeds) == 0 {
		t.Errorf("Expected available speeds to be non-empty")
	}
}

type testAudioStorage struct{ storage.StorageService }

func (testAudioStorage) GetPresignedReadURL(ctx context.Context, key string, ttl time.Duration) (string, error) {
	return "https://signed.example/audio", nil
}
