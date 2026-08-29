package domain

import (
	"time"

	"github.com/google/uuid"
)

type CreatePlaylistReq struct {
	Name     string `json:"name" validate:"required,min=1,max=150"`
	IsPublic bool   `json:"is_public"`
}

type UpdatePlaylistReq struct {
	Name     *string `json:"name,omitempty"`
	IsPublic *bool   `json:"is_public,omitempty"`
}

type AddPlaylistItemReq struct {
	ChapterID uuid.UUID `json:"chapter_id" validate:"required"`
}

type PlaylistResp struct {
	ID         uuid.UUID  `json:"id"`
	UserID     *uuid.UUID `json:"user_id,omitempty"`
	Name       string     `json:"name"`
	IsPublic   bool       `json:"is_public"`
	TotalItems int32      `json:"total_items"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type PlaylistItemDetailResp struct {
	PlaylistID      uuid.UUID `json:"playlist_id"`
	ChapterID       uuid.UUID `json:"chapter_id"`
	Position        int32     `json:"position"`
	AddedAt         time.Time `json:"added_at"`
	ChapterTitle    string    `json:"chapter_title"`
	ChapterNumber   float64   `json:"chapter_number"`
	DurationSeconds int32     `json:"duration_seconds"`
	ListenCount     *int64    `json:"listen_count,omitempty"`
	IsPremium       *bool     `json:"is_premium,omitempty"`
	StoryID         uuid.UUID `json:"story_id"`
	StoryTitle      string    `json:"story_title"`
	CoverImageURL   *string   `json:"cover_image_url,omitempty"`
}

type PlaylistDetailResp struct {
	Playlist PlaylistResp             `json:"playlist"`
	Items    []PlaylistItemDetailResp `json:"items"`
}
