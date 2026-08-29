package domain

import "github.com/google/uuid"

type AIChatReq struct {
	StoryID   *uuid.UUID `json:"story_id,omitempty"`
	ChapterID *uuid.UUID `json:"chapter_id,omitempty"`
	Prompt    string     `json:"prompt" validate:"required"`
}

type AIChatResp struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
	Provider string `json:"provider"`
}

type StoryRealmsResp struct {
	StoryID   uuid.UUID `json:"story_id"`
	StoryName string    `json:"story_name"`
	Realms    string    `json:"realms"`
}

type StorySummaryResp struct {
	StoryID   uuid.UUID `json:"story_id"`
	StoryName string    `json:"story_name"`
	Summary   string    `json:"summary"`
}
