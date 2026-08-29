package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
)

type mockPlaylistRepo struct {
	playlists map[uuid.UUID]db.Playlist
	items     map[uuid.UUID][]db.PlaylistItem
}

func newMockPlaylistRepo() *mockPlaylistRepo {
	return &mockPlaylistRepo{
		playlists: make(map[uuid.UUID]db.Playlist),
		items:     make(map[uuid.UUID][]db.PlaylistItem),
	}
}

func (m *mockPlaylistRepo) CreatePlaylist(ctx context.Context, arg db.CreatePlaylistParams) (db.Playlist, error) {
	id := uuid.New()
	p := db.Playlist{
		ID:        id,
		UserID:    arg.UserID,
		Name:      arg.Name,
		IsPublic:  arg.IsPublic,
		CreatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	m.playlists[id] = p
	return p, nil
}

func (m *mockPlaylistRepo) GetPlaylistByID(ctx context.Context, id uuid.UUID) (db.Playlist, error) {
	p, ok := m.playlists[id]
	if !ok {
		return db.Playlist{}, errors.New("playlist not found")
	}
	return p, nil
}

func (m *mockPlaylistRepo) ListUserPlaylists(ctx context.Context, userID uuid.NullUUID) ([]db.ListUserPlaylistsRow, error) {
	var result []db.ListUserPlaylistsRow
	for _, p := range m.playlists {
		if p.UserID.Valid && userID.Valid && p.UserID.UUID == userID.UUID {
			result = append(result, db.ListUserPlaylistsRow{
				ID:         p.ID,
				UserID:     p.UserID,
				Name:       p.Name,
				IsPublic:   p.IsPublic,
				CreatedAt:  p.CreatedAt,
				UpdatedAt:  p.UpdatedAt,
				TotalItems: int32(len(m.items[p.ID])),
			})
		}
	}
	return result, nil
}

func (m *mockPlaylistRepo) UpdatePlaylist(ctx context.Context, arg db.UpdatePlaylistParams) (db.Playlist, error) {
	p, ok := m.playlists[arg.ID]
	if !ok {
		return db.Playlist{}, errors.New("playlist not found")
	}
	p.Name = arg.Name
	p.IsPublic = arg.IsPublic
	p.UpdatedAt = pgtype.Timestamptz{Time: time.Now(), Valid: true}
	m.playlists[arg.ID] = p
	return p, nil
}

func (m *mockPlaylistRepo) DeletePlaylist(ctx context.Context, arg db.DeletePlaylistParams) error {
	delete(m.playlists, arg.ID)
	delete(m.items, arg.ID)
	return nil
}

func (m *mockPlaylistRepo) AddPlaylistItem(ctx context.Context, arg db.AddPlaylistItemParams) (db.PlaylistItem, error) {
	items := m.items[arg.PlaylistID]
	for _, item := range items {
		if item.ChapterID == arg.ChapterID {
			return item, nil // on conflict do nothing
		}
	}
	newItem := db.PlaylistItem{
		PlaylistID: arg.PlaylistID,
		ChapterID:  arg.ChapterID,
		Position:   int32(len(items) + 1),
		AddedAt:    pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	m.items[arg.PlaylistID] = append(items, newItem)
	return newItem, nil
}

func (m *mockPlaylistRepo) RemovePlaylistItem(ctx context.Context, arg db.RemovePlaylistItemParams) error {
	items := m.items[arg.PlaylistID]
	var updated []db.PlaylistItem
	for _, item := range items {
		if item.ChapterID != arg.ChapterID {
			updated = append(updated, item)
		}
	}
	m.items[arg.PlaylistID] = updated
	return nil
}

func (m *mockPlaylistRepo) GetPlaylistItemsWithDetails(ctx context.Context, playlistID uuid.UUID) ([]db.GetPlaylistItemsWithDetailsRow, error) {
	items := m.items[playlistID]
	var res []db.GetPlaylistItemsWithDetailsRow
	for _, it := range items {
		res = append(res, db.GetPlaylistItemsWithDetailsRow{
			PlaylistID:      it.PlaylistID,
			ChapterID:       it.ChapterID,
			Position:        it.Position,
			AddedAt:         it.AddedAt,
			ChapterTitle:    "Chương 1: Khởi đầu",
			ChapterNumber:   pgtype.Numeric{Valid: true},
			DurationSeconds: 600,
			StoryID:         uuid.New(),
			StoryTitle:      "Truyện Tiên Hiệp",
		})
	}
	return res, nil
}

func TestPlaylistService_CRUDAndItems(t *testing.T) {
	repo := newMockPlaylistRepo()
	svc := NewPlaylistService(repo)
	ctx := context.Background()
	userID := uuid.New()
	otherUserID := uuid.New()

	// 1. Tạo playlist riêng tư
	created, err := svc.CreatePlaylist(ctx, userID, domain.CreatePlaylistReq{
		Name:     "Nhạc Tu Tiên Thư Giãn",
		IsPublic: false,
	})
	if err != nil {
		t.Fatalf("failed to create playlist: %v", err)
	}
	if created.Name != "Nhạc Tu Tiên Thư Giãn" {
		t.Errorf("expected name 'Nhạc Tu Tiên Thư Giãn', got %s", created.Name)
	}

	// 2. Lấy danh sách playlist của user
	list, err := svc.GetUserPlaylists(ctx, userID)
	if err != nil {
		t.Fatalf("failed to get user playlists: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 playlist, got %d", len(list))
	}

	// 3. User khác truy cập playlist private -> phải bị từ chối
	_, err = svc.GetPlaylistDetail(ctx, created.ID, &otherUserID)
	if err == nil {
		t.Fatal("expected error when unauthorized user accesses private playlist")
	}

	// 4. Chủ sở hữu truy cập -> thành công
	detail, err := svc.GetPlaylistDetail(ctx, created.ID, &userID)
	if err != nil {
		t.Fatalf("owner failed to get playlist detail: %v", err)
	}
	if len(detail.Items) != 0 {
		t.Errorf("expected 0 items initially, got %d", len(detail.Items))
	}

	// 5. Thêm tập truyện vào playlist
	chapter1 := uuid.New()
	chapter2 := uuid.New()
	err = svc.AddPlaylistItem(ctx, created.ID, userID, chapter1)
	if err != nil {
		t.Fatalf("failed to add item: %v", err)
	}
	err = svc.AddPlaylistItem(ctx, created.ID, userID, chapter2)
	if err != nil {
		t.Fatalf("failed to add item 2: %v", err)
	}

	// Kiểm tra lại chi tiết sau khi thêm
	detailAfter, err := svc.GetPlaylistDetail(ctx, created.ID, &userID)
	if err != nil {
		t.Fatalf("failed to get detail after adding items: %v", err)
	}
	if len(detailAfter.Items) != 2 {
		t.Fatalf("expected 2 items in playlist, got %d", len(detailAfter.Items))
	}

	// 6. Xóa 1 tập khỏi playlist
	err = svc.RemovePlaylistItem(ctx, created.ID, userID, chapter1)
	if err != nil {
		t.Fatalf("failed to remove item: %v", err)
	}
	detailAfterRemove, _ := svc.GetPlaylistDetail(ctx, created.ID, &userID)
	if len(detailAfterRemove.Items) != 1 {
		t.Fatalf("expected 1 item in playlist after removal, got %d", len(detailAfterRemove.Items))
	}

	// 7. Cập nhật playlist thành công khai (public)
	newName := "Nhạc Tu Tiên Chọn Lọc"
	isPub := true
	updated, err := svc.UpdatePlaylist(ctx, created.ID, userID, domain.UpdatePlaylistReq{
		Name:     &newName,
		IsPublic: &isPub,
	})
	if err != nil {
		t.Fatalf("failed to update playlist: %v", err)
	}
	if !updated.IsPublic || updated.Name != newName {
		t.Fatalf("update playlist fields did not match: %+v", updated)
	}

	// Giờ user khác có thể truy cập vì đã public
	_, err = svc.GetPlaylistDetail(ctx, created.ID, &otherUserID)
	if err != nil {
		t.Fatalf("other user should be able to view public playlist: %v", err)
	}

	// 8. Xóa playlist
	err = svc.DeletePlaylist(ctx, created.ID, userID)
	if err != nil {
		t.Fatalf("failed to delete playlist: %v", err)
	}

	// Không còn tìm thấy
	_, err = svc.GetPlaylistDetail(ctx, created.ID, &userID)
	if err == nil {
		t.Fatal("expected error after playlist deletion")
	}
}
