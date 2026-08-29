package domain

import "github.com/google/uuid"

type Category struct {
	ID          int32   `json:"id"`
	Name        string  `json:"name"`
	Slug        string  `json:"slug"`
	Description *string `json:"description,omitempty"`
}

type ReviewReq struct {
	StoryID uuid.UUID `json:"story_id" validate:"required"`
	Rating  int16     `json:"rating" validate:"required,min=1,max=5"`
	Content *string   `json:"content,omitempty"`
}

type CommentReq struct {
	ChapterID uuid.UUID  `json:"chapter_id" validate:"required"`
	ParentID  *uuid.UUID `json:"parent_id,omitempty"`
	Content   string     `json:"content" validate:"required"`
}