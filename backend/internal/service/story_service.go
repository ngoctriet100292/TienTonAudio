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

type StoryService interface {
	ListStories(ctx context.Context, pagination utils.PaginationParams) ([]domain.StoryResp, error)
	ListTopViewedStories(ctx context.Context, pagination utils.PaginationParams) ([]domain.StoryResp, error)
	GetStoryBySlug(ctx context.Context, slug string) (*domain.StoryResp, error)
	GetStoryByID(ctx context.Context, id uuid.UUID) (*domain.StoryResp, error)
	SearchStories(ctx context.Context, query string, pagination utils.PaginationParams) ([]domain.StoryResp, error)
	AdvancedSearchStories(ctx context.Context, filter domain.StoryFilterReq, pagination utils.PaginationParams) ([]domain.StoryResp, error)
	CreateStory(ctx context.Context, req domain.CreateStoryReq) (*domain.StoryResp, error)
	UpdateStory(ctx context.Context, id uuid.UUID, req domain.UpdateStoryReq) (*domain.StoryResp, error)
	DeleteStory(ctx context.Context, id uuid.UUID) error
	ListCategories(ctx context.Context) ([]domain.Category, error)
	SaveListeningProgress(ctx context.Context, userID uuid.UUID, req domain.ListeningProgressReq) error
	GetUserListeningHistory(ctx context.Context, userID uuid.UUID, pagination utils.PaginationParams) ([]domain.ListeningHistoryResp, error)
	ToggleFavorite(ctx context.Context, userID uuid.UUID, storyID uuid.UUID) (bool, error)
	IsFavorite(ctx context.Context, userID uuid.UUID, storyID uuid.UUID) (bool, error)
	GetUserFavorites(ctx context.Context, userID uuid.UUID, pagination utils.PaginationParams) ([]domain.StoryResp, error)
	GetRelatedStories(ctx context.Context, storyID uuid.UUID, limit int32) ([]domain.StoryResp, error)
	ToggleFollowAuthor(ctx context.Context, userID uuid.UUID, authorID int32) (bool, error)
	IsFollowingAuthor(ctx context.Context, userID uuid.UUID, authorID int32) (bool, error)
	GetFollowedAuthors(ctx context.Context, userID uuid.UUID) ([]domain.AuthorFollowResp, error)
	ToggleFollowNarrator(ctx context.Context, userID uuid.UUID, narratorID int32) (bool, error)
	IsFollowingNarrator(ctx context.Context, userID uuid.UUID, narratorID int32) (bool, error)
	GetFollowedNarrators(ctx context.Context, userID uuid.UUID) ([]domain.NarratorFollowResp, error)
}

type storyService struct {
	repo        repository.StoryRepository
	userRepo    repository.UserRepository
	paymentRepo repository.PaymentRepository
}

func NewStoryService(repo repository.StoryRepository, userRepo repository.UserRepository, paymentRepo repository.PaymentRepository) StoryService {
	return &storyService{
		repo:        repo,
		userRepo:    userRepo,
		paymentRepo: paymentRepo,
	}
}

func mapStoryStatusLabel(status *string) *string {
	if status == nil {
		return nil
	}
	label := domain.GetStoryStatusLabel(*status)
	return &label
}

func (s *storyService) ListStories(ctx context.Context, pagination utils.PaginationParams) ([]domain.StoryResp, error) {
	rows, err := s.repo.ListStories(ctx, db.ListStoriesParams{
		Limit:  pagination.Limit,
		Offset: pagination.Offset(),
	})
	if err != nil {
		return nil, fmt.Errorf("list stories error: %w", err)
	}

	result := make([]domain.StoryResp, len(rows))
	for i, r := range rows {
		result[i] = domain.StoryResp{
			ID:            r.ID,
			Title:         r.Title,
			Slug:          r.Slug,
			Description:   r.Description,
			CoverImageURL: r.CoverImageUrl,
			AuthorID:      r.AuthorID,
			AuthorName:    r.AuthorName,
			Status:        r.Status,
			StatusLabel:   mapStoryStatusLabel(r.Status),
			ViewCount:     r.ViewCount,
			TotalChapters: r.TotalChapters,
			RatingAvg:     utils.NumericToFloat64Ptr(r.RatingAvg),
			RatingCount:   r.RatingCount,
			CreatedAt:     r.CreatedAt.Time,
			UpdatedAt:     r.UpdatedAt.Time,
		}
	}
	return result, nil
}

