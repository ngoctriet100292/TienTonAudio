package domain

import (
	"encoding/json"
	"math"
	"time"

	"github.com/google/uuid"
)

// SupportedPlaybackSpeeds danh sách tốc độ phát audio hỗ trợ
var SupportedPlaybackSpeeds = []float64{0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0}

type PlaybackSpeedInfo struct {
	Value       float64 `json:"value"`
	Label       string  `json:"label"`
	Description string  `json:"description"`
}

var PlaybackSpeedPresets = []PlaybackSpeedInfo{
	{Value: 0.5, Label: "0.5x", Description: "Rất chậm"},
	{Value: 0.75, Label: "0.75x", Description: "Chậm"},
	{Value: 1.0, Label: "1.0x", Description: "Chuẩn (Mặc định)"},
	{Value: 1.25, Label: "1.25x", Description: "Hơi nhanh"},
	{Value: 1.5, Label: "1.5x", Description: "Nhanh"},
	{Value: 1.75, Label: "1.75x", Description: "Rất nhanh"},
	{Value: 2.0, Label: "2.0x", Description: "Tốc biến x2"},
}

func IsValidPlaybackSpeed(speed float64) bool {
	for _, s := range SupportedPlaybackSpeeds {
		if math.Abs(s-speed) < 0.01 {
			return true
		}
	}
	return false
}

type TimelineMarker struct {
	Title        string `json:"title"`
	StartSeconds int32  `json:"start_seconds"`
}

type CreateChapterReq struct {
	StoryID         uuid.UUID        `json:"story_id" validate:"required"`
	NarratorID      *int32           `json:"narrator_id,omitempty"`
	ChapterNumber   float64          `json:"chapter_number" validate:"required"`
	Title           string           `json:"title" validate:"required"`
	Content         *string          `json:"content,omitempty"`
	ContentURL      *string          `json:"content_url,omitempty"`
	IsPremium       *bool            `json:"is_premium,omitempty"`
	DurationSeconds *int32           `json:"duration_seconds,omitempty"`
	WaveformData    json.RawMessage  `json:"waveform_data,omitempty"`
	TimelineMarkers []TimelineMarker `json:"timeline_markers,omitempty"`
}

type BulkCreateChaptersReq struct {
	StoryID  uuid.UUID          `json:"story_id" validate:"required"`
	Chapters []CreateChapterReq `json:"chapters" validate:"required,min=1"`
}

type BulkCreateChaptersResp struct {
	TotalProcessed int `json:"total_processed"`
	SuccessCount   int `json:"success_count"`
	FailedCount    int `json:"failed_count"`
}

type ChapterResp struct {
	ID              uuid.UUID              `json:"id"`
	StoryID         uuid.UUID              `json:"story_id"`
	NarratorID      *int32                 `json:"narrator_id,omitempty"`
	NarratorName    *string                `json:"narrator_name,omitempty"`
	ChapterNumber   float64                `json:"chapter_number"`
	Title           string                 `json:"title"`
	Content         *string                `json:"content,omitempty"`
	ContentURL      *string                `json:"content_url,omitempty"`
	IsPremium       *bool                  `json:"is_premium,omitempty"`
	DurationSeconds int32                  `json:"duration_seconds"`
	WaveformData    json.RawMessage        `json:"waveform_data,omitempty"`
	TimelineMarkers []TimelineMarker       `json:"timeline_markers,omitempty"`
	ListenCount     *int64                 `json:"listen_count,omitempty"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
	AudioFiles      []ChapterAudioFileResp `json:"audio_files,omitempty"`
}

type ChapterAudioFileResp struct {
	ID            uuid.UUID `json:"id"`
	ChapterID     uuid.UUID `json:"chapter_id"`
	Quality       string    `json:"quality"`
	AudioURL      string    `json:"audio_url,omitempty"`
	FileSizeBytes *int64    `json:"file_size_bytes,omitempty"`
	IsPrimary     *bool     `json:"is_primary,omitempty"`
}

type StreamURLResp struct {
	ChapterID       uuid.UUID           `json:"chapter_id"`
	Quality         string              `json:"quality"`
	StreamURL       string              `json:"stream_url"`
	ExpiresAt       time.Time           `json:"expires_at"`
	PlaybackSpeed   float64             `json:"playback_speed"`
	AvailableSpeeds []PlaybackSpeedInfo `json:"available_speeds"`
}
