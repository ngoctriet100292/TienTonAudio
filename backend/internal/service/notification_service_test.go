package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type mockNotificationRepo struct {
	notifications map[uuid.UUID]db.Notification
}

func newMockNotificationRepo() *mockNotificationRepo {
	return &mockNotificationRepo{
		notifications: make(map[uuid.UUID]db.Notification),
	}
}

func (m *mockNotificationRepo) CreateNotification(ctx context.Context, arg db.CreateNotificationParams) (db.Notification, error) {
	id := uuid.New()
	isRead := false
	n := db.Notification{
		ID:            id,
		UserID:        arg.UserID,
		Title:         arg.Title,
		Message:       arg.Message,
		Type:          arg.Type,
		ReferenceID:   arg.ReferenceID,
		ReferenceType: arg.ReferenceType,
		IsRead:        &isRead,
		CreatedAt:     pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	m.notifications[id] = n
	return n, nil
}

func (m *mockNotificationRepo) GetUserNotifications(ctx context.Context, arg db.GetUserNotificationsParams) ([]db.Notification, error) {
	var res []db.Notification
	for _, n := range m.notifications {
		if n.UserID == arg.UserID {
			res = append(res, n)
		}
	}
	return res, nil
}

func (m *mockNotificationRepo) GetUnreadNotificationCount(ctx context.Context, userID uuid.UUID) (int32, error) {
	cnt := int32(0)
	for _, n := range m.notifications {
		if n.UserID == userID && (n.IsRead == nil || !*n.IsRead) {
			cnt++
		}
	}
	return cnt, nil
}

func (m *mockNotificationRepo) MarkNotificationAsRead(ctx context.Context, arg db.MarkNotificationAsReadParams) error {
	n, ok := m.notifications[arg.ID]
	if !ok {
		return errors.New("notification not found")
	}
	t := true
	n.IsRead = &t
	m.notifications[arg.ID] = n
	return nil
}

func (m *mockNotificationRepo) MarkAllNotificationsAsRead(ctx context.Context, userID uuid.UUID) error {
	t := true
	for id, n := range m.notifications {
		if n.UserID == userID {
			n.IsRead = &t
			m.notifications[id] = n
		}
	}
	return nil
}

func TestNotificationService_Flow(t *testing.T) {
	repo := newMockNotificationRepo()
	svc := NewNotificationService(repo)
	ctx := context.Background()

	userID := uuid.New()

	// 1. Tạo 2 thông báo
	refType := "chapter"
	refID := uuid.New()
	_, err := svc.CreateNotification(ctx, userID, "Tập mới", "Truyện ra tập 100", "new_chapter", &refID, &refType)
	if err != nil {
		t.Fatalf("failed to create notification 1: %v", err)
	}

	n2, err := svc.CreateNotification(ctx, userID, "Phản hồi", "Có người trả lời bình luận của bạn", "comment_reply", nil, nil)
	if err != nil {
		t.Fatalf("failed to create notification 2: %v", err)
	}

	// 2. Đếm số chưa đọc -> phải là 2
	cnt, err := svc.GetUnreadCount(ctx, userID)
	if err != nil || cnt != 2 {
		t.Fatalf("expected unread count 2, got %d (err: %v)", cnt, err)
	}

	// 3. Đánh dấu n2 là đã đọc
	err = svc.MarkAsRead(ctx, userID, n2.ID)
	if err != nil {
		t.Fatalf("failed to mark as read: %v", err)
	}

	// 4. Đếm lại -> phải là 1
	cnt, _ = svc.GetUnreadCount(ctx, userID)
	if cnt != 1 {
		t.Fatalf("expected unread count 1, got %d", cnt)
	}

	// 5. Đánh dấu tất cả là đã đọc
	err = svc.MarkAllAsRead(ctx, userID)
	if err != nil {
		t.Fatalf("failed to mark all as read: %v", err)
	}

	// 6. Đếm lại -> phải là 0
	cnt, _ = svc.GetUnreadCount(ctx, userID)
	if cnt != 0 {
		t.Fatalf("expected unread count 0, got %d", cnt)
	}

	// 7. Lấy danh sách
	list, err := svc.GetUserNotifications(ctx, userID, utils.PaginationParams{Limit: 10, Page: 1})
	if err != nil || len(list) != 2 {
		t.Fatalf("expected 2 notifications in list, got %d", len(list))
	}
}
