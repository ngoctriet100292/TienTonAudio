package domain

import "time"

type AuthorFollowResp struct {
	AuthorID   int32     `json:"author_id"`
	Name       string    `json:"name"`
	Slug       string    `json:"slug"`
	Bio        *string   `json:"bio,omitempty"`
	FollowedAt time.Time `json:"followed_at"`
}

type NarratorFollowResp struct {
	NarratorID  int32     `json:"narrator_id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	AvatarURL   *string   `json:"avatar_url,omitempty"`
	Description *string   `json:"description,omitempty"`
	FollowedAt  time.Time `json:"followed_at"`
}
