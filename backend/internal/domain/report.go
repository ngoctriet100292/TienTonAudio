package domain

import (
	"time"

	"github.com/google/uuid"
)

type CreateReportReq struct {
	TargetType  string    `json:"target_type" validate:"required,oneof=chapter comment story"`
	TargetID    uuid.UUID `json:"target_id" validate:"required"`
	Reason      string    `json:"reason" validate:"required,min=3,max=100"`
	Description *string   `json:"description,omitempty" validate:"omitempty,max=1000"`
}

type UpdateReportStatusReq struct {
	Status     string  `json:"status" validate:"required,oneof=pending resolved rejected"`
	AdminNotes *string `json:"admin_notes,omitempty" validate:"omitempty,max=1000"`
}

type ReportResp struct {
	ID               uuid.UUID  `json:"id"`
	UserID           uuid.UUID  `json:"user_id"`
	ReporterUsername string     `json:"reporter_username,omitempty"`
	TargetType       string     `json:"target_type"`
	TargetID         uuid.UUID  `json:"target_id"`
	Reason           string     `json:"reason"`
	Description      *string    `json:"description,omitempty"`
	Status           string     `json:"status"`
	ResolvedBy       *uuid.UUID `json:"resolved_by,omitempty"`
	AdminNotes       *string    `json:"admin_notes,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}
