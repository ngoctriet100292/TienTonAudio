package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type CreateChapterReq struct {
	StoryID         uuid.UUID       `json:"story_id" validate:"required"`
	NarratorID      *int32          `json:"narrator_id,omitempty"`
	ChapterNumber   float64         `json:"chapter_number" validate:"required"`
	Title           string          `json:"title" validate:"required"`
	Content         *string         `json:"content,omitempty"`
	IsPremium       *bool           `json:"is_premium,omitempty"`
	DurationSeconds *int32          `json:"duration_seconds,omitempty"`
	WaveformData    json.RawMessage `json:"waveform_data,omitempty"`
}

type ChapterResp struct {
	ID              uuid.UUID              `json:"id"`
	StoryID         uuid.UUID              `json:"story_id"`
	NarratorID      *int32                 `json:"narrator_id,omitempty"`
	NarratorName    *string                `json:"narrator_name,omitempty"`
	ChapterNumber   float64                `json:"chapter_number"`
	Title           string                 `json:"title"`
	Content         *string                `json:"content,omitempty"`
	IsPremium       *bool                  `json:"is_premium,omitempty"`
	DurationSeconds int32                  `json:"duration_seconds"`
	WaveformData    json.RawMessage        `json:"waveform_data,omitempty"`
	ListenCount     *int64                 `json:"listen_count,omitempty"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
	AudioFiles      []ChapterAudioFileResp `json:"audio_files,omitempty"`
}

type ChapterAudioFileResp struct {
	ID            uuid.UUID `json:"id"`
	ChapterID     uuid.UUID `json:"chapter_id"`
	Quality       string    `json:"quality"`
	AudioURL      string    `json:"audio_url"`
	FileSizeBytes *int64    `json:"file_size_bytes,omitempty"`
	IsPrimary     *bool     `json:"is_primary,omitempty"`
}

type StreamURLResp struct {
	ChapterID uuid.UUID `json:"chapter_id"`
	Quality   string    `json:"quality"`
	StreamURL string    `json:"stream_url"`
	ExpiresAt time.Time `json:"expires_at"`
}