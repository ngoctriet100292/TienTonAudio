package domain

import (
	"time"

	"github.com/google/uuid"
)

type NotificationResp struct {
	ID            uuid.UUID  `json:"id"`
	UserID        uuid.UUID  `json:"user_id"`
	Title         string     `json:"title"`
	Message       string     `json:"message"`
	Type          string     `json:"type"` // 'comment_reply', 'new_chapter', 'vip_expiring', 'system'
	ReferenceID   *uuid.UUID `json:"reference_id,omitempty"`
	ReferenceType *string    `json:"reference_type,omitempty"`
	IsRead        bool       `json:"is_read"`
	CreatedAt     time.Time  `json:"created_at"`
}

type UnreadCountResp struct {
	UnreadCount int `json:"unread_count"`
}
