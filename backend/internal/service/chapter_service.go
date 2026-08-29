package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type ChapterService interface {
	ListChaptersByStory(ctx context.Context, storyID uuid.UUID) ([]domain.ChapterResp, error)
	GetChapterByID(ctx context.Context, id uuid.UUID) (*domain.ChapterResp, error)
	CreateChapter(ctx context.Context, req domain.CreateChapterReq) (*domain.ChapterResp, error)
	AddChapterAudioFile(ctx context.Context, chapterID uuid.UUID, quality string, audioURL string, fileSize *int64, isPrimary bool) (*domain.ChapterAudioFileResp, error)
	GetSignedStreamURL(ctx context.Context, userID *uuid.UUID, chapterID uuid.UUID, quality string, speed *float64) (*domain.StreamURLResp, error)
	GetPlaybackSpeeds() []domain.PlaybackSpeedInfo
}

type chapterService struct {
	repo        repository.ChapterRepository
	paymentRepo repository.PaymentRepository
	signer      *auth.StreamSigner
}

func NewChapterService(repo repository.ChapterRepository, paymentRepo repository.PaymentRepository, signer *auth.StreamSigner) ChapterService {
	return &chapterService{
		repo:        repo,
		paymentRepo: paymentRepo,
		signer:      signer,
	}
}

func (s *chapterService) ListChaptersByStory(ctx context.Context, storyID uuid.UUID) ([]domain.ChapterResp, error) {
	rows, err := s.repo.ListChaptersByStory(ctx, storyID)
	if err != nil {
		return nil, fmt.Errorf("list chapters error: %w", err)
	}

	result := make([]domain.ChapterResp, len(rows))
	for i, r := range rows {
		result[i] = domain.ChapterResp{
			ID:              r.ID,
			StoryID:         r.StoryID,
			NarratorID:      r.NarratorID,
			NarratorName:    r.NarratorName,
			ChapterNumber:   utils.NumericToFloat64(r.ChapterNumber),
			Title:           r.Title,
			Content:         r.Content,
			IsPremium:       r.IsPremium,
			DurationSeconds: r.DurationSeconds,
			WaveformData:    r.WaveformData,
			ListenCount:     r.ListenCount,
			CreatedAt:       r.CreatedAt.Time,
			UpdatedAt:       r.UpdatedAt.Time,
		}
	}
	return result, nil
}

func (s *chapterService) GetChapterByID(ctx context.Context, id uuid.UUID) (*domain.ChapterResp, error) {
	row, err := s.repo.GetChapterByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("chapter not found: %w", err)
	}

	_ = s.repo.IncrementChapterListenCount(ctx, id)

	audioFiles, _ := s.repo.GetChapterAudioFiles(ctx, id)
	var audioResps []domain.ChapterAudioFileResp
	for _, af := range audioFiles {
		audioResps = append(audioResps, domain.ChapterAudioFileResp{
			ID:            af.ID,
			ChapterID:     af.ChapterID,
			Quality:       af.Quality,
			AudioURL:      af.AudioUrl,
			FileSizeBytes: af.FileSizeBytes,
			IsPrimary:     af.IsPrimary,
		})
	}

	return &domain.ChapterResp{
		ID:              row.ID,
		StoryID:         row.StoryID,
		NarratorID:      row.NarratorID,
		NarratorName:    row.NarratorName,
		ChapterNumber:   utils.NumericToFloat64(row.ChapterNumber),
		Title:           row.Title,
		Content:         row.Content,
		IsPremium:       row.IsPremium,
		DurationSeconds: row.DurationSeconds,
		WaveformData:    row.WaveformData,
		ListenCount:     row.ListenCount,
		CreatedAt:       row.CreatedAt.Time,
		UpdatedAt:       row.UpdatedAt.Time,
		AudioFiles:      audioResps,
	}, nil
}

