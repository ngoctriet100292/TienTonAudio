package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"

	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/IREAKING/tientonaudio/backend/pkg/storage"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
	"github.com/google/uuid"
)

var ErrPremiumRequired = errors.New("chương này yêu cầu gói VIP")

type ChapterService interface {
	GetStreamFile(ctx context.Context, chapterID, userID uuid.UUID, quality, token string) (*os.File, error)
	ListChaptersByStory(ctx context.Context, storyID uuid.UUID) ([]domain.ChapterResp, error)
	GetChapterByID(ctx context.Context, id uuid.UUID) (*domain.ChapterResp, error)
	CreateChapter(ctx context.Context, req domain.CreateChapterReq) (*domain.ChapterResp, error)
	BulkCreateChapters(ctx context.Context, req domain.BulkCreateChaptersReq) (*domain.BulkCreateChaptersResp, error)
	AddChapterAudioFile(ctx context.Context, chapterID uuid.UUID, quality string, audioURL string, fileSize *int64, isPrimary bool) (*domain.ChapterAudioFileResp, error)
	GetSignedStreamURL(ctx context.Context, userID *uuid.UUID, chapterID uuid.UUID, quality string, speed *float64) (*domain.StreamURLResp, error)
	GetPlaybackSpeeds() []domain.PlaybackSpeedInfo
}

type chapterService struct {
	repo        repository.ChapterRepository
	paymentRepo repository.PaymentRepository
	signer      *auth.StreamSigner
	storage     storage.StorageService
}

func NewChapterService(repo repository.ChapterRepository, paymentRepo repository.PaymentRepository, signer *auth.StreamSigner, storage storage.StorageService) ChapterService {
	return &chapterService{
		repo:        repo,
		paymentRepo: paymentRepo,
		signer:      signer,
		storage:     storage,
	}
}

