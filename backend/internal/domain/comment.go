package domain

import (
	"time"

	"github.com/google/uuid"
)

type CreateCommentReq struct {
	ChapterID             uuid.UUID  `json:"chapter_id" validate:"required"`
	ParentID              *uuid.UUID `json:"parent_id,omitempty"`
	Content               string     `json:"content" validate:"required,min=1,max=2000"`
	AudioTimestampSeconds *int32     `json:"audio_timestamp_seconds,omitempty"`
}

type ReplyCommentReq struct {
	Content               string `json:"content" validate:"required,min=1,max=2000"`
	AudioTimestampSeconds *int32 `json:"audio_timestamp_seconds,omitempty"`
}

type ReactCommentReq struct {
	ReactionType string `json:"reaction_type" validate:"required,oneof=like love haha wow sad angry"`
}

type ReactCommentResp struct {
	Action         string         `json:"action"` // "added", "updated", "removed"
	ReactionType   *string        `json:"reaction_type,omitempty"`
	TotalReactions int            `json:"total_reactions"`
	Reactions      map[string]int `json:"reactions"`
}

type CommentResp struct {
	ID                    uuid.UUID      `json:"id"`
	UserID                *uuid.UUID     `json:"user_id,omitempty"`
	Username              string         `json:"username"`
	AvatarURL             *string        `json:"avatar_url,omitempty"`
	ChapterID             *uuid.UUID     `json:"chapter_id,omitempty"`
	ParentID              *uuid.UUID     `json:"parent_id,omitempty"`
	Content               string         `json:"content"`
	AudioTimestampSeconds *int32         `json:"audio_timestamp_seconds,omitempty"`
	IsDeleted             bool           `json:"is_deleted"`
	ReplyCount            int            `json:"reply_count"`
	TotalReactions        int            `json:"total_reactions"`
	Reactions             map[string]int `json:"reactions"`
	UserReaction          *string        `json:"user_reaction,omitempty"`
	CreatedAt             time.Time      `json:"created_at"`
	UpdatedAt             time.Time      `json:"updated_at"`
}