func (s *chapterService) CreateChapter(ctx context.Context, req domain.CreateChapterReq) (*domain.ChapterResp, error) {
	chapterNum := utils.Float64ToNumeric(req.ChapterNumber)

	dur := int32(0)
	if req.DurationSeconds != nil {
		dur = *req.DurationSeconds
	}

	row, err := s.repo.CreateChapter(ctx, db.CreateChapterParams{
		StoryID:         req.StoryID,
		NarratorID:      req.NarratorID,
		ChapterNumber:   chapterNum,
		Title:           req.Title,
		Content:         req.Content,
		IsPremium:       req.IsPremium,
		DurationSeconds: dur,
		WaveformData:    req.WaveformData,
	})
	if err != nil {
		return nil, fmt.Errorf("create chapter error: %w", err)
	}

	return &domain.ChapterResp{
		ID:              row.ID,
		StoryID:         row.StoryID,
		NarratorID:      row.NarratorID,
		ChapterNumber:   utils.NumericToFloat64(row.ChapterNumber),
		Title:           row.Title,
		Content:         row.Content,
		IsPremium:       row.IsPremium,
		DurationSeconds: row.DurationSeconds,
		WaveformData:    row.WaveformData,
		ListenCount:     row.ListenCount,
		CreatedAt:       row.CreatedAt.Time,
		UpdatedAt:       row.UpdatedAt.Time,
	}, nil
}

func (s *chapterService) AddChapterAudioFile(ctx context.Context, chapterID uuid.UUID, quality string, audioURL string, fileSize *int64, isPrimary bool) (*domain.ChapterAudioFileResp, error) {
	primary := isPrimary
	af, err := s.repo.AddChapterAudioFile(ctx, db.AddChapterAudioFileParams{
		ChapterID:     chapterID,
		Quality:       quality,
		AudioUrl:      audioURL,
		FileSizeBytes: fileSize,
		IsPrimary:     &primary,
	})
	if err != nil {
		return nil, fmt.Errorf("add audio file error: %w", err)
	}

	return &domain.ChapterAudioFileResp{
		ID:            af.ID,
		ChapterID:     af.ChapterID,
		Quality:       af.Quality,
		AudioURL:      af.AudioUrl,
		FileSizeBytes: af.FileSizeBytes,
		IsPrimary:     af.IsPrimary,
	}, nil
}

func (s *chapterService) GetPlaybackSpeeds() []domain.PlaybackSpeedInfo {
	return domain.PlaybackSpeedPresets
}

func (s *chapterService) GetSignedStreamURL(ctx context.Context, userID *uuid.UUID, chapterID uuid.UUID, quality string, speed *float64) (*domain.StreamURLResp, error) {
	chapter, err := s.repo.GetChapterByID(ctx, chapterID)
	if err != nil {
		return nil, errors.New("chapter not found")
	}

	// Kiểm tra nếu chương yêu cầu VIP
	if chapter.IsPremium != nil && *chapter.IsPremium {
		if userID == nil {
			return nil, errors.New("chương này yêu cầu gói VIP, vui lòng đăng nhập để nghe")
		}
		if s.paymentRepo != nil {
			sub, err := s.paymentRepo.GetUserActiveSubscription(ctx, *userID)
			if err != nil || sub.Status == nil || *sub.Status != "active" {
				return nil, errors.New("chương này yêu cầu gói VIP, vui lòng nâng cấp tài khoản")
			}
		}
	}

	audioFiles, err := s.repo.GetChapterAudioFiles(ctx, chapterID)
	if err != nil || len(audioFiles) == 0 {
		return nil, errors.New("no audio file available for this chapter")
	}

	var targetFile *db.ChapterAudioFile
	if quality != "" {
		for i := range audioFiles {
			if audioFiles[i].Quality == quality {
				targetFile = &audioFiles[i]
				break
			}
		}
	}

	// Nếu không tìm thấy quality yêu cầu, fallback sang primary hoặc file đầu tiên
	if targetFile == nil {
		for i := range audioFiles {
			if audioFiles[i].IsPrimary != nil && *audioFiles[i].IsPrimary {
				targetFile = &audioFiles[i]
				break
			}
		}
		if targetFile == nil {
			targetFile = &audioFiles[0]
		}
	}

	uID := uuid.Nil
	if userID != nil {
		uID = *userID
	}

	token := "default-token"
	expiresAt := time.Now().Add(2 * time.Hour)
	if s.signer != nil {
		token, expiresAt = s.signer.GenerateSignedStreamToken(chapterID, uID, targetFile.Quality, 2*time.Hour)
	}

	signedURL := auth.BuildSignedAudioURL(targetFile.AudioUrl, token, expiresAt)

	playbackSpeed := 1.0
	if speed != nil && domain.IsValidPlaybackSpeed(*speed) {
		playbackSpeed = *speed
	}

	return &domain.StreamURLResp{
		ChapterID:       chapterID,
		Quality:         targetFile.Quality,
		StreamURL:       signedURL,
		ExpiresAt:       expiresAt,
		PlaybackSpeed:   playbackSpeed,
		AvailableSpeeds: domain.PlaybackSpeedPresets,
	}, nil
}