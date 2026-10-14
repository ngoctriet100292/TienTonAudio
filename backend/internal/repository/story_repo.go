package repository

import (
	"context"

	"github.com/google/uuid"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
)

type StoryRepository interface {
	CreateStory(ctx context.Context, arg db.CreateStoryParams) (db.Story, error)
	GetStoryByID(ctx context.Context, id uuid.UUID) (db.GetStoryByIDRow, error)
	GetStoryBySlug(ctx context.Context, slug string) (db.GetStoryBySlugRow, error)
	ListStories(ctx context.Context, arg db.ListStoriesParams) ([]db.ListStoriesRow, error)
	ListTopViewedStories(ctx context.Context, arg db.ListTopViewedStoriesParams) ([]db.ListTopViewedStoriesRow, error)
	SearchStoriesByTitle(ctx context.Context, arg db.SearchStoriesByTitleParams) ([]db.SearchStoriesByTitleRow, error)
	AdvancedSearchStories(ctx context.Context, arg db.AdvancedSearchStoriesParams) ([]db.AdvancedSearchStoriesRow, error)
	UpdateStory(ctx context.Context, arg db.UpdateStoryParams) (db.Story, error)
	DeleteStory(ctx context.Context, id uuid.UUID) error
	IncrementStoryViewCount(ctx context.Context, id uuid.UUID) error
	ListCategories(ctx context.Context) ([]db.Category, error)
	GetCategoryBySlug(ctx context.Context, slug string) (db.Category, error)
	AddStoryCategory(ctx context.Context, arg db.AddStoryCategoryParams) error
	GetStoryCategories(ctx context.Context, storyID uuid.UUID) ([]db.Category, error)
	UpsertListeningProgress(ctx context.Context, arg db.UpsertListeningProgressParams) error
	GetStoryIDByChapterID(ctx context.Context, chapterID uuid.UUID) (uuid.UUID, error)
	GetUserListeningHistory(ctx context.Context, arg db.GetUserListeningHistoryParams) ([]db.GetUserListeningHistoryRow, error)
	AddFavorite(ctx context.Context, arg db.AddFavoriteParams) error
	RemoveFavorite(ctx context.Context, arg db.RemoveFavoriteParams) error
	IsFavorite(ctx context.Context, arg db.IsFavoriteParams) (bool, error)
	GetStoryFavoriteCount(ctx context.Context, storyID uuid.UUID) (int32, error)
	GetUserFavorites(ctx context.Context, arg db.GetUserFavoritesParams) ([]db.GetUserFavoritesRow, error)
	CreateComment(ctx context.Context, arg db.CreateCommentParams) (db.Comment, error)
	GetCommentByID(ctx context.Context, id uuid.UUID) (db.GetCommentByIDRow, error)
	GetChapterComments(ctx context.Context, arg db.GetChapterCommentsParams) ([]db.GetChapterCommentsRow, error)
	GetCommentReplies(ctx context.Context, arg db.GetCommentRepliesParams) ([]db.GetCommentRepliesRow, error)
	SoftDeleteComment(ctx context.Context, arg db.SoftDeleteCommentParams) error
	AddCommentReaction(ctx context.Context, arg db.AddCommentReactionParams) (db.CommentReaction, error)
	RemoveCommentReaction(ctx context.Context, arg db.RemoveCommentReactionParams) error
	GetUserCommentReaction(ctx context.Context, arg db.GetUserCommentReactionParams) (string, error)
	GetCommentReactionCounts(ctx context.Context, commentID uuid.UUID) ([]db.GetCommentReactionCountsRow, error)
	GetMultipleCommentsReactionCounts(ctx context.Context, commentIds []uuid.UUID) ([]db.GetMultipleCommentsReactionCountsRow, error)
	GetMultipleCommentsUserReactions(ctx context.Context, arg db.GetMultipleCommentsUserReactionsParams) ([]db.GetMultipleCommentsUserReactionsRow, error)
	GetRelatedStories(ctx context.Context, arg db.GetRelatedStoriesParams) ([]db.GetRelatedStoriesRow, error)
	FollowAuthor(ctx context.Context, arg db.FollowAuthorParams) error
	UnfollowAuthor(ctx context.Context, arg db.UnfollowAuthorParams) error
	IsFollowingAuthor(ctx context.Context, arg db.IsFollowingAuthorParams) (bool, error)
	GetFollowedAuthors(ctx context.Context, userID uuid.UUID) ([]db.GetFollowedAuthorsRow, error)
	FollowNarrator(ctx context.Context, arg db.FollowNarratorParams) error
	UnfollowNarrator(ctx context.Context, arg db.UnfollowNarratorParams) error
	IsFollowingNarrator(ctx context.Context, arg db.IsFollowingNarratorParams) (bool, error)
	GetFollowedNarrators(ctx context.Context, userID uuid.UUID) ([]db.GetFollowedNarratorsRow, error)
}