func (s *storyService) ListTopViewedStories(ctx context.Context, pagination utils.PaginationParams) ([]domain.StoryResp, error) {
	rows, err := s.repo.ListTopViewedStories(ctx, db.ListTopViewedStoriesParams{
		Limit:  pagination.Limit,
		Offset: pagination.Offset(),
	})
	if err != nil {
		return nil, fmt.Errorf("list top viewed stories error: %w", err)
	}

	result := make([]domain.StoryResp, len(rows))
	for i, r := range rows {
		favCount, _ := s.repo.GetStoryFavoriteCount(ctx, r.ID)
		result[i] = domain.StoryResp{
			ID:            r.ID,
			Title:         r.Title,
			Slug:          r.Slug,
			Description:   r.Description,
			CoverImageURL: r.CoverImageUrl,
			AuthorID:      r.AuthorID,
			AuthorName:    r.AuthorName,
			Status:        r.Status,
			StatusLabel:   mapStoryStatusLabel(r.Status),
			ViewCount:     r.ViewCount,
			TotalChapters: r.TotalChapters,
			RatingAvg:     utils.NumericToFloat64Ptr(r.RatingAvg),
			RatingCount:   r.RatingCount,
			FavoriteCount: int(favCount),
			CreatedAt:     r.CreatedAt.Time,
			UpdatedAt:     r.UpdatedAt.Time,
		}
	}
	return result, nil
}

func (s *storyService) GetStoryBySlug(ctx context.Context, slug string) (*domain.StoryResp, error) {
	row, err := s.repo.GetStoryBySlug(ctx, slug)
	if err != nil {
		if id, parseErr := uuid.Parse(slug); parseErr == nil {
			return s.GetStoryByID(ctx, id)
		}
		return nil, fmt.Errorf("story not found: %w", err)
	}

	_ = s.repo.IncrementStoryViewCount(ctx, row.ID)

	updatedViewCount := int64(1)
	if row.ViewCount != nil {
		updatedViewCount = *row.ViewCount + 1
	}

	favCount, _ := s.repo.GetStoryFavoriteCount(ctx, row.ID)

	cats, _ := s.repo.GetStoryCategories(ctx, row.ID)
	domainCats := make([]domain.Category, len(cats))
	for i, c := range cats {
		domainCats[i] = domain.Category{
			ID:          c.ID,
			Name:        c.Name,
			Slug:        c.Slug,
			Description: c.Description,
		}
	}

	return &domain.StoryResp{
		ID:            row.ID,
		Title:         row.Title,
		Slug:          row.Slug,
		Description:   row.Description,
		CoverImageURL: row.CoverImageUrl,
		AuthorID:      row.AuthorID,
		AuthorName:    row.AuthorName,
		Status:        row.Status,
		StatusLabel:   mapStoryStatusLabel(row.Status),
		ViewCount:     &updatedViewCount,
		TotalChapters: row.TotalChapters,
		RatingAvg:     utils.NumericToFloat64Ptr(row.RatingAvg),
		RatingCount:   row.RatingCount,
		FavoriteCount: int(favCount),
		CreatedAt:     row.CreatedAt.Time,
		UpdatedAt:     row.UpdatedAt.Time,
		Categories:    domainCats,
	}, nil
}

