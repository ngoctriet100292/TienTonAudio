package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type AdminService interface {
	GetDashboardStats(ctx context.Context) (*domain.DashboardStatsResp, error)
	ListUsers(ctx context.Context, pagination utils.PaginationParams) ([]domain.UserAdminResp, error)
	UpdateUserRole(ctx context.Context, userID uuid.UUID, role string) (*domain.UserAdminResp, error)
	CreateAuthor(ctx context.Context, req domain.CreateAuthorReq) (*domain.AuthorResp, error)
	ListAuthors(ctx context.Context, pagination utils.PaginationParams) ([]domain.AuthorResp, error)
	CreateNarrator(ctx context.Context, req domain.CreateNarratorReq) (*domain.NarratorResp, error)
	ListNarrators(ctx context.Context, pagination utils.PaginationParams) ([]domain.NarratorResp, error)
}

type adminService struct {
	repo repository.AdminRepository
}

func NewAdminService(repo repository.AdminRepository) AdminService {
	return &adminService{repo: repo}
}

func (s *adminService) GetDashboardStats(ctx context.Context) (*domain.DashboardStatsResp, error) {
	stats, err := s.repo.GetDashboardStats(ctx)
	if err != nil {
		return nil, fmt.Errorf("get stats error: %w", err)
	}

	return &domain.DashboardStatsResp{
		TotalUsers:          stats.TotalUsers,
		TotalStories:        stats.TotalStories,
		TotalChapters:       stats.TotalChapters,
		TotalStoryViews:     toInt64(stats.TotalStoryViews),
		TotalChapterListens: toInt64(stats.TotalChapterListens),
		TotalRevenue:        toFloat64(stats.TotalRevenue),
	}, nil
}

func (s *adminService) ListUsers(ctx context.Context, pagination utils.PaginationParams) ([]domain.UserAdminResp, error) {
	users, err := s.repo.ListUsersForAdmin(ctx, db.ListUsersForAdminParams{
		Limit:  pagination.Limit,
		Offset: pagination.Offset(),
	})
	if err != nil {
		return nil, fmt.Errorf("list users error: %w", err)
	}

	result := make([]domain.UserAdminResp, len(users))
	for i, u := range users {
		role := "user"
		if u.Role != nil {
			role = *u.Role
		}
		result[i] = domain.UserAdminResp{
			ID:        u.ID,
			Username:  u.Username,
			Email:     u.Email,
			AvatarURL: u.AvatarUrl,
			Role:      role,
			CreatedAt: u.CreatedAt.Time,
			UpdatedAt: u.UpdatedAt.Time,
		}
	}
	return result, nil
}

func (s *adminService) UpdateUserRole(ctx context.Context, userID uuid.UUID, role string) (*domain.UserAdminResp, error) {
	r := role
	u, err := s.repo.UpdateUserRole(ctx, db.UpdateUserRoleParams{
		ID:   userID,
		Role: &r,
	})
	if err != nil {
		return nil, fmt.Errorf("update user role error: %w", err)
	}

	resRole := "user"
	if u.Role != nil {
		resRole = *u.Role
	}

	return &domain.UserAdminResp{
		ID:        u.ID,
		Username:  u.Username,
		Email:     u.Email,
		AvatarURL: u.AvatarUrl,
		Role:      resRole,
		CreatedAt: u.CreatedAt.Time,
		UpdatedAt: u.UpdatedAt.Time,
	}, nil
}

func (s *adminService) CreateAuthor(ctx context.Context, req domain.CreateAuthorReq) (*domain.AuthorResp, error) {
	author, err := s.repo.CreateAuthor(ctx, db.CreateAuthorParams{
		Name: req.Name,
		Slug: req.Slug,
		Bio:  req.Bio,
	})
	if err != nil {
		return nil, fmt.Errorf("create author error: %w", err)
	}

	return &domain.AuthorResp{
		ID:        author.ID,
		Name:      author.Name,
		Slug:      author.Slug,
		Bio:       author.Bio,
		CreatedAt: author.CreatedAt.Time,
	}, nil
}

func (s *adminService) ListAuthors(ctx context.Context, pagination utils.PaginationParams) ([]domain.AuthorResp, error) {
	authors, err := s.repo.ListAuthors(ctx, db.ListAuthorsParams{
		Limit:  pagination.Limit,
		Offset: pagination.Offset(),
	})
	if err != nil {
		return nil, fmt.Errorf("list authors error: %w", err)
	}

	result := make([]domain.AuthorResp, len(authors))
	for i, a := range authors {
		result[i] = domain.AuthorResp{
			ID:        a.ID,
			Name:      a.Name,
			Slug:      a.Slug,
			Bio:       a.Bio,
			CreatedAt: a.CreatedAt.Time,
		}
	}
	return result, nil
}

func (s *adminService) CreateNarrator(ctx context.Context, req domain.CreateNarratorReq) (*domain.NarratorResp, error) {
	narrator, err := s.repo.CreateNarrator(ctx, db.CreateNarratorParams{
		Name:        req.Name,
		Slug:        req.Slug,
		AvatarUrl:   req.AvatarURL,
		Description: req.Description,
	})
	if err != nil {
		return nil, fmt.Errorf("create narrator error: %w", err)
	}

	return &domain.NarratorResp{
		ID:          narrator.ID,
		Name:        narrator.Name,
		Slug:        narrator.Slug,
		AvatarURL:   narrator.AvatarUrl,
		Description: narrator.Description,
		CreatedAt:   narrator.CreatedAt.Time,
	}, nil
}

func (s *adminService) ListNarrators(ctx context.Context, pagination utils.PaginationParams) ([]domain.NarratorResp, error) {
	narrators, err := s.repo.ListNarrators(ctx, db.ListNarratorsParams{
		Limit:  pagination.Limit,
		Offset: pagination.Offset(),
	})
	if err != nil {
		return nil, fmt.Errorf("list narrators error: %w", err)
	}

	result := make([]domain.NarratorResp, len(narrators))
	for i, n := range narrators {
		result[i] = domain.NarratorResp{
			ID:          n.ID,
			Name:        n.Name,
			Slug:        n.Slug,
			AvatarURL:   n.AvatarUrl,
			Description: n.Description,
			CreatedAt:   n.CreatedAt.Time,
		}
	}
	return result, nil
}

func toInt64(v interface{}) int64 {
	if v == nil {
		return 0
	}
	switch val := v.(type) {
	case int64:
		return val
	case int32:
		return int64(val)
	case float64:
		return int64(val)
	default:
		return 0
	}
}

func toFloat64(v interface{}) float64 {
	if v == nil {
		return 0
	}
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int64:
		return float64(val)
	case int32:
		return float64(val)
	default:
		return 0
	}
}
