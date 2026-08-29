package repository

import (
	"context"

	"github.com/google/uuid"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
)

type ChapterRepository interface {
	CreateChapter(ctx context.Context, arg db.CreateChapterParams) (db.Chapter, error)
	GetChapterByID(ctx context.Context, id uuid.UUID) (db.GetChapterByIDRow, error)
	GetChapterByNumber(ctx context.Context, arg db.GetChapterByNumberParams) (db.GetChapterByNumberRow, error)
	ListChaptersByStory(ctx context.Context, storyID uuid.UUID) ([]db.ListChaptersByStoryRow, error)
	UpdateChapter(ctx context.Context, arg db.UpdateChapterParams) (db.Chapter, error)
	DeleteChapter(ctx context.Context, id uuid.UUID) error
	IncrementChapterListenCount(ctx context.Context, id uuid.UUID) error
	AddChapterAudioFile(ctx context.Context, arg db.AddChapterAudioFileParams) (db.ChapterAudioFile, error)
	GetChapterAudioFiles(ctx context.Context, chapterID uuid.UUID) ([]db.ChapterAudioFile, error)
}

type chapterRepo struct {
	q db.Querier
}

func NewChapterRepository(q db.Querier) ChapterRepository {
	return &chapterRepo{q: q}
}

func (r *chapterRepo) CreateChapter(ctx context.Context, arg db.CreateChapterParams) (db.Chapter, error) {
	return r.q.CreateChapter(ctx, arg)
}

func (r *chapterRepo) GetChapterByID(ctx context.Context, id uuid.UUID) (db.GetChapterByIDRow, error) {
	return r.q.GetChapterByID(ctx, id)
}

func (r *chapterRepo) GetChapterByNumber(ctx context.Context, arg db.GetChapterByNumberParams) (db.GetChapterByNumberRow, error) {
	return r.q.GetChapterByNumber(ctx, arg)
}

func (r *chapterRepo) ListChaptersByStory(ctx context.Context, storyID uuid.UUID) ([]db.ListChaptersByStoryRow, error) {
	return r.q.ListChaptersByStory(ctx, storyID)
}

func (r *chapterRepo) UpdateChapter(ctx context.Context, arg db.UpdateChapterParams) (db.Chapter, error) {
	return r.q.UpdateChapter(ctx, arg)
}

func (r *chapterRepo) DeleteChapter(ctx context.Context, id uuid.UUID) error {
	return r.q.DeleteChapter(ctx, id)
}

func (r *chapterRepo) IncrementChapterListenCount(ctx context.Context, id uuid.UUID) error {
	return r.q.IncrementChapterListenCount(ctx, id)
}

func (r *chapterRepo) AddChapterAudioFile(ctx context.Context, arg db.AddChapterAudioFileParams) (db.ChapterAudioFile, error) {
	return r.q.AddChapterAudioFile(ctx, arg)
}

func (r *chapterRepo) GetChapterAudioFiles(ctx context.Context, chapterID uuid.UUID) ([]db.ChapterAudioFile, error) {
	return r.q.GetChapterAudioFiles(ctx, chapterID)
}