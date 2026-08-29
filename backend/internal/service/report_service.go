package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type ReportService interface {
	CreateReport(ctx context.Context, userID uuid.UUID, req domain.CreateReportReq) (*domain.ReportResp, error)
	ListReports(ctx context.Context, status *string, pagination utils.PaginationParams) ([]domain.ReportResp, error)
	GetReportByID(ctx context.Context, id uuid.UUID) (*domain.ReportResp, error)
	UpdateReportStatus(ctx context.Context, reportID uuid.UUID, adminID uuid.UUID, req domain.UpdateReportStatusReq) (*domain.ReportResp, error)
}

type reportService struct {
	repo repository.ReportRepository
}

func NewReportService(repo repository.ReportRepository) ReportService {
	return &reportService{repo: repo}
}

func (s *reportService) CreateReport(ctx context.Context, userID uuid.UUID, req domain.CreateReportReq) (*domain.ReportResp, error) {
	if req.TargetType != "chapter" && req.TargetType != "comment" && req.TargetType != "story" {
		return nil, errors.New("target_type must be chapter, comment, or story")
	}
	if req.Reason == "" {
		return nil, errors.New("reason is required")
	}

	r, err := s.repo.CreateReport(ctx, db.CreateReportParams{
		UserID:      userID,
		TargetType:  req.TargetType,
		TargetID:    req.TargetID,
		Reason:      req.Reason,
		Description: req.Description,
	})
	if err != nil {
		return nil, fmt.Errorf("create report error: %w", err)
	}

	var resBy *uuid.UUID
	if r.ResolvedBy.Valid {
		resBy = &r.ResolvedBy.UUID
	}
	st := "pending"
	if r.Status != nil {
		st = *r.Status
	}

	return &domain.ReportResp{
		ID:          r.ID,
		UserID:      r.UserID,
		TargetType:  r.TargetType,
		TargetID:    r.TargetID,
		Reason:      r.Reason,
		Description: r.Description,
		Status:      st,
		ResolvedBy:  resBy,
		AdminNotes:  r.AdminNotes,
		CreatedAt:   r.CreatedAt.Time,
		UpdatedAt:   r.UpdatedAt.Time,
	}, nil
}

func (s *reportService) ListReports(ctx context.Context, status *string, pagination utils.PaginationParams) ([]domain.ReportResp, error) {
	st := ""
	if status != nil {
		st = *status
	}
	rows, err := s.repo.ListReports(ctx, db.ListReportsParams{
		Column1: st,
		Limit:   pagination.Limit,
		Offset:  pagination.Offset(),
	})
	if err != nil {
		return nil, fmt.Errorf("list reports error: %w", err)
	}

	result := make([]domain.ReportResp, len(rows))
	for i, r := range rows {
		var resBy *uuid.UUID
		if r.ResolvedBy.Valid {
			resBy = &r.ResolvedBy.UUID
		}
		st := "pending"
		if r.Status != nil {
			st = *r.Status
		}

		result[i] = domain.ReportResp{
			ID:               r.ID,
			UserID:           r.UserID,
			ReporterUsername: r.ReporterUsername,
			TargetType:       r.TargetType,
			TargetID:         r.TargetID,
			Reason:           r.Reason,
			Description:      r.Description,
			Status:           st,
			ResolvedBy:       resBy,
			AdminNotes:       r.AdminNotes,
			CreatedAt:        r.CreatedAt.Time,
			UpdatedAt:        r.UpdatedAt.Time,
		}
	}

	return result, nil
}

func (s *reportService) GetReportByID(ctx context.Context, id uuid.UUID) (*domain.ReportResp, error) {
	r, err := s.repo.GetReportByID(ctx, id)
	if err != nil {
		return nil, errors.New("report not found")
	}

	var resBy *uuid.UUID
	if r.ResolvedBy.Valid {
		resBy = &r.ResolvedBy.UUID
	}
	st := "pending"
	if r.Status != nil {
		st = *r.Status
	}

	return &domain.ReportResp{
		ID:               r.ID,
		UserID:           r.UserID,
		ReporterUsername: r.ReporterUsername,
		TargetType:       r.TargetType,
		TargetID:         r.TargetID,
		Reason:           r.Reason,
		Description:      r.Description,
		Status:           st,
		ResolvedBy:       resBy,
		AdminNotes:       r.AdminNotes,
		CreatedAt:        r.CreatedAt.Time,
		UpdatedAt:        r.UpdatedAt.Time,
	}, nil
}

func (s *reportService) UpdateReportStatus(ctx context.Context, reportID uuid.UUID, adminID uuid.UUID, req domain.UpdateReportStatusReq) (*domain.ReportResp, error) {
	if req.Status != "pending" && req.Status != "resolved" && req.Status != "rejected" {
		return nil, errors.New("status must be pending, resolved, or rejected")
	}

	r, err := s.repo.UpdateReportStatus(ctx, db.UpdateReportStatusParams{
		ID:         reportID,
		Status:     &req.Status,
		ResolvedBy: uuid.NullUUID{UUID: adminID, Valid: true},
		AdminNotes: req.AdminNotes,
	})
	if err != nil {
		return nil, fmt.Errorf("update report error: %w", err)
	}

	var resBy *uuid.UUID
	if r.ResolvedBy.Valid {
		resBy = &r.ResolvedBy.UUID
	}
	st := "pending"
	if r.Status != nil {
		st = *r.Status
	}

	return &domain.ReportResp{
		ID:          r.ID,
		UserID:      r.UserID,
		TargetType:  r.TargetType,
		TargetID:    r.TargetID,
		Reason:      r.Reason,
		Description: r.Description,
		Status:      st,
		ResolvedBy:  resBy,
		AdminNotes:  r.AdminNotes,
		CreatedAt:   r.CreatedAt.Time,
		UpdatedAt:   r.UpdatedAt.Time,
	}, nil
}
