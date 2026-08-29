package repository

import (
	"context"

	"github.com/google/uuid"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
)

type PlaylistRepository interface {
	CreatePlaylist(ctx context.Context, arg db.CreatePlaylistParams) (db.Playlist, error)
	GetPlaylistByID(ctx context.Context, id uuid.UUID) (db.Playlist, error)
	ListUserPlaylists(ctx context.Context, userID uuid.NullUUID) ([]db.ListUserPlaylistsRow, error)
	UpdatePlaylist(ctx context.Context, arg db.UpdatePlaylistParams) (db.Playlist, error)
	DeletePlaylist(ctx context.Context, arg db.DeletePlaylistParams) error
	AddPlaylistItem(ctx context.Context, arg db.AddPlaylistItemParams) (db.PlaylistItem, error)
	RemovePlaylistItem(ctx context.Context, arg db.RemovePlaylistItemParams) error
	GetPlaylistItemsWithDetails(ctx context.Context, playlistID uuid.UUID) ([]db.GetPlaylistItemsWithDetailsRow, error)
}

type playlistRepo struct {
	q db.Querier
}

func NewPlaylistRepository(q db.Querier) PlaylistRepository {
	return &playlistRepo{q: q}
}

func (r *playlistRepo) CreatePlaylist(ctx context.Context, arg db.CreatePlaylistParams) (db.Playlist, error) {
	return r.q.CreatePlaylist(ctx, arg)
}

func (r *playlistRepo) GetPlaylistByID(ctx context.Context, id uuid.UUID) (db.Playlist, error) {
	return r.q.GetPlaylistByID(ctx, id)
}

func (r *playlistRepo) ListUserPlaylists(ctx context.Context, userID uuid.NullUUID) ([]db.ListUserPlaylistsRow, error) {
	return r.q.ListUserPlaylists(ctx, userID)
}

func (r *playlistRepo) UpdatePlaylist(ctx context.Context, arg db.UpdatePlaylistParams) (db.Playlist, error) {
	return r.q.UpdatePlaylist(ctx, arg)
}

func (r *playlistRepo) DeletePlaylist(ctx context.Context, arg db.DeletePlaylistParams) error {
	return r.q.DeletePlaylist(ctx, arg)
}

func (r *playlistRepo) AddPlaylistItem(ctx context.Context, arg db.AddPlaylistItemParams) (db.PlaylistItem, error) {
	return r.q.AddPlaylistItem(ctx, arg)
}

func (r *playlistRepo) RemovePlaylistItem(ctx context.Context, arg db.RemovePlaylistItemParams) error {
	return r.q.RemovePlaylistItem(ctx, arg)
}

func (r *playlistRepo) GetPlaylistItemsWithDetails(ctx context.Context, playlistID uuid.UUID) ([]db.GetPlaylistItemsWithDetailsRow, error) {
	return r.q.GetPlaylistItemsWithDetails(ctx, playlistID)
}
