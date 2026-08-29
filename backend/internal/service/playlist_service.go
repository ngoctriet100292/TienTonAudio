package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type PlaylistService interface {
	CreatePlaylist(ctx context.Context, userID uuid.UUID, req domain.CreatePlaylistReq) (*domain.PlaylistResp, error)
	GetUserPlaylists(ctx context.Context, userID uuid.UUID) ([]domain.PlaylistResp, error)
	GetPlaylistDetail(ctx context.Context, playlistID uuid.UUID, currentUserID *uuid.UUID) (*domain.PlaylistDetailResp, error)
	UpdatePlaylist(ctx context.Context, playlistID uuid.UUID, userID uuid.UUID, req domain.UpdatePlaylistReq) (*domain.PlaylistResp, error)
	DeletePlaylist(ctx context.Context, playlistID uuid.UUID, userID uuid.UUID) error
	AddPlaylistItem(ctx context.Context, playlistID uuid.UUID, userID uuid.UUID, chapterID uuid.UUID) error
	RemovePlaylistItem(ctx context.Context, playlistID uuid.UUID, userID uuid.UUID, chapterID uuid.UUID) error
}

type playlistService struct {
	repo repository.PlaylistRepository
}

func NewPlaylistService(repo repository.PlaylistRepository) PlaylistService {
	return &playlistService{repo: repo}
}

func (s *playlistService) CreatePlaylist(ctx context.Context, userID uuid.UUID, req domain.CreatePlaylistReq) (*domain.PlaylistResp, error) {
	if req.Name == "" {
		return nil, errors.New("playlist name is required")
	}

	p, err := s.repo.CreatePlaylist(ctx, db.CreatePlaylistParams{
		UserID:   uuid.NullUUID{UUID: userID, Valid: true},
		Name:     req.Name,
		IsPublic: &req.IsPublic,
	})
	if err != nil {
		return nil, fmt.Errorf("create playlist error: %w", err)
	}

	var uID *uuid.UUID
	if p.UserID.Valid {
		uID = &p.UserID.UUID
	}

	isPub := false
	if p.IsPublic != nil {
		isPub = *p.IsPublic
	}

	return &domain.PlaylistResp{
		ID:         p.ID,
		UserID:     uID,
		Name:       p.Name,
		IsPublic:   isPub,
		TotalItems: 0,
		CreatedAt:  p.CreatedAt.Time,
		UpdatedAt:  p.UpdatedAt.Time,
	}, nil
}

func (s *playlistService) GetUserPlaylists(ctx context.Context, userID uuid.UUID) ([]domain.PlaylistResp, error) {
	rows, err := s.repo.ListUserPlaylists(ctx, uuid.NullUUID{UUID: userID, Valid: true})
	if err != nil {
		return nil, fmt.Errorf("list playlists error: %w", err)
	}

	result := make([]domain.PlaylistResp, len(rows))
	for i, r := range rows {
		var uID *uuid.UUID
		if r.UserID.Valid {
			uID = &r.UserID.UUID
		}
		isPub := false
		if r.IsPublic != nil {
			isPub = *r.IsPublic
		}

		result[i] = domain.PlaylistResp{
			ID:         r.ID,
			UserID:     uID,
			Name:       r.Name,
			IsPublic:   isPub,
			TotalItems: r.TotalItems,
			CreatedAt:  r.CreatedAt.Time,
			UpdatedAt:  r.UpdatedAt.Time,
		}
	}

	return result, nil
}

func (s *playlistService) GetPlaylistDetail(ctx context.Context, playlistID uuid.UUID, currentUserID *uuid.UUID) (*domain.PlaylistDetailResp, error) {
	p, err := s.repo.GetPlaylistByID(ctx, playlistID)
	if err != nil {
		return nil, errors.New("playlist not found")
	}

	isPub := false
	if p.IsPublic != nil {
		isPub = *p.IsPublic
	}

	// Kiểm tra quyền truy cập: nếu là private thì chỉ chủ sở hữu mới xem được
	if !isPub {
		if currentUserID == nil || !p.UserID.Valid || p.UserID.UUID != *currentUserID {
			return nil, errors.New("this playlist is private")
		}
	}

	items, err := s.repo.GetPlaylistItemsWithDetails(ctx, playlistID)
	if err != nil {
		return nil, fmt.Errorf("get playlist items error: %w", err)
	}

	itemResps := make([]domain.PlaylistItemDetailResp, len(items))
	for i, it := range items {
		itemResps[i] = domain.PlaylistItemDetailResp{
			PlaylistID:      it.PlaylistID,
			ChapterID:       it.ChapterID,
			Position:        it.Position,
			AddedAt:         it.AddedAt.Time,
			ChapterTitle:    it.ChapterTitle,
			ChapterNumber:   utils.NumericToFloat64(it.ChapterNumber),
			DurationSeconds: it.DurationSeconds,
			ListenCount:     it.ListenCount,
			IsPremium:       it.IsPremium,
			StoryID:         it.StoryID,
			StoryTitle:      it.StoryTitle,
			CoverImageURL:   it.CoverImageUrl,
		}
	}

	var uID *uuid.UUID
	if p.UserID.Valid {
		uID = &p.UserID.UUID
	}

	return &domain.PlaylistDetailResp{
		Playlist: domain.PlaylistResp{
			ID:         p.ID,
			UserID:     uID,
			Name:       p.Name,
			IsPublic:   isPub,
			TotalItems: int32(len(items)),
			CreatedAt:  p.CreatedAt.Time,
			UpdatedAt:  p.UpdatedAt.Time,
		},
		Items: itemResps,
	}, nil
}