func (s *storyService) GetStoryByID(ctx context.Context, id uuid.UUID) (*domain.StoryResp, error) {
	row, err := s.repo.GetStoryByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("story not found: %w", err)
	}

	_ = s.repo.IncrementStoryViewCount(ctx, row.ID)

	updatedViewCount := int64(1)
	if row.ViewCount != nil {
		updatedViewCount = *row.ViewCount + 1
	}

	favCount, _ := s.repo.GetStoryFavoriteCount(ctx, row.ID)

	cats, _ := s.repo.GetStoryCategories(ctx, row.ID)
	domainCats := make([]domain.Category, len(cats))
	for i, c := range cats {
		domainCats[i] = domain.Category{
			ID:          c.ID,
			Name:        c.Name,
			Slug:        c.Slug,
			Description: c.Description,
		}
	}

	return &domain.StoryResp{
		ID:            row.ID,
		Title:         row.Title,
		Slug:          row.Slug,
		Description:   row.Description,
		CoverImageURL: row.CoverImageUrl,
		AuthorID:      row.AuthorID,
		AuthorName:    row.AuthorName,
		Status:        row.Status,
		StatusLabel:   mapStoryStatusLabel(row.Status),
		ViewCount:     &updatedViewCount,
		TotalChapters: row.TotalChapters,
		RatingAvg:     utils.NumericToFloat64Ptr(row.RatingAvg),
		RatingCount:   row.RatingCount,
		FavoriteCount: int(favCount),
		CreatedAt:     row.CreatedAt.Time,
		UpdatedAt:     row.UpdatedAt.Time,
		Categories:    domainCats,
	}, nil
}

func (s *storyService) SearchStories(ctx context.Context, query string, pagination utils.PaginationParams) ([]domain.StoryResp, error) {
	q := query
	rows, err := s.repo.SearchStoriesByTitle(ctx, db.SearchStoriesByTitleParams{
		Column1: &q,
		Limit:   pagination.Limit,
		Offset:  pagination.Offset(),
	})
	if err != nil {
		return nil, fmt.Errorf("search stories error: %w", err)
	}

	result := make([]domain.StoryResp, len(rows))
	for i, r := range rows {
		result[i] = domain.StoryResp{
			ID:            r.ID,
			Title:         r.Title,
			Slug:          r.Slug,
			CoverImageURL: r.CoverImageUrl,
			TotalChapters: r.TotalChapters,
			ViewCount:     r.ViewCount,
			RatingAvg:     utils.NumericToFloat64Ptr(r.RatingAvg),
		}
	}
	return result, nil
}

func (s *storyService) AdvancedSearchStories(ctx context.Context, filter domain.StoryFilterReq, pagination utils.PaginationParams) ([]domain.StoryResp, error) {
	q := ""
	if filter.Query != nil {
		q = *filter.Query
	}
	catID := int32(0)
	if filter.CategoryID != nil {
		catID = *filter.CategoryID
	}
	status := ""
	if filter.Status != nil {
		status = *filter.Status
	}

	rows, err := s.repo.AdvancedSearchStories(ctx, db.AdvancedSearchStoriesParams{
		Column1: q,
		Column2: catID,
		Column3: status,
		Limit:   pagination.Limit,
		Offset:  pagination.Offset(),
	})
	if err != nil {
		return nil, fmt.Errorf("advanced search error: %w", err)
	}

	result := make([]domain.StoryResp, len(rows))
	for i, r := range rows {
		result[i] = domain.StoryResp{
			ID:            r.ID,
			Title:         r.Title,
			Slug:          r.Slug,
			Description:   r.Description,
			CoverImageURL: r.CoverImageUrl,
			AuthorID:      r.AuthorID,
			AuthorName:    r.AuthorName,
			Status:        r.Status,
			StatusLabel:   mapStoryStatusLabel(r.Status),
			ViewCount:     r.ViewCount,
			TotalChapters: r.TotalChapters,
			RatingAvg:     utils.NumericToFloat64Ptr(r.RatingAvg),
			RatingCount:   r.RatingCount,
			CreatedAt:     r.CreatedAt.Time,
			UpdatedAt:     r.UpdatedAt.Time,
		}
	}
	return result, nil
}

