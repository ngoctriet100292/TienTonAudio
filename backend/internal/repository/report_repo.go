package repository

import (
	"context"

	"github.com/google/uuid"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
)

type ReportRepository interface {
	CreateReport(ctx context.Context, arg db.CreateReportParams) (db.Report, error)
	ListReports(ctx context.Context, arg db.ListReportsParams) ([]db.ListReportsRow, error)
	GetReportByID(ctx context.Context, id uuid.UUID) (db.GetReportByIDRow, error)
	UpdateReportStatus(ctx context.Context, arg db.UpdateReportStatusParams) (db.Report, error)
}

type reportRepo struct {
	q db.Querier
}

func NewReportRepository(q db.Querier) ReportRepository {
	return &reportRepo{q: q}
}

func (r *reportRepo) CreateReport(ctx context.Context, arg db.CreateReportParams) (db.Report, error) {
	return r.q.CreateReport(ctx, arg)
}

func (r *reportRepo) ListReports(ctx context.Context, arg db.ListReportsParams) ([]db.ListReportsRow, error) {
	return r.q.ListReports(ctx, arg)
}

func (r *reportRepo) GetReportByID(ctx context.Context, id uuid.UUID) (db.GetReportByIDRow, error) {
	return r.q.GetReportByID(ctx, id)
}

func (r *reportRepo) UpdateReportStatus(ctx context.Context, arg db.UpdateReportStatusParams) (db.Report, error) {
	return r.q.UpdateReportStatus(ctx, arg)
}