func (s *chapterService) ListChaptersByStory(ctx context.Context, storyID uuid.UUID) ([]domain.ChapterResp, error) {
	rows, err := s.repo.ListChaptersByStory(ctx, storyID)
	if err != nil {
		return nil, fmt.Errorf("list chapters error: %w", err)
	}

	result := make([]domain.ChapterResp, len(rows))
	for i, r := range rows {
		var timelineMarkers []domain.TimelineMarker
		if len(r.TimelineMarkers) > 0 {
			_ = json.Unmarshal(r.TimelineMarkers, &timelineMarkers)
		}

		result[i] = domain.ChapterResp{
			ID:            r.ID,
			StoryID:       r.StoryID,
			NarratorID:    r.NarratorID,
			NarratorName:  r.NarratorName,
			ChapterNumber: utils.NumericToFloat64(r.ChapterNumber),
			Title:         r.Title,

			IsPremium:       r.IsPremium,
			DurationSeconds: r.DurationSeconds,
			WaveformData:    r.WaveformData,
			TimelineMarkers: timelineMarkers,
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

	var userID *uuid.UUID
	if claims, ok := auth.GetClaimsFromContext(ctx); ok {
		userID = &claims.UserID
	}
	canRead := s.authorizePremium(ctx, row.IsPremium, userID) == nil

	_ = s.repo.IncrementChapterListenCount(ctx, id)

	audioFiles, _ := s.repo.GetChapterAudioFiles(ctx, id)
	var audioResps []domain.ChapterAudioFileResp
	for _, af := range audioFiles {
		audioResps = append(audioResps, domain.ChapterAudioFileResp{
			ID:        af.ID,
			ChapterID: af.ChapterID,
			Quality:   af.Quality,

			FileSizeBytes: af.FileSizeBytes,
			IsPrimary:     af.IsPrimary,
		})
	}

	var content *string
	if canRead {
		content = row.Content
	}
	// Nếu trong DB content rỗng nhưng có content_url trên R2 Storage, tự động fetch text trả về cho client
	if canRead && (content == nil || *content == "") && row.ContentUrl != nil && *row.ContentUrl != "" && s.storage != nil {
		storageText, err := s.storage.GetFileContent(ctx, *row.ContentUrl)
		if err == nil && storageText != "" {
			content = &storageText
		}
	}

	var timelineMarkers []domain.TimelineMarker
	if len(row.TimelineMarkers) > 0 {
		_ = json.Unmarshal(row.TimelineMarkers, &timelineMarkers)
	}

	return &domain.ChapterResp{
		ID:            row.ID,
		StoryID:       row.StoryID,
		NarratorID:    row.NarratorID,
		NarratorName:  row.NarratorName,
		ChapterNumber: utils.NumericToFloat64(row.ChapterNumber),
		Title:         row.Title,
		Content:       content,

		IsPremium:       row.IsPremium,
		DurationSeconds: row.DurationSeconds,
		WaveformData:    row.WaveformData,
		TimelineMarkers: timelineMarkers,
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

	var contentURL *string = req.ContentURL
	var dbContent *string = req.Content

	// Đổi sang lưu text trong Cloudflare R2 Storage thay vì lưu vào DB
	if req.Content != nil && *req.Content != "" && s.storage != nil {
		key := fmt.Sprintf("stories/%s/chapters/%.1f.txt", req.StoryID.String(), req.ChapterNumber)
		uploadedURL, err := s.storage.UploadText(ctx, key, *req.Content)
		if err == nil && uploadedURL != "" {
			contentURL = &uploadedURL
			// DB giải phóng: không lưu text vào Postgres
			dbContent = nil
		}
	}

	var timelineData json.RawMessage
	if len(req.TimelineMarkers) > 0 {
		timelineData, _ = json.Marshal(req.TimelineMarkers)
	}

	publicationStatus := "draft"
	if claims, ok := auth.GetClaimsFromContext(ctx); ok && claims.Role == "admin" {
		publicationStatus = "published"
	}
	row, err := s.repo.CreateChapter(ctx, db.CreateChapterParams{
		PublicationStatus: publicationStatus,
		StoryID:           req.StoryID,
		NarratorID:        req.NarratorID,
		ChapterNumber:     chapterNum,
		Title:             req.Title,
		Content:           dbContent,
		ContentUrl:        contentURL,
		IsPremium:         req.IsPremium,
		DurationSeconds:   dur,
		WaveformData:      req.WaveformData,
		TimelineMarkers:   timelineData,
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
		Content:         req.Content,
		ContentURL:      row.ContentUrl,
		IsPremium:       row.IsPremium,
		DurationSeconds: row.DurationSeconds,
		WaveformData:    row.WaveformData,
		TimelineMarkers: req.TimelineMarkers,
		ListenCount:     row.ListenCount,
		CreatedAt:       row.CreatedAt.Time,
		UpdatedAt:       row.UpdatedAt.Time,
	}, nil
}

func (s *chapterService) BulkCreateChapters(ctx context.Context, req domain.BulkCreateChaptersReq) (*domain.BulkCreateChaptersResp, error) {
	if len(req.Chapters) == 0 {
		return nil, errors.New("no chapters provided")
	}

	successCount := 0
	failedCount := 0

	for _, c := range req.Chapters {
		chapterNum := utils.Float64ToNumeric(c.ChapterNumber)
		dur := int32(0)
		if c.DurationSeconds != nil {
			dur = *c.DurationSeconds
		}

		storyID := req.StoryID
		if c.StoryID != uuid.Nil {
			storyID = c.StoryID
		}

		var contentURL *string = c.ContentURL
		var dbContent *string = c.Content

		// Lưu text lên R2 Storage
		if c.Content != nil && *c.Content != "" && s.storage != nil {
			key := fmt.Sprintf("stories/%s/chapters/%.1f.txt", storyID.String(), c.ChapterNumber)
			uploadedURL, err := s.storage.UploadText(ctx, key, *c.Content)
			if err == nil && uploadedURL != "" {
				contentURL = &uploadedURL
				dbContent = nil
			}
		}

		var timelineData json.RawMessage
		if len(c.TimelineMarkers) > 0 {
			timelineData, _ = json.Marshal(c.TimelineMarkers)
		}

		_, err := s.repo.UpsertChapter(ctx, db.UpsertChapterParams{
			PublicationStatus: "published",
			StoryID:           storyID,
			NarratorID:        c.NarratorID,
			ChapterNumber:     chapterNum,
			Title:             c.Title,
			Content:           dbContent,
			ContentUrl:        contentURL,
			IsPremium:         c.IsPremium,
			DurationSeconds:   dur,
			WaveformData:      c.WaveformData,
			TimelineMarkers:   timelineData,
		})
		if err != nil {
			failedCount++
		} else {
			successCount++
		}
	}

	return &domain.BulkCreateChaptersResp{
		TotalProcessed: len(req.Chapters),
		SuccessCount:   successCount,
		FailedCount:    failedCount,
	}, nil
}

func (s *chapterService) AddChapterAudioFile(ctx context.Context, chapterID uuid.UUID, quality string, audioURL string, fileSize *int64, isPrimary bool) (*domain.ChapterAudioFileResp, error) {
	cleanQuality := strings.ToLower(strings.TrimSpace(quality))
	if strings.Contains(cleanQuality, "320") {
		cleanQuality = "320k"
	} else if strings.Contains(cleanQuality, "64") {
		cleanQuality = "64k"
	} else if strings.Contains(cleanQuality, "hls") || strings.Contains(cleanQuality, "m3u8") {
		cleanQuality = "hls"
	} else {
		cleanQuality = "128k"
	}

	row, err := s.repo.AddChapterAudioFile(ctx, db.AddChapterAudioFileParams{
		ChapterID:     chapterID,
		Quality:       cleanQuality,
		AudioUrl:      audioURL,
		FileSizeBytes: fileSize,
		IsPrimary:     &isPrimary,
	})
	if err != nil {
		return nil, fmt.Errorf("add audio file error: %w", err)
	}

	return &domain.ChapterAudioFileResp{
		ID:            row.ID,
		ChapterID:     row.ChapterID,
		Quality:       row.Quality,
		AudioURL:      row.AudioUrl,
		FileSizeBytes: row.FileSizeBytes,
		IsPrimary:     row.IsPrimary,
	}, nil
}

func (s *chapterService) GetSignedStreamURL(ctx context.Context, userID *uuid.UUID, chapterID uuid.UUID, quality string, speed *float64) (*domain.StreamURLResp, error) {
	chapter, err := s.repo.GetChapterByID(ctx, chapterID)
	if err != nil {
		return nil, errors.New("chapter not found")
	}

	if err := s.authorizePremium(ctx, chapter.IsPremium, userID); err != nil {
		return nil, err
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

	if s.storage == nil || s.signer == nil {
		return nil, errors.New("secure audio storage is unavailable")
	}
	token, expiresAt := s.signer.GenerateSignedStreamToken(chapterID, uID, targetFile.Quality, 2*time.Hour)
	signedURL, err := s.storage.GetPresignedReadURL(ctx, targetFile.AudioUrl, 2*time.Hour)
	if err != nil {
		return nil, err
	}
	if signedURL == "" {
		params := url.Values{"token": {token}, "user_id": {uID.String()}, "quality": {targetFile.Quality}}
		signedURL = fmt.Sprintf("/api/v1/chapters/%s/media?%s", chapterID, params.Encode())
	}

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

func (s *chapterService) GetPlaybackSpeeds() []domain.PlaybackSpeedInfo {
	return domain.PlaybackSpeedPresets
}
func (s *chapterService) authorizePremium(ctx context.Context, premium *bool, userID *uuid.UUID) error {
	if premium == nil || !*premium {
		return nil
	}
	if userID == nil || s.paymentRepo == nil {
		return ErrPremiumRequired
	}
	sub, err := s.paymentRepo.GetUserActiveSubscription(ctx, *userID)
	if err != nil || sub.Status == nil || *sub.Status != "active" {
		return ErrPremiumRequired
	}
	return nil
}

func (s *chapterService) GetStreamFile(ctx context.Context, chapterID, userID uuid.UUID, quality, token string) (*os.File, error) {
	if s.signer == nil || s.storage == nil {
		return nil, errors.New("secure audio storage is unavailable")
	}
	if err := s.signer.ValidateSignedStreamToken(token, chapterID, userID, quality); err != nil {
		return nil, err
	}
	chapter, err := s.repo.GetChapterByID(ctx, chapterID)
	if err != nil {
		return nil, err
	}
	if err := s.authorizePremium(ctx, chapter.IsPremium, &userID); err != nil {
		return nil, err
	}
	files, err := s.repo.GetChapterAudioFiles(ctx, chapterID)
	if err != nil {
		return nil, err
	}
	for _, file := range files {
		if file.Quality == quality {
			return s.storage.OpenLocalFile(file.AudioUrl)
		}
	}
	return nil, errors.New("audio file not found")
}