func (s *storyService) CreateStory(ctx context.Context, req domain.CreateStoryReq) (*domain.StoryResp, error) {
	row, err := s.repo.CreateStory(ctx, db.CreateStoryParams{
		Title:         req.Title,
		Slug:          req.Slug,
		Description:   req.Description,
		CoverImageUrl: req.CoverImageURL,
		AuthorID:      req.AuthorID,
		Status:        req.Status,
	})
	if err != nil {
		return nil, fmt.Errorf("create story error: %w", err)
	}

	for _, catID := range req.CategoryIDs {
		_ = s.repo.AddStoryCategory(ctx, db.AddStoryCategoryParams{
			StoryID:    row.ID,
			CategoryID: catID,
		})
	}

	return &domain.StoryResp{
		ID:            row.ID,
		Title:         row.Title,
		Slug:          row.Slug,
		Description:   row.Description,
		CoverImageURL: row.CoverImageUrl,
		AuthorID:      row.AuthorID,
		Status:        row.Status,
		StatusLabel:   mapStoryStatusLabel(row.Status),
		ViewCount:     row.ViewCount,
		TotalChapters: row.TotalChapters,
		RatingAvg:     utils.NumericToFloat64Ptr(row.RatingAvg),
		RatingCount:   row.RatingCount,
		CreatedAt:     row.CreatedAt.Time,
		UpdatedAt:     row.UpdatedAt.Time,
	}, nil
}

func (s *storyService) UpdateStory(ctx context.Context, id uuid.UUID, req domain.UpdateStoryReq) (*domain.StoryResp, error) {
	title := ""
	if req.Title != nil {
		title = *req.Title
	}
	slug := ""
	if req.Slug != nil {
		slug = *req.Slug
	}

	row, err := s.repo.UpdateStory(ctx, db.UpdateStoryParams{
		ID:            id,
		Title:         title,
		Slug:          slug,
		Description:   req.Description,
		CoverImageUrl: req.CoverImageURL,
		AuthorID:      req.AuthorID,
		Status:        req.Status,
	})
	if err != nil {
		return nil, fmt.Errorf("update story error: %w", err)
	}

	return &domain.StoryResp{
		ID:            row.ID,
		Title:         row.Title,
		Slug:          row.Slug,
		Description:   row.Description,
		CoverImageURL: row.CoverImageUrl,
		AuthorID:      row.AuthorID,
		Status:        row.Status,
		StatusLabel:   mapStoryStatusLabel(row.Status),
		ViewCount:     row.ViewCount,
		TotalChapters: row.TotalChapters,
		RatingAvg:     utils.NumericToFloat64Ptr(row.RatingAvg),
		RatingCount:   row.RatingCount,
		CreatedAt:     row.CreatedAt.Time,
		UpdatedAt:     row.UpdatedAt.Time,
	}, nil
}

func (s *storyService) DeleteStory(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteStory(ctx, id)
}

func (s *storyService) ListCategories(ctx context.Context) ([]domain.Category, error) {
	rows, err := s.repo.ListCategories(ctx)
	if err != nil {
		return nil, err
	}
	res := make([]domain.Category, len(rows))
	for i, r := range rows {
		res[i] = domain.Category{
			ID:          r.ID,
			Name:        r.Name,
			Slug:        r.Slug,
			Description: r.Description,
		}
	}
	return res, nil
}

func (s *storyService) SaveListeningProgress(ctx context.Context, userID uuid.UUID, req domain.ListeningProgressReq) error {
	isCompleted := req.IsCompleted
	speed := 1.0
	if req.PlaybackSpeed != nil && domain.IsValidPlaybackSpeed(*req.PlaybackSpeed) {
		speed = *req.PlaybackSpeed
	}

	err := s.repo.UpsertListeningProgress(ctx, db.UpsertListeningProgressParams{
		UserID:              userID,
		ChapterID:           req.ChapterID,
		StoryID:             req.StoryID,
		LastPositionSeconds: req.LastPositionSeconds,
		PlaybackSpeed:       utils.Float64ToNumeric(speed),
		IsCompleted:         &isCompleted,
	})
	if err != nil {
		return err
	}

	// Tăng điểm Tu Vi (EXP) khi nghe audio (Mỗi lần đồng bộ tiến độ hấp thu linh khí)
	if s.userRepo != nil {
		userCult, err := s.userRepo.GetUserCultivation(ctx, userID)
		if err == nil {
			currExp := int64(0)
			if userCult.CultivationExp != nil {
				currExp = *userCult.CultivationExp
			}

			// Thưởng tu vi cơ bản: 5 điểm/lần nghe. Nếu hoàn thành tập: +15 điểm
			gain := int64(5)
			if isCompleted {
				gain += 15
			}

			// Nếu đang có VIP, nhân đôi (2x) tốc độ hấp thu linh khí
			if s.paymentRepo != nil {
				sub, err := s.paymentRepo.GetUserActiveSubscription(ctx, userID)
				if err == nil && sub.Status != nil && *sub.Status == "active" {
					gain = int64(float64(gain) * 2.0)
				}
			}

			newExp := currExp + gain
			newRealm, _, _, _, _, _ := domain.CalculateCultivationRealm(newExp)
			_, _ = s.userRepo.AddUserCultivationExp(ctx, db.AddUserCultivationExpParams{
				ID:               userID,
				CultivationExp:   &gain,
				CultivationRealm: &newRealm,
			})
		}
	}

	return nil
}

