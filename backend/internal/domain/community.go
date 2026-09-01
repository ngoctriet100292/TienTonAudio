package domain

import (
	"time"

	"github.com/google/uuid"
)

type CommunityPost struct {
	ID               uuid.UUID  `json:"id"`
	UserID           uuid.UUID  `json:"user_id"`
	StoryID          *uuid.UUID `json:"story_id,omitempty"`
	Topic            string     `json:"topic"`
	Content          string     `json:"content"`
	LikeCount        int        `json:"like_count"`
	CommentCount     int        `json:"comment_count"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`

	// Author details
	AuthorName       string     `json:"author_name"`
	AuthorAvatar     *string    `json:"author_avatar,omitempty"`
	AuthorRole       string     `json:"author_role"`
	CultivationRealm string     `json:"cultivation_realm"`
	CultivationLevel int        `json:"cultivation_level"`
	CultivationColor string     `json:"cultivation_color"`

	// Attached Story details (if any)
	StoryTitle       *string    `json:"story_title,omitempty"`
	StorySlug        *string    `json:"story_slug,omitempty"`
	StoryCoverURL    *string    `json:"story_cover_url,omitempty"`

	// Current user interaction
	IsLiked          bool       `json:"is_liked"`
}

type CreateCommunityPostReq struct {
	StoryID *uuid.UUID `json:"story_id,omitempty"`
	Topic   string     `json:"topic"`
	Content string     `json:"content" validate:"required,min=5,max=5000"`
}

type CommunityComment struct {
	ID               uuid.UUID  `json:"id"`
	PostID           uuid.UUID  `json:"post_id"`
	UserID           uuid.UUID  `json:"user_id"`
	ParentID         *uuid.UUID `json:"parent_id,omitempty"`
	Content          string     `json:"content"`
	CreatedAt        time.Time  `json:"created_at"`

	// Author details
	AuthorName       string     `json:"author_name"`
	AuthorAvatar     *string    `json:"author_avatar,omitempty"`
	AuthorRole       string     `json:"author_role"`
	CultivationRealm string     `json:"cultivation_realm"`
	CultivationLevel int        `json:"cultivation_level"`
	CultivationColor string     `json:"cultivation_color"`
}

type CreateCommunityCommentReq struct {
	ParentID *uuid.UUID `json:"parent_id,omitempty"`
	Content  string     `json:"content" validate:"required,min=1,max=2000"`
}

type TogglePostLikeResp struct {
	IsLiked   bool `json:"is_liked"`
	LikeCount int  `json:"like_count"`
}
