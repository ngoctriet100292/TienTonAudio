package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type NotificationService interface {
	CreateNotification(ctx context.Context, userID uuid.UUID, title, message, nType string, refID *uuid.UUID, refType *string) (*domain.NotificationResp, error)
	GetUserNotifications(ctx context.Context, userID uuid.UUID, pagination utils.PaginationParams) ([]domain.NotificationResp, error)
	GetUnreadCount(ctx context.Context, userID uuid.UUID) (int, error)
	MarkAsRead(ctx context.Context, userID uuid.UUID, notificationID uuid.UUID) error
	MarkAllAsRead(ctx context.Context, userID uuid.UUID) error
}

type notificationService struct {
	repo repository.NotificationRepository
}

func NewNotificationService(repo repository.NotificationRepository) NotificationService {
	return &notificationService{repo: repo}
}

func (s *notificationService) CreateNotification(ctx context.Context, userID uuid.UUID, title, message, nType string, refID *uuid.UUID, refType *string) (*domain.NotificationResp, error) {
	var rID uuid.NullUUID
	if refID != nil {
		rID = uuid.NullUUID{UUID: *refID, Valid: true}
	}

	n, err := s.repo.CreateNotification(ctx, db.CreateNotificationParams{
		UserID:        userID,
		Title:         title,
		Message:       message,
		Type:          nType,
		ReferenceID:   rID,
		ReferenceType: refType,
	})
	if err != nil {
		return nil, fmt.Errorf("create notification error: %w", err)
	}

	var resRefID *uuid.UUID
	if n.ReferenceID.Valid {
		resRefID = &n.ReferenceID.UUID
	}
	isRead := false
	if n.IsRead != nil {
		isRead = *n.IsRead
	}

	return &domain.NotificationResp{
		ID:            n.ID,
		UserID:        n.UserID,
		Title:         n.Title,
		Message:       n.Message,
		Type:          n.Type,
		ReferenceID:   resRefID,
		ReferenceType: n.ReferenceType,
		IsRead:        isRead,
		CreatedAt:     n.CreatedAt.Time,
	}, nil
}

func (s *notificationService) GetUserNotifications(ctx context.Context, userID uuid.UUID, pagination utils.PaginationParams) ([]domain.NotificationResp, error) {
	rows, err := s.repo.GetUserNotifications(ctx, db.GetUserNotificationsParams{
		UserID: userID,
		Limit:  pagination.Limit,
		Offset: pagination.Offset(),
	})
	if err != nil {
		return nil, fmt.Errorf("get notifications error: %w", err)
	}

	result := make([]domain.NotificationResp, len(rows))
	for i, r := range rows {
		var resRefID *uuid.UUID
		if r.ReferenceID.Valid {
			resRefID = &r.ReferenceID.UUID
		}
		isRead := false
		if r.IsRead != nil {
			isRead = *r.IsRead
		}

		result[i] = domain.NotificationResp{
			ID:            r.ID,
			UserID:        r.UserID,
			Title:         r.Title,
			Message:       r.Message,
			Type:          r.Type,
			ReferenceID:   resRefID,
			ReferenceType: r.ReferenceType,
			IsRead:        isRead,
			CreatedAt:     r.CreatedAt.Time,
		}
	}

	return result, nil
}

func (s *notificationService) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int, error) {
	cnt, err := s.repo.GetUnreadNotificationCount(ctx, userID)
	if err != nil {
		return 0, fmt.Errorf("get unread count error: %w", err)
	}
	return int(cnt), nil
}

func (s *notificationService) MarkAsRead(ctx context.Context, userID uuid.UUID, notificationID uuid.UUID) error {
	return s.repo.MarkNotificationAsRead(ctx, db.MarkNotificationAsReadParams{
		ID:     notificationID,
		UserID: userID,
	})
}

func (s *notificationService) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	return s.repo.MarkAllNotificationsAsRead(ctx, userID)
}