type storyRepo struct {
	q db.Querier
}

func NewStoryRepository(q db.Querier) StoryRepository {
	return &storyRepo{q: q}
}

func (r *storyRepo) CreateStory(ctx context.Context, arg db.CreateStoryParams) (db.Story, error) {
	return r.q.CreateStory(ctx, arg)
}

func (r *storyRepo) GetStoryByID(ctx context.Context, id uuid.UUID) (db.GetStoryByIDRow, error) {
	return r.q.GetStoryByID(ctx, id)
}

func (r *storyRepo) GetStoryBySlug(ctx context.Context, slug string) (db.GetStoryBySlugRow, error) {
	return r.q.GetStoryBySlug(ctx, slug)
}

func (r *storyRepo) ListStories(ctx context.Context, arg db.ListStoriesParams) ([]db.ListStoriesRow, error) {
	return r.q.ListStories(ctx, arg)
}

func (r *storyRepo) ListTopViewedStories(ctx context.Context, arg db.ListTopViewedStoriesParams) ([]db.ListTopViewedStoriesRow, error) {
	return r.q.ListTopViewedStories(ctx, arg)
}

func (r *storyRepo) SearchStoriesByTitle(ctx context.Context, arg db.SearchStoriesByTitleParams) ([]db.SearchStoriesByTitleRow, error) {
	return r.q.SearchStoriesByTitle(ctx, arg)
}

func (r *storyRepo) AdvancedSearchStories(ctx context.Context, arg db.AdvancedSearchStoriesParams) ([]db.AdvancedSearchStoriesRow, error) {
	return r.q.AdvancedSearchStories(ctx, arg)
}

func (r *storyRepo) UpdateStory(ctx context.Context, arg db.UpdateStoryParams) (db.Story, error) {
	return r.q.UpdateStory(ctx, arg)
}

func (r *storyRepo) DeleteStory(ctx context.Context, id uuid.UUID) error {
	return r.q.DeleteStory(ctx, id)
}

func (r *storyRepo) IncrementStoryViewCount(ctx context.Context, id uuid.UUID) error {
	return r.q.IncrementStoryViewCount(ctx, id)
}

func (r *storyRepo) ListCategories(ctx context.Context) ([]db.Category, error) {
	return r.q.ListCategories(ctx)
}

func (r *storyRepo) GetCategoryBySlug(ctx context.Context, slug string) (db.Category, error) {
	return r.q.GetCategoryBySlug(ctx, slug)
}

func (r *storyRepo) AddStoryCategory(ctx context.Context, arg db.AddStoryCategoryParams) error {
	return r.q.AddStoryCategory(ctx, arg)
}

func (r *storyRepo) GetStoryCategories(ctx context.Context, storyID uuid.UUID) ([]db.Category, error) {
	return r.q.GetStoryCategories(ctx, storyID)
}

func (r *storyRepo) UpsertListeningProgress(ctx context.Context, arg db.UpsertListeningProgressParams) error {
	return r.q.UpsertListeningProgress(ctx, arg)
}

func (r *storyRepo) GetStoryIDByChapterID(ctx context.Context, chapterID uuid.UUID) (uuid.UUID, error) {
	ch, err := r.q.GetChapterByID(ctx, chapterID)
	if err != nil {
		return uuid.Nil, err
	}
	return ch.StoryID, nil
}

func (r *storyRepo) GetUserListeningHistory(ctx context.Context, arg db.GetUserListeningHistoryParams) ([]db.GetUserListeningHistoryRow, error) {
	return r.q.GetUserListeningHistory(ctx, arg)
}

func (r *storyRepo) AddFavorite(ctx context.Context, arg db.AddFavoriteParams) error {
	return r.q.AddFavorite(ctx, arg)
}

func (r *storyRepo) RemoveFavorite(ctx context.Context, arg db.RemoveFavoriteParams) error {
	return r.q.RemoveFavorite(ctx, arg)
}

func (r *storyRepo) IsFavorite(ctx context.Context, arg db.IsFavoriteParams) (bool, error) {
	return r.q.IsFavorite(ctx, arg)
}

