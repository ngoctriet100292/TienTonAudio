package domain

import (
	"time"

	"github.com/google/uuid"
)

type CreateStoryReq struct {
	Title         string   `json:"title" validate:"required"`
	Slug          string   `json:"slug" validate:"required"`
	Description   *string  `json:"description,omitempty"`
	CoverImageURL *string  `json:"cover_image_url,omitempty"`
	AuthorID      *int32   `json:"author_id,omitempty"`
	Status        *string  `json:"status,omitempty"`
	CategoryIDs   []int32  `json:"category_ids,omitempty"`
}

type UpdateStoryReq struct {
	Title         *string `json:"title,omitempty"`
	Slug          *string `json:"slug,omitempty"`
	Description   *string `json:"description,omitempty"`
	CoverImageURL *string `json:"cover_image_url,omitempty"`
	AuthorID      *int32  `json:"author_id,omitempty"`
	Status        *string `json:"status,omitempty"`
}

const (
	StoryStatusOngoing   = "ongoing"   // Còn tiếp
	StoryStatusCompleted = "completed" // Hoàn thành
	StoryStatusPaused    = "paused"    // Tạm ngưng
	StoryStatusDropped   = "dropped"   // Tạm ngưng
)

func GetStoryStatusLabel(status string) string {
	switch status {
	case StoryStatusCompleted:
		return "Hoàn thành"
	case StoryStatusPaused, StoryStatusDropped:
		return "Tạm ngưng"
	case StoryStatusOngoing:
		fallthrough
	default:
		return "Còn tiếp"
	}
}

type StoryFilterReq struct {
	Query      *string `json:"query,omitempty"`
	CategoryID *int32  `json:"category_id,omitempty"`
	Status     *string `json:"status,omitempty"`
}

type StoryResp struct {
	ID            uuid.UUID  `json:"id"`
	Title         string     `json:"title"`
	Slug          string     `json:"slug"`
	Description   *string    `json:"description,omitempty"`
	CoverImageURL *string    `json:"cover_image_url,omitempty"`
	AuthorID      *int32     `json:"author_id,omitempty"`
	AuthorName    *string    `json:"author_name,omitempty"`
	Status        *string    `json:"status,omitempty"`
	StatusLabel   *string    `json:"status_label,omitempty"`
	ViewCount     *int64     `json:"view_count,omitempty"`
	TotalChapters *int32     `json:"total_chapters,omitempty"`
	RatingAvg     *float64   `json:"rating_avg,omitempty"`
	RatingCount   *int32     `json:"rating_count,omitempty"`
	FavoriteCount int        `json:"favorite_count"`
	IsFavorite    *bool      `json:"is_favorite,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	Categories    []Category `json:"categories,omitempty"`
}

type ListeningProgressReq struct {
	ChapterID           uuid.UUID `json:"chapter_id" validate:"required"`
	StoryID             uuid.UUID `json:"story_id" validate:"required"`
	LastPositionSeconds int32     `json:"last_position_seconds"`
	PlaybackSpeed       *float64  `json:"playback_speed,omitempty"`
	IsCompleted         bool      `json:"is_completed"`
}

type ListeningHistoryResp struct {
	ChapterID           uuid.UUID `json:"chapter_id"`
	StoryID             uuid.UUID `json:"story_id"`
	LastPositionSeconds int32     `json:"last_position_seconds"`
	PlaybackSpeed       float64   `json:"playback_speed"`
	IsCompleted         bool      `json:"is_completed"`
	UpdatedAt           time.Time `json:"updated_at"`
	ChapterTitle        string    `json:"chapter_title"`
	ChapterNumber       float64   `json:"chapter_number"`
	DurationSeconds     int32     `json:"duration_seconds"`
	StoryTitle          string    `json:"story_title"`
	CoverImageURL       *string   `json:"cover_image_url,omitempty"`
}
