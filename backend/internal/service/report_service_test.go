package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type mockReportRepo struct {
	reports map[uuid.UUID]db.Report
}

func newMockReportRepo() *mockReportRepo {
	return &mockReportRepo{
		reports: make(map[uuid.UUID]db.Report),
	}
}

func (m *mockReportRepo) CreateReport(ctx context.Context, arg db.CreateReportParams) (db.Report, error) {
	id := uuid.New()
	st := "pending"
	r := db.Report{
		ID:          id,
		UserID:      arg.UserID,
		TargetType:  arg.TargetType,
		TargetID:    arg.TargetID,
		Reason:      arg.Reason,
		Description: arg.Description,
		Status:      &st,
		CreatedAt:   pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt:   pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	m.reports[id] = r
	return r, nil
}

func (m *mockReportRepo) ListReports(ctx context.Context, arg db.ListReportsParams) ([]db.ListReportsRow, error) {
	var res []db.ListReportsRow
	for _, r := range m.reports {
		if arg.Column1 == "" || (r.Status != nil && *r.Status == arg.Column1) {
			res = append(res, db.ListReportsRow{
				ID:               r.ID,
				UserID:           r.UserID,
				TargetType:       r.TargetType,
				TargetID:         r.TargetID,
				Reason:           r.Reason,
				Description:      r.Description,
				Status:           r.Status,
				ResolvedBy:       r.ResolvedBy,
				AdminNotes:       r.AdminNotes,
				CreatedAt:        r.CreatedAt,
				UpdatedAt:        r.UpdatedAt,
				ReporterUsername: "reporter_user",
			})
		}
	}
	return res, nil
}

func (m *mockReportRepo) GetReportByID(ctx context.Context, id uuid.UUID) (db.GetReportByIDRow, error) {
	r, ok := m.reports[id]
	if !ok {
		return db.GetReportByIDRow{}, errors.New("report not found")
	}
	return db.GetReportByIDRow{
		ID:               r.ID,
		UserID:           r.UserID,
		TargetType:       r.TargetType,
		TargetID:         r.TargetID,
		Reason:           r.Reason,
		Description:      r.Description,
		Status:           r.Status,
		ResolvedBy:       r.ResolvedBy,
		AdminNotes:       r.AdminNotes,
		CreatedAt:        r.CreatedAt,
		UpdatedAt:        r.UpdatedAt,
		ReporterUsername: "reporter_user",
	}, nil
}

func (m *mockReportRepo) UpdateReportStatus(ctx context.Context, arg db.UpdateReportStatusParams) (db.Report, error) {
	r, ok := m.reports[arg.ID]
	if !ok {
		return db.Report{}, errors.New("report not found")
	}
	r.Status = arg.Status
	r.ResolvedBy = arg.ResolvedBy
	r.AdminNotes = arg.AdminNotes
	m.reports[arg.ID] = r
	return r, nil
}

func TestReportService_Flow(t *testing.T) {
	repo := newMockReportRepo()
	svc := NewReportService(repo)
	ctx := context.Background()

	userID := uuid.New()
	adminID := uuid.New()
	chapterID := uuid.New()

	desc := "Đoạn 05:20 bị rè âm thanh không nghe được"
	// 1. Tạo báo cáo
	report, err := svc.CreateReport(ctx, userID, domain.CreateReportReq{
		TargetType:  "chapter",
		TargetID:    chapterID,
		Reason:      "audio_broken",
		Description: &desc,
	})
	if err != nil {
		t.Fatalf("failed to create report: %v", err)
	}
	if report.Status != "pending" {
		t.Fatalf("expected pending status, got %s", report.Status)
	}

	// 2. Admin list reports
	list, err := svc.ListReports(ctx, nil, utils.PaginationParams{Limit: 10, Page: 1})
	if err != nil || len(list) != 1 {
		t.Fatalf("expected 1 report in list, got %d", len(list))
	}

	// 3. Admin update status sang resolved
	note := "Đã lọc lại âm thanh sạch và upload file mới"
	updated, err := svc.UpdateReportStatus(ctx, report.ID, adminID, domain.UpdateReportStatusReq{
		Status:     "resolved",
		AdminNotes: &note,
	})
	if err != nil {
		t.Fatalf("failed to update report status: %v", err)
	}
	if updated.Status != "resolved" || updated.AdminNotes == nil || *updated.AdminNotes != note {
		t.Fatalf("unexpected update report result: %+v", updated)
	}
}