func (r *storyRepo) GetStoryFavoriteCount(ctx context.Context, storyID uuid.UUID) (int32, error) {
	return r.q.GetStoryFavoriteCount(ctx, storyID)
}

func (r *storyRepo) GetUserFavorites(ctx context.Context, arg db.GetUserFavoritesParams) ([]db.GetUserFavoritesRow, error) {
	return r.q.GetUserFavorites(ctx, arg)
}

func (r *storyRepo) CreateComment(ctx context.Context, arg db.CreateCommentParams) (db.Comment, error) {
	return r.q.CreateComment(ctx, arg)
}

func (r *storyRepo) GetCommentByID(ctx context.Context, id uuid.UUID) (db.GetCommentByIDRow, error) {
	return r.q.GetCommentByID(ctx, id)
}

func (r *storyRepo) GetChapterComments(ctx context.Context, arg db.GetChapterCommentsParams) ([]db.GetChapterCommentsRow, error) {
	return r.q.GetChapterComments(ctx, arg)
}

func (r *storyRepo) GetCommentReplies(ctx context.Context, arg db.GetCommentRepliesParams) ([]db.GetCommentRepliesRow, error) {
	return r.q.GetCommentReplies(ctx, arg)
}

func (r *storyRepo) SoftDeleteComment(ctx context.Context, arg db.SoftDeleteCommentParams) error {
	return r.q.SoftDeleteComment(ctx, arg)
}

func (r *storyRepo) AddCommentReaction(ctx context.Context, arg db.AddCommentReactionParams) (db.CommentReaction, error) {
	return r.q.AddCommentReaction(ctx, arg)
}

func (r *storyRepo) RemoveCommentReaction(ctx context.Context, arg db.RemoveCommentReactionParams) error {
	return r.q.RemoveCommentReaction(ctx, arg)
}

func (r *storyRepo) GetUserCommentReaction(ctx context.Context, arg db.GetUserCommentReactionParams) (string, error) {
	return r.q.GetUserCommentReaction(ctx, arg)
}

func (r *storyRepo) GetCommentReactionCounts(ctx context.Context, commentID uuid.UUID) ([]db.GetCommentReactionCountsRow, error) {
	return r.q.GetCommentReactionCounts(ctx, commentID)
}

func (r *storyRepo) GetMultipleCommentsReactionCounts(ctx context.Context, commentIds []uuid.UUID) ([]db.GetMultipleCommentsReactionCountsRow, error) {
	return r.q.GetMultipleCommentsReactionCounts(ctx, commentIds)
}

func (r *storyRepo) GetMultipleCommentsUserReactions(ctx context.Context, arg db.GetMultipleCommentsUserReactionsParams) ([]db.GetMultipleCommentsUserReactionsRow, error) {
	return r.q.GetMultipleCommentsUserReactions(ctx, arg)
}

func (r *storyRepo) GetRelatedStories(ctx context.Context, arg db.GetRelatedStoriesParams) ([]db.GetRelatedStoriesRow, error) {
	return r.q.GetRelatedStories(ctx, arg)
}

func (r *storyRepo) FollowAuthor(ctx context.Context, arg db.FollowAuthorParams) error {
	return r.q.FollowAuthor(ctx, arg)
}

func (r *storyRepo) UnfollowAuthor(ctx context.Context, arg db.UnfollowAuthorParams) error {
	return r.q.UnfollowAuthor(ctx, arg)
}

func (r *storyRepo) IsFollowingAuthor(ctx context.Context, arg db.IsFollowingAuthorParams) (bool, error) {
	return r.q.IsFollowingAuthor(ctx, arg)
}

func (r *storyRepo) GetFollowedAuthors(ctx context.Context, userID uuid.UUID) ([]db.GetFollowedAuthorsRow, error) {
	return r.q.GetFollowedAuthors(ctx, userID)
}

func (r *storyRepo) FollowNarrator(ctx context.Context, arg db.FollowNarratorParams) error {
	return r.q.FollowNarrator(ctx, arg)
}

func (r *storyRepo) UnfollowNarrator(ctx context.Context, arg db.UnfollowNarratorParams) error {
	return r.q.UnfollowNarrator(ctx, arg)
}

func (r *storyRepo) IsFollowingNarrator(ctx context.Context, arg db.IsFollowingNarratorParams) (bool, error) {
	return r.q.IsFollowingNarrator(ctx, arg)
}

func (r *storyRepo) GetFollowedNarrators(ctx context.Context, userID uuid.UUID) ([]db.GetFollowedNarratorsRow, error) {
	return r.q.GetFollowedNarrators(ctx, userID)
}