func (s *playlistService) UpdatePlaylist(ctx context.Context, playlistID uuid.UUID, userID uuid.UUID, req domain.UpdatePlaylistReq) (*domain.PlaylistResp, error) {
	p, err := s.repo.GetPlaylistByID(ctx, playlistID)
	if err != nil {
		return nil, errors.New("playlist not found")
	}

	if !p.UserID.Valid || p.UserID.UUID != userID {
		return nil, errors.New("you do not have permission to update this playlist")
	}

	name := p.Name
	if req.Name != nil && *req.Name != "" {
		name = *req.Name
	}

	isPub := p.IsPublic
	if req.IsPublic != nil {
		isPub = req.IsPublic
	}

	updated, err := s.repo.UpdatePlaylist(ctx, db.UpdatePlaylistParams{
		ID:       playlistID,
		Name:     name,
		IsPublic: isPub,
		UserID:   uuid.NullUUID{UUID: userID, Valid: true},
	})
	if err != nil {
		return nil, fmt.Errorf("update playlist error: %w", err)
	}

	pubVal := false
	if updated.IsPublic != nil {
		pubVal = *updated.IsPublic
	}

	var uID *uuid.UUID
	if updated.UserID.Valid {
		uID = &updated.UserID.UUID
	}

	return &domain.PlaylistResp{
		ID:        updated.ID,
		UserID:    uID,
		Name:      updated.Name,
		IsPublic:  pubVal,
		CreatedAt: updated.CreatedAt.Time,
		UpdatedAt: updated.UpdatedAt.Time,
	}, nil
}

func (s *playlistService) DeletePlaylist(ctx context.Context, playlistID uuid.UUID, userID uuid.UUID) error {
	p, err := s.repo.GetPlaylistByID(ctx, playlistID)
	if err != nil {
		return errors.New("playlist not found")
	}

	if !p.UserID.Valid || p.UserID.UUID != userID {
		return errors.New("you do not have permission to delete this playlist")
	}

	return s.repo.DeletePlaylist(ctx, db.DeletePlaylistParams{
		ID:     playlistID,
		UserID: uuid.NullUUID{UUID: userID, Valid: true},
	})
}

func (s *playlistService) AddPlaylistItem(ctx context.Context, playlistID uuid.UUID, userID uuid.UUID, chapterID uuid.UUID) error {
	p, err := s.repo.GetPlaylistByID(ctx, playlistID)
	if err != nil {
		return errors.New("playlist not found")
	}

	if !p.UserID.Valid || p.UserID.UUID != userID {
		return errors.New("you do not have permission to modify this playlist")
	}

	_, err = s.repo.AddPlaylistItem(ctx, db.AddPlaylistItemParams{
		PlaylistID: playlistID,
		ChapterID:  chapterID,
	})
	if err != nil {
		return fmt.Errorf("add chapter to playlist error: %w", err)
	}

	return nil
}

func (s *playlistService) RemovePlaylistItem(ctx context.Context, playlistID uuid.UUID, userID uuid.UUID, chapterID uuid.UUID) error {
	p, err := s.repo.GetPlaylistByID(ctx, playlistID)
	if err != nil {
		return errors.New("playlist not found")
	}

	if !p.UserID.Valid || p.UserID.UUID != userID {
		return errors.New("you do not have permission to modify this playlist")
	}

	return s.repo.RemovePlaylistItem(ctx, db.RemovePlaylistItemParams{
		PlaylistID: playlistID,
		ChapterID:  chapterID,
	})
}