func (s *storyService) GetUserListeningHistory(ctx context.Context, userID uuid.UUID, pagination utils.PaginationParams) ([]domain.ListeningHistoryResp, error) {
	rows, err := s.repo.GetUserListeningHistory(ctx, db.GetUserListeningHistoryParams{
		UserID: userID,
		Limit:  pagination.Limit,
		Offset: pagination.Offset(),
	})
	if err != nil {
		return nil, err
	}
	res := make([]domain.ListeningHistoryResp, len(rows))
	for i, r := range rows {
		isComp := false
		if r.IsCompleted != nil {
			isComp = *r.IsCompleted
		}
		speed := utils.NumericToFloat64(r.PlaybackSpeed)
		if speed <= 0 {
			speed = 1.0
		}
		res[i] = domain.ListeningHistoryResp{
			ChapterID:           r.ChapterID,
			StoryID:             r.StoryID,
			LastPositionSeconds: r.LastPositionSeconds,
			PlaybackSpeed:       speed,
			IsCompleted:         isComp,
			UpdatedAt:           r.UpdatedAt.Time,
			ChapterTitle:        r.ChapterTitle,
			ChapterNumber:       utils.NumericToFloat64(r.ChapterNumber),
			DurationSeconds:     r.DurationSeconds,
			StoryTitle:          r.StoryTitle,
			CoverImageURL:       r.CoverImageUrl,
		}
	}
	return res, nil
}

func (s *storyService) ToggleFavorite(ctx context.Context, userID uuid.UUID, storyID uuid.UUID) (bool, error) {
	isFav, err := s.repo.IsFavorite(ctx, db.IsFavoriteParams{
		UserID:  userID,
		StoryID: storyID,
	})
	if err != nil {
		return false, err
	}

	if isFav {
		err = s.repo.RemoveFavorite(ctx, db.RemoveFavoriteParams{
			UserID:  userID,
			StoryID: storyID,
		})
		return false, err
	}

	err = s.repo.AddFavorite(ctx, db.AddFavoriteParams{
		UserID:  userID,
		StoryID: storyID,
	})
	return true, err
}

func (s *storyService) GetUserFavorites(ctx context.Context, userID uuid.UUID, pagination utils.PaginationParams) ([]domain.StoryResp, error) {
	rows, err := s.repo.GetUserFavorites(ctx, db.GetUserFavoritesParams{
		UserID: userID,
		Limit:  pagination.Limit,
		Offset: pagination.Offset(),
	})
	if err != nil {
		return nil, err
	}

	res := make([]domain.StoryResp, len(rows))
	for i, r := range rows {
		res[i] = domain.StoryResp{
			ID:            r.ID,
			Title:         r.Title,
			Slug:          r.Slug,
			CoverImageURL: r.CoverImageUrl,
			TotalChapters: r.TotalChapters,
			RatingAvg:     utils.NumericToFloat64Ptr(r.RatingAvg),
		}
	}
	return res, nil
}

func (s *storyService) IsFavorite(ctx context.Context, userID uuid.UUID, storyID uuid.UUID) (bool, error) {
	return s.repo.IsFavorite(ctx, db.IsFavoriteParams{
		UserID:  userID,
		StoryID: storyID,
	})
}

