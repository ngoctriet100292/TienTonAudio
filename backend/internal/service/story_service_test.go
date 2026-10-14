package service

import (
	"context"
	"errors"
	"testing"
	"time"

	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type mockStoryRepo struct {
	stories   map[uuid.UUID]db.Story
	favorites map[uuid.UUID]map[uuid.UUID]bool // storyID -> userID -> true
}

func newMockStoryRepo() *mockStoryRepo {
	return &mockStoryRepo{
		stories:   make(map[uuid.UUID]db.Story),
		favorites: make(map[uuid.UUID]map[uuid.UUID]bool),
	}
}

func (m *mockStoryRepo) CreateStory(ctx context.Context, arg db.CreateStoryParams) (db.Story, error) {
	id := uuid.New()
	vc := int64(0)
	s := db.Story{
		ID:            id,
		Title:         arg.Title,
		Slug:          arg.Slug,
		Description:   arg.Description,
		CoverImageUrl: arg.CoverImageUrl,
		AuthorID:      arg.AuthorID,
		Status:        arg.Status,
		ViewCount:     &vc,
		CreatedAt:     pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt:     pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	m.stories[id] = s
	return s, nil
}

func (m *mockStoryRepo) GetStoryByID(ctx context.Context, id uuid.UUID) (db.GetStoryByIDRow, error) {
	s, ok := m.stories[id]
	if !ok {
		return db.GetStoryByIDRow{}, errors.New("story not found")
	}
	return db.GetStoryByIDRow{
		ID:            s.ID,
		Title:         s.Title,
		Slug:          s.Slug,
		Description:   s.Description,
		CoverImageUrl: s.CoverImageUrl,
		AuthorID:      s.AuthorID,
		Status:        s.Status,
		ViewCount:     s.ViewCount,
		CreatedAt:     s.CreatedAt,
		UpdatedAt:     s.UpdatedAt,
	}, nil
}

func (m *mockStoryRepo) GetStoryBySlug(ctx context.Context, slug string) (db.GetStoryBySlugRow, error) {
	for _, s := range m.stories {
		if s.Slug == slug {
			return db.GetStoryBySlugRow{
				ID:            s.ID,
				Title:         s.Title,
				Slug:          s.Slug,
				Description:   s.Description,
				CoverImageUrl: s.CoverImageUrl,
				AuthorID:      s.AuthorID,
				Status:        s.Status,
				ViewCount:     s.ViewCount,
				CreatedAt:     s.CreatedAt,
				UpdatedAt:     s.UpdatedAt,
			}, nil
		}
	}
	return db.GetStoryBySlugRow{}, errors.New("story not found")
}

func (m *mockStoryRepo) ListStories(ctx context.Context, arg db.ListStoriesParams) ([]db.ListStoriesRow, error) {
	var rows []db.ListStoriesRow
	for _, s := range m.stories {
		rows = append(rows, db.ListStoriesRow{
			ID:        s.ID,
			Title:     s.Title,
			Slug:      s.Slug,
			ViewCount: s.ViewCount,
		})
	}
	return rows, nil
}

func (m *mockStoryRepo) ListTopViewedStories(ctx context.Context, arg db.ListTopViewedStoriesParams) ([]db.ListTopViewedStoriesRow, error) {
	var rows []db.ListTopViewedStoriesRow
	for _, s := range m.stories {
		rows = append(rows, db.ListTopViewedStoriesRow{
			ID:        s.ID,
			Title:     s.Title,
			Slug:      s.Slug,
			ViewCount: s.ViewCount,
		})
	}
	return rows, nil
}

func (m *mockStoryRepo) SearchStoriesByTitle(ctx context.Context, arg db.SearchStoriesByTitleParams) ([]db.SearchStoriesByTitleRow, error) {
	return nil, nil
}

func (m *mockStoryRepo) AdvancedSearchStories(ctx context.Context, arg db.AdvancedSearchStoriesParams) ([]db.AdvancedSearchStoriesRow, error) {
	return nil, nil
}

func (m *mockStoryRepo) UpdateStory(ctx context.Context, arg db.UpdateStoryParams) (db.Story, error) {
	return db.Story{}, nil
}

func (m *mockStoryRepo) DeleteStory(ctx context.Context, id uuid.UUID) error {
	delete(m.stories, id)
	return nil
}

func (m *mockStoryRepo) IncrementStoryViewCount(ctx context.Context, id uuid.UUID) error {
	s, ok := m.stories[id]
	if !ok {
		return errors.New("story not found")
	}
	newCount := int64(1)
	if s.ViewCount != nil {
		newCount = *s.ViewCount + 1
	}
	s.ViewCount = &newCount
	m.stories[id] = s
	return nil
}

func (m *mockStoryRepo) ListCategories(ctx context.Context) ([]db.Category, error) {
	return nil, nil
}

func (m *mockStoryRepo) GetCategoryBySlug(ctx context.Context, slug string) (db.Category, error) {
	return db.Category{}, nil
}

func (m *mockStoryRepo) AddStoryCategory(ctx context.Context, arg db.AddStoryCategoryParams) error {
	return nil
}

func (m *mockStoryRepo) GetStoryCategories(ctx context.Context, storyID uuid.UUID) ([]db.Category, error) {
	return nil, nil
}

func (m *mockStoryRepo) UpsertListeningProgress(ctx context.Context, arg db.UpsertListeningProgressParams) error {
	return nil
}

func (m *mockStoryRepo) GetUserListeningHistory(ctx context.Context, arg db.GetUserListeningHistoryParams) ([]db.GetUserListeningHistoryRow, error) {
	return nil, nil
}

func (m *mockStoryRepo) AddFavorite(ctx context.Context, arg db.AddFavoriteParams) error {
	if m.favorites[arg.StoryID] == nil {
		m.favorites[arg.StoryID] = make(map[uuid.UUID]bool)
	}
	m.favorites[arg.StoryID][arg.UserID] = true
	return nil
}

func (m *mockStoryRepo) RemoveFavorite(ctx context.Context, arg db.RemoveFavoriteParams) error {
	if m.favorites[arg.StoryID] != nil {
		delete(m.favorites[arg.StoryID], arg.UserID)
	}
	return nil
}

func (m *mockStoryRepo) IsFavorite(ctx context.Context, arg db.IsFavoriteParams) (bool, error) {
	if m.favorites[arg.StoryID] != nil && m.favorites[arg.StoryID][arg.UserID] {
		return true, nil
	}
	return false, nil
}

func (m *mockStoryRepo) GetStoryFavoriteCount(ctx context.Context, storyID uuid.UUID) (int32, error) {
	count := int32(0)
	if m.favorites[storyID] != nil {
		count = int32(len(m.favorites[storyID]))
	}
	return count, nil
}

func (m *mockStoryRepo) GetUserFavorites(ctx context.Context, arg db.GetUserFavoritesParams) ([]db.GetUserFavoritesRow, error) {
	var rows []db.GetUserFavoritesRow
	for sID, userMap := range m.favorites {
		if userMap[arg.UserID] {
			s := m.stories[sID]
			rows = append(rows, db.GetUserFavoritesRow{
				ID:    s.ID,
				Title: s.Title,
				Slug:  s.Slug,
			})
		}
	}
	return rows, nil
}

func (m *mockStoryRepo) CreateComment(ctx context.Context, arg db.CreateCommentParams) (db.Comment, error) {
	return db.Comment{}, nil
}

func (m *mockStoryRepo) GetCommentByID(ctx context.Context, id uuid.UUID) (db.GetCommentByIDRow, error) {
	return db.GetCommentByIDRow{}, nil
}

func (m *mockStoryRepo) GetChapterComments(ctx context.Context, arg db.GetChapterCommentsParams) ([]db.GetChapterCommentsRow, error) {
	return nil, nil
}

func (m *mockStoryRepo) GetCommentReplies(ctx context.Context, arg db.GetCommentRepliesParams) ([]db.GetCommentRepliesRow, error) {
	return nil, nil
}

func (m *mockStoryRepo) SoftDeleteComment(ctx context.Context, arg db.SoftDeleteCommentParams) error {
	return nil
}

func (m *mockStoryRepo) AddCommentReaction(ctx context.Context, arg db.AddCommentReactionParams) (db.CommentReaction, error) {
	return db.CommentReaction{}, nil
}

func (m *mockStoryRepo) RemoveCommentReaction(ctx context.Context, arg db.RemoveCommentReactionParams) error {
	return nil
}

func (m *mockStoryRepo) GetUserCommentReaction(ctx context.Context, arg db.GetUserCommentReactionParams) (string, error) {
	return "", nil
}

func (m *mockStoryRepo) GetCommentReactionCounts(ctx context.Context, commentID uuid.UUID) ([]db.GetCommentReactionCountsRow, error) {
	return nil, nil
}

func (m *mockStoryRepo) GetMultipleCommentsReactionCounts(ctx context.Context, commentIds []uuid.UUID) ([]db.GetMultipleCommentsReactionCountsRow, error) {
	return nil, nil
}

func (m *mockStoryRepo) GetMultipleCommentsUserReactions(ctx context.Context, arg db.GetMultipleCommentsUserReactionsParams) ([]db.GetMultipleCommentsUserReactionsRow, error) {
	return nil, nil
}

func (m *mockStoryRepo) GetRelatedStories(ctx context.Context, arg db.GetRelatedStoriesParams) ([]db.GetRelatedStoriesRow, error) {
	var rows []db.GetRelatedStoriesRow
	for _, s := range m.stories {
		if s.ID != arg.ID {
			rows = append(rows, db.GetRelatedStoriesRow{
				ID:        s.ID,
				Title:     s.Title,
				Slug:      s.Slug,
				ViewCount: s.ViewCount,
			})
		}
	}
	return rows, nil
}

func (m *mockStoryRepo) FollowAuthor(ctx context.Context, arg db.FollowAuthorParams) error {
	return nil
}

func (m *mockStoryRepo) UnfollowAuthor(ctx context.Context, arg db.UnfollowAuthorParams) error {
	return nil
}

func (m *mockStoryRepo) IsFollowingAuthor(ctx context.Context, arg db.IsFollowingAuthorParams) (bool, error) {
	return true, nil
}

func (m *mockStoryRepo) GetFollowedAuthors(ctx context.Context, userID uuid.UUID) ([]db.GetFollowedAuthorsRow, error) {
	return []db.GetFollowedAuthorsRow{{ID: 1, Name: "Vong Ngữ", Slug: "vong-ngu"}}, nil
}

func (m *mockStoryRepo) FollowNarrator(ctx context.Context, arg db.FollowNarratorParams) error {
	return nil
}

func (m *mockStoryRepo) UnfollowNarrator(ctx context.Context, arg db.UnfollowNarratorParams) error {
	return nil
}

func (m *mockStoryRepo) IsFollowingNarrator(ctx context.Context, arg db.IsFollowingNarratorParams) (bool, error) {
	return true, nil
}

func (m *mockStoryRepo) GetFollowedNarrators(ctx context.Context, userID uuid.UUID) ([]db.GetFollowedNarratorsRow, error) {
	return []db.GetFollowedNarratorsRow{{ID: 1, Name: "MC Đình Soạn", Slug: "mc-dinh-soan"}}, nil
}

func TestStoryService_ViewsAndFavorites(t *testing.T) {
	repo := newMockStoryRepo()
	svc := NewStoryService(repo, nil, nil)
	ctx := context.Background()

	// 1. Tạo truyện
	created, err := repo.CreateStory(ctx, db.CreateStoryParams{
		Title: "Phàm Nhân Tu Tiên",
		Slug:  "pham-nhan-tu-tien",
	})
	if err != nil {
		t.Fatalf("failed to create story: %v", err)
	}

	// 2. Gọi GetStoryBySlug -> ViewCount phải tăng từ 0 lên 1
	storyResp, err := svc.GetStoryBySlug(ctx, "pham-nhan-tu-tien")
	if err != nil {
		t.Fatalf("failed to get story: %v", err)
	}
	if storyResp.ViewCount == nil || *storyResp.ViewCount != 1 {
		t.Fatalf("expected view_count = 1, got %v", storyResp.ViewCount)
	}

	// Gọi lần 2 -> ViewCount tăng lên 2
	storyResp2, err := svc.GetStoryBySlug(ctx, "pham-nhan-tu-tien")
	if err != nil {
		t.Fatalf("failed to get story: %v", err)
	}
	if storyResp2.ViewCount == nil || *storyResp2.ViewCount != 2 {
		t.Fatalf("expected view_count = 2, got %v", storyResp2.ViewCount)
	}

	// 3. Top viewed stories
	topStories, err := svc.ListTopViewedStories(ctx, utils.PaginationParams{Limit: 10, Page: 1})
	if err != nil {
		t.Fatalf("failed to list top viewed stories: %v", err)
	}
	if len(topStories) != 1 {
		t.Fatalf("expected 1 story in top viewed, got %d", len(topStories))
	}

	// 4. Test Favorites
	userID := uuid.New()

	// Kiểm tra ban đầu chưa yêu thích
	isFav, err := svc.IsFavorite(ctx, userID, created.ID)
	if err != nil {
		t.Fatalf("isFavorite failed: %v", err)
	}
	if isFav {
		t.Fatal("expected isFavorite = false initially")
	}

	// Toggle Favorite -> Trở thành true
	added, err := svc.ToggleFavorite(ctx, userID, created.ID)
	if err != nil || !added {
		t.Fatalf("expected toggle favorite to return true, got %v, err: %v", added, err)
	}

	// Kiểm tra lại bằng IsFavorite
	isFavAfter, _ := svc.IsFavorite(ctx, userID, created.ID)
	if !isFavAfter {
		t.Fatal("expected isFavorite = true after toggling")
	}

	// Kiểm tra FavoriteCount trong story detail
	storyDetail, _ := svc.GetStoryByID(ctx, created.ID)
	if storyDetail.FavoriteCount != 1 {
		t.Fatalf("expected favorite_count = 1, got %d", storyDetail.FavoriteCount)
	}

	// Toggle lần nữa -> Bỏ yêu thích
	removed, err := svc.ToggleFavorite(ctx, userID, created.ID)
	if err != nil || removed {
		t.Fatalf("expected toggle favorite to return false (removed), got %v", removed)
	}
	isFavFinal, _ := svc.IsFavorite(ctx, userID, created.ID)
	if isFavFinal {
		t.Fatal("expected isFavorite = false after removal")
	}
}

func TestStoryService_RelatedAndFollows(t *testing.T) {
	repo := newMockStoryRepo()
	svc := NewStoryService(repo, nil, nil)
	ctx := context.Background()

	s1, _ := repo.CreateStory(ctx, db.CreateStoryParams{Title: "Truyện 1", Slug: "truyen-1"})
	_, _ = repo.CreateStory(ctx, db.CreateStoryParams{Title: "Truyện 2", Slug: "truyen-2"})

	// 1. Test Related Stories
	related, err := svc.GetRelatedStories(ctx, s1.ID, 10)
	if err != nil || len(related) != 1 {
		t.Fatalf("expected 1 related story, got %d (err: %v)", len(related), err)
	}

	// 2. Test Follow Author
	userID := uuid.New()
	followed, err := svc.ToggleFollowAuthor(ctx, userID, 1)
	if err != nil {
		t.Fatalf("toggle follow author error: %v", err)
	}
	_ = followed

	authors, err := svc.GetFollowedAuthors(ctx, userID)
	if err != nil || len(authors) != 1 {
		t.Fatalf("expected 1 followed author, got %d", len(authors))
	}

	// 3. Test Follow Narrator
	narrators, err := svc.GetFollowedNarrators(ctx, userID)
	if err != nil || len(narrators) != 1 {
		t.Fatalf("expected 1 followed narrator, got %d", len(narrators))
	}
}

func (m *mockStoryRepo) GetStoryIDByChapterID(ctx context.Context, chapterID uuid.UUID) (uuid.UUID, error) {
	return uuid.Nil, errors.New("chapter not found")
}
