package repository

import (
	"context"

	"github.com/google/uuid"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
)

type NotificationRepository interface {
	CreateNotification(ctx context.Context, arg db.CreateNotificationParams) (db.Notification, error)
	GetUserNotifications(ctx context.Context, arg db.GetUserNotificationsParams) ([]db.Notification, error)
	GetUnreadNotificationCount(ctx context.Context, userID uuid.UUID) (int32, error)
	MarkNotificationAsRead(ctx context.Context, arg db.MarkNotificationAsReadParams) error
	MarkAllNotificationsAsRead(ctx context.Context, userID uuid.UUID) error
}

type notificationRepo struct {
	q db.Querier
}

func NewNotificationRepository(q db.Querier) NotificationRepository {
	return &notificationRepo{q: q}
}

func (r *notificationRepo) CreateNotification(ctx context.Context, arg db.CreateNotificationParams) (db.Notification, error) {
	return r.q.CreateNotification(ctx, arg)
}

func (r *notificationRepo) GetUserNotifications(ctx context.Context, arg db.GetUserNotificationsParams) ([]db.Notification, error) {
	return r.q.GetUserNotifications(ctx, arg)
}

func (r *notificationRepo) GetUnreadNotificationCount(ctx context.Context, userID uuid.UUID) (int32, error) {
	return r.q.GetUnreadNotificationCount(ctx, userID)
}

func (r *notificationRepo) MarkNotificationAsRead(ctx context.Context, arg db.MarkNotificationAsReadParams) error {
	return r.q.MarkNotificationAsRead(ctx, arg)
}

func (r *notificationRepo) MarkAllNotificationsAsRead(ctx context.Context, userID uuid.UUID) error {
	return r.q.MarkAllNotificationsAsRead(ctx, userID)
}