func (s *storyService) GetRelatedStories(ctx context.Context, storyID uuid.UUID, limit int32) ([]domain.StoryResp, error) {
	if limit <= 0 {
		limit = 10
	}
	rows, err := s.repo.GetRelatedStories(ctx, db.GetRelatedStoriesParams{
		ID:    storyID,
		Limit: limit,
	})
	if err != nil {
		return nil, fmt.Errorf("get related stories error: %w", err)
	}

	res := make([]domain.StoryResp, len(rows))
	for i, r := range rows {
		res[i] = domain.StoryResp{
			ID:            r.ID,
			Title:         r.Title,
			Slug:          r.Slug,
			Description:   r.Description,
			CoverImageURL: r.CoverImageUrl,
			AuthorID:      r.AuthorID,
			AuthorName:    r.AuthorName,
			Status:        r.Status,
			StatusLabel:   mapStoryStatusLabel(r.Status),
			ViewCount:     r.ViewCount,
			TotalChapters: r.TotalChapters,
			RatingAvg:     utils.NumericToFloat64Ptr(r.RatingAvg),
			RatingCount:   r.RatingCount,
			CreatedAt:     r.CreatedAt.Time,
			UpdatedAt:     r.UpdatedAt.Time,
		}
	}
	return res, nil
}

func (s *storyService) ToggleFollowAuthor(ctx context.Context, userID uuid.UUID, authorID int32) (bool, error) {
	isFollowing, err := s.repo.IsFollowingAuthor(ctx, db.IsFollowingAuthorParams{
		UserID:   userID,
		AuthorID: authorID,
	})
	if err != nil {
		return false, err
	}

	if isFollowing {
		err = s.repo.UnfollowAuthor(ctx, db.UnfollowAuthorParams{
			UserID:   userID,
			AuthorID: authorID,
		})
		return false, err
	}

	err = s.repo.FollowAuthor(ctx, db.FollowAuthorParams{
		UserID:   userID,
		AuthorID: authorID,
	})
	return true, err
}

func (s *storyService) IsFollowingAuthor(ctx context.Context, userID uuid.UUID, authorID int32) (bool, error) {
	return s.repo.IsFollowingAuthor(ctx, db.IsFollowingAuthorParams{
		UserID:   userID,
		AuthorID: authorID,
	})
}

func (s *storyService) GetFollowedAuthors(ctx context.Context, userID uuid.UUID) ([]domain.AuthorFollowResp, error) {
	rows, err := s.repo.GetFollowedAuthors(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get followed authors error: %w", err)
	}

	res := make([]domain.AuthorFollowResp, len(rows))
	for i, r := range rows {
		res[i] = domain.AuthorFollowResp{
			AuthorID:   r.ID,
			Name:       r.Name,
			Slug:       r.Slug,
			Bio:        r.Bio,
			FollowedAt: r.FollowedAt.Time,
		}
	}
	return res, nil
}

func (s *storyService) ToggleFollowNarrator(ctx context.Context, userID uuid.UUID, narratorID int32) (bool, error) {
	isFollowing, err := s.repo.IsFollowingNarrator(ctx, db.IsFollowingNarratorParams{
		UserID:     userID,
		NarratorID: narratorID,
	})
	if err != nil {
		return false, err
	}

	if isFollowing {
		err = s.repo.UnfollowNarrator(ctx, db.UnfollowNarratorParams{
			UserID:     userID,
			NarratorID: narratorID,
		})
		return false, err
	}

	err = s.repo.FollowNarrator(ctx, db.FollowNarratorParams{
		UserID:     userID,
		NarratorID: narratorID,
	})
	return true, err
}

func (s *storyService) IsFollowingNarrator(ctx context.Context, userID uuid.UUID, narratorID int32) (bool, error) {
	return s.repo.IsFollowingNarrator(ctx, db.IsFollowingNarratorParams{
		UserID:     userID,
		NarratorID: narratorID,
	})
}

func (s *storyService) GetFollowedNarrators(ctx context.Context, userID uuid.UUID) ([]domain.NarratorFollowResp, error) {
	rows, err := s.repo.GetFollowedNarrators(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get followed narrators error: %w", err)
	}

	res := make([]domain.NarratorFollowResp, len(rows))
	for i, r := range rows {
		res[i] = domain.NarratorFollowResp{
			NarratorID:  r.ID,
			Name:        r.Name,
			Slug:        r.Slug,
			AvatarURL:   r.AvatarUrl,
			Description: r.Description,
			FollowedAt:  r.FollowedAt.Time,
		}
	}
	return res, nil
}