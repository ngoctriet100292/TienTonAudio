package repository

import (
	"context"

	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
)

type AdminRepository interface {
	GetDashboardStats(ctx context.Context) (db.GetDashboardStatsRow, error)
	ListUsersForAdmin(ctx context.Context, arg db.ListUsersForAdminParams) ([]db.ListUsersForAdminRow, error)
	UpdateUserRole(ctx context.Context, arg db.UpdateUserRoleParams) (db.UpdateUserRoleRow, error)
	CreateAuthor(ctx context.Context, arg db.CreateAuthorParams) (db.Author, error)
	ListAuthors(ctx context.Context, arg db.ListAuthorsParams) ([]db.Author, error)
	GetAuthorByID(ctx context.Context, id int32) (db.Author, error)
	UpdateAuthor(ctx context.Context, arg db.UpdateAuthorParams) (db.Author, error)
	DeleteAuthor(ctx context.Context, id int32) error
	CreateNarrator(ctx context.Context, arg db.CreateNarratorParams) (db.Narrator, error)
	ListNarrators(ctx context.Context, arg db.ListNarratorsParams) ([]db.Narrator, error)
	GetNarratorByID(ctx context.Context, id int32) (db.Narrator, error)
	UpdateNarrator(ctx context.Context, arg db.UpdateNarratorParams) (db.Narrator, error)
	DeleteNarrator(ctx context.Context, id int32) error
}

type adminRepo struct {
	q db.Querier
}

func NewAdminRepository(q db.Querier) AdminRepository {
	return &adminRepo{q: q}
}

func (r *adminRepo) GetDashboardStats(ctx context.Context) (db.GetDashboardStatsRow, error) {
	return r.q.GetDashboardStats(ctx)
}

func (r *adminRepo) ListUsersForAdmin(ctx context.Context, arg db.ListUsersForAdminParams) ([]db.ListUsersForAdminRow, error) {
	return r.q.ListUsersForAdmin(ctx, arg)
}

func (r *adminRepo) UpdateUserRole(ctx context.Context, arg db.UpdateUserRoleParams) (db.UpdateUserRoleRow, error) {
	return r.q.UpdateUserRole(ctx, arg)
}

func (r *adminRepo) CreateAuthor(ctx context.Context, arg db.CreateAuthorParams) (db.Author, error) {
	return r.q.CreateAuthor(ctx, arg)
}

func (r *adminRepo) ListAuthors(ctx context.Context, arg db.ListAuthorsParams) ([]db.Author, error) {
	return r.q.ListAuthors(ctx, arg)
}

func (r *adminRepo) GetAuthorByID(ctx context.Context, id int32) (db.Author, error) {
	return r.q.GetAuthorByID(ctx, id)
}

func (r *adminRepo) UpdateAuthor(ctx context.Context, arg db.UpdateAuthorParams) (db.Author, error) {
	return r.q.UpdateAuthor(ctx, arg)
}

func (r *adminRepo) DeleteAuthor(ctx context.Context, id int32) error {
	return r.q.DeleteAuthor(ctx, id)
}

func (r *adminRepo) CreateNarrator(ctx context.Context, arg db.CreateNarratorParams) (db.Narrator, error) {
	return r.q.CreateNarrator(ctx, arg)
}

func (r *adminRepo) ListNarrators(ctx context.Context, arg db.ListNarratorsParams) ([]db.Narrator, error) {
	return r.q.ListNarrators(ctx, arg)
}

func (r *adminRepo) GetNarratorByID(ctx context.Context, id int32) (db.Narrator, error) {
	return r.q.GetNarratorByID(ctx, id)
}

func (r *adminRepo) UpdateNarrator(ctx context.Context, arg db.UpdateNarratorParams) (db.Narrator, error) {
	return r.q.UpdateNarrator(ctx, arg)
}

func (r *adminRepo) DeleteNarrator(ctx context.Context, id int32) error {
	return r.q.DeleteNarrator(ctx, id)
}
