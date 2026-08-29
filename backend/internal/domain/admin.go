package domain

import (
	"time"

	"github.com/google/uuid"
)

type DashboardStatsResp struct {
	TotalUsers          int64   `json:"total_users"`
	TotalStories        int64   `json:"total_stories"`
	TotalChapters       int64   `json:"total_chapters"`
	TotalStoryViews     int64   `json:"total_story_views"`
	TotalChapterListens int64   `json:"total_chapter_listens"`
	TotalRevenue        float64 `json:"total_revenue"`
}

type UpdateUserRoleReq struct {
	Role string `json:"role" validate:"required"`
}

type CreateAuthorReq struct {
	Name string  `json:"name" validate:"required"`
	Slug string  `json:"slug" validate:"required"`
	Bio  *string `json:"bio,omitempty"`
}

type AuthorResp struct {
	ID        int32     `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Bio       *string   `json:"bio,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateNarratorReq struct {
	Name        string  `json:"name" validate:"required"`
	Slug        string  `json:"slug" validate:"required"`
	AvatarURL   *string `json:"avatar_url,omitempty"`
	Description *string `json:"description,omitempty"`
}

type NarratorResp struct {
	ID          int32     `json:"id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	AvatarURL   *string   `json:"avatar_url,omitempty"`
	Description *string   `json:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type UserAdminResp struct {
	ID        uuid.UUID `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	AvatarURL *string   `json:"avatar_url,omitempty"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
