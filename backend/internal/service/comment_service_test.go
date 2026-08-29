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

type mockCommentRepo struct {
	mockStoryRepo
	comments  map[uuid.UUID]db.Comment
	reactions map[uuid.UUID]map[uuid.UUID]string // commentID -> userID -> reaction_type
}

func newMockCommentRepo() *mockCommentRepo {
	return &mockCommentRepo{
		mockStoryRepo: *newMockStoryRepo(),
		comments:      make(map[uuid.UUID]db.Comment),
		reactions:     make(map[uuid.UUID]map[uuid.UUID]string),
	}
}

func (m *mockCommentRepo) CreateComment(ctx context.Context, arg db.CreateCommentParams) (db.Comment, error) {
	id := uuid.New()
	isDel := false
	c := db.Comment{
		ID:                    id,
		UserID:                arg.UserID,
		ChapterID:             arg.ChapterID,
		ParentID:              arg.ParentID,
		Content:               arg.Content,
		AudioTimestampSeconds: arg.AudioTimestampSeconds,
		IsDeleted:             &isDel,
		CreatedAt:             pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt:             pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	m.comments[id] = c
	return c, nil
}

func (m *mockCommentRepo) GetCommentByID(ctx context.Context, id uuid.UUID) (db.GetCommentByIDRow, error) {
	c, ok := m.comments[id]
	if !ok {
		return db.GetCommentByIDRow{}, errors.New("comment not found")
	}

	replyCount := int32(0)
	for _, other := range m.comments {
		if other.ParentID.Valid && other.ParentID.UUID == c.ID && (other.IsDeleted == nil || !*other.IsDeleted) {
			replyCount++
		}
	}

	return db.GetCommentByIDRow{
		ID:                    c.ID,
		UserID:                c.UserID,
		ChapterID:             c.ChapterID,
		ParentID:              c.ParentID,
		Content:               c.Content,
		AudioTimestampSeconds: c.AudioTimestampSeconds,
		IsDeleted:             c.IsDeleted,
		CreatedAt:             c.CreatedAt,
		UpdatedAt:             c.UpdatedAt,
		Username:              "user_test",
		ReplyCount:            replyCount,
	}, nil
}

func (m *mockCommentRepo) GetChapterComments(ctx context.Context, arg db.GetChapterCommentsParams) ([]db.GetChapterCommentsRow, error) {
	var rows []db.GetChapterCommentsRow
	for _, c := range m.comments {
		if c.ChapterID.Valid && arg.ChapterID.Valid && c.ChapterID.UUID == arg.ChapterID.UUID {
			if !c.ParentID.Valid && (c.IsDeleted == nil || !*c.IsDeleted) {
				replyCount := int32(0)
				for _, r := range m.comments {
					if r.ParentID.Valid && r.ParentID.UUID == c.ID && (r.IsDeleted == nil || !*r.IsDeleted) {
						replyCount++
					}
				}
				rows = append(rows, db.GetChapterCommentsRow{
					ID:                    c.ID,
					UserID:                c.UserID,
					ChapterID:             c.ChapterID,
					ParentID:              c.ParentID,
					Content:               c.Content,
					AudioTimestampSeconds: c.AudioTimestampSeconds,
					IsDeleted:             c.IsDeleted,
					CreatedAt:             c.CreatedAt,
					UpdatedAt:             c.UpdatedAt,
					Username:              "user_test",
					ReplyCount:            replyCount,
				})
			}
		}
	}
	return rows, nil
}

func (m *mockCommentRepo) GetCommentReplies(ctx context.Context, arg db.GetCommentRepliesParams) ([]db.GetCommentRepliesRow, error) {
	var rows []db.GetCommentRepliesRow
	for _, c := range m.comments {
		if c.ParentID.Valid && arg.ParentID.Valid && c.ParentID.UUID == arg.ParentID.UUID && (c.IsDeleted == nil || !*c.IsDeleted) {
			rows = append(rows, db.GetCommentRepliesRow{
				ID:                    c.ID,
				UserID:                c.UserID,
				ChapterID:             c.ChapterID,
				ParentID:              c.ParentID,
				Content:               c.Content,
				AudioTimestampSeconds: c.AudioTimestampSeconds,
				IsDeleted:             c.IsDeleted,
				CreatedAt:             c.CreatedAt,
				UpdatedAt:             c.UpdatedAt,
				Username:              "replier_test",
			})
		}
	}
	return rows, nil
}

func (m *mockCommentRepo) SoftDeleteComment(ctx context.Context, arg db.SoftDeleteCommentParams) error {
	c, ok := m.comments[arg.ID]
	if !ok {
		return errors.New("comment not found")
	}
	t := true
	c.IsDeleted = &t
	m.comments[arg.ID] = c
	return nil
}

func (m *mockCommentRepo) AddCommentReaction(ctx context.Context, arg db.AddCommentReactionParams) (db.CommentReaction, error) {
	if m.reactions[arg.CommentID] == nil {
		m.reactions[arg.CommentID] = make(map[uuid.UUID]string)
	}
	m.reactions[arg.CommentID][arg.UserID] = arg.ReactionType
	return db.CommentReaction{
		ID:           uuid.New(),
		CommentID:    arg.CommentID,
		UserID:       arg.UserID,
		ReactionType: arg.ReactionType,
		CreatedAt:    pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}, nil
}

func (m *mockCommentRepo) RemoveCommentReaction(ctx context.Context, arg db.RemoveCommentReactionParams) error {
	if m.reactions[arg.CommentID] != nil {
		delete(m.reactions[arg.CommentID], arg.UserID)
	}
	return nil
}

func (m *mockCommentRepo) GetUserCommentReaction(ctx context.Context, arg db.GetUserCommentReactionParams) (string, error) {
	if m.reactions[arg.CommentID] != nil {
		if r, ok := m.reactions[arg.CommentID][arg.UserID]; ok {
			return r, nil
		}
	}
	return "", errors.New("no reaction")
}

func (m *mockCommentRepo) GetCommentReactionCounts(ctx context.Context, commentID uuid.UUID) ([]db.GetCommentReactionCountsRow, error) {
	typeMap := make(map[string]int32)
	if m.reactions[commentID] != nil {
		for _, r := range m.reactions[commentID] {
			typeMap[r]++
		}
	}
	var res []db.GetCommentReactionCountsRow
	for t, cnt := range typeMap {
		res = append(res, db.GetCommentReactionCountsRow{
			ReactionType: t,
			Count:        cnt,
		})
	}
	return res, nil
}

func (m *mockCommentRepo) GetMultipleCommentsReactionCounts(ctx context.Context, commentIds []uuid.UUID) ([]db.GetMultipleCommentsReactionCountsRow, error) {
	var res []db.GetMultipleCommentsReactionCountsRow
	for _, cID := range commentIds {
		counts, _ := m.GetCommentReactionCounts(ctx, cID)
		for _, cnt := range counts {
			res = append(res, db.GetMultipleCommentsReactionCountsRow{
				CommentID:    cID,
				ReactionType: cnt.ReactionType,
				Count:        cnt.Count,
			})
		}
	}
	return res, nil
}

func (m *mockCommentRepo) GetMultipleCommentsUserReactions(ctx context.Context, arg db.GetMultipleCommentsUserReactionsParams) ([]db.GetMultipleCommentsUserReactionsRow, error) {
	var res []db.GetMultipleCommentsUserReactionsRow
	for _, cID := range arg.Column1 {
		if m.reactions[cID] != nil {
			if r, ok := m.reactions[cID][arg.UserID]; ok {
				res = append(res, db.GetMultipleCommentsUserReactionsRow{
					CommentID:    cID,
					ReactionType: r,
				})
			}
		}
	}
	return res, nil
}

func TestCommentService_ThreadedReplies(t *testing.T) {
	repo := newMockCommentRepo()
	svc := NewCommentService(repo, nil)
	ctx := context.Background()

	chapterID := uuid.New()
	user1 := uuid.New()
	user2 := uuid.New()

	// 1. User 1 đăng bình luận gốc
	rootComment, err := svc.CreateComment(ctx, user1, domain.CreateCommentReq{
		ChapterID: chapterID,
		Content:   "Tập này giọng đọc truyền cảm quá!",
	})
	if err != nil {
		t.Fatalf("failed to create root comment: %v", err)
	}

	// 2. User 2 trả lời bình luận của User 1
	reply1, err := svc.ReplyComment(ctx, user2, rootComment.ID, domain.ReplyCommentReq{
		Content: "Đúng vậy, đoạn cao trào nghe sởn cả da gà!",
	})
	if err != nil {
		t.Fatalf("failed to reply to comment: %v", err)
	}
	if reply1.ParentID == nil || *reply1.ParentID != rootComment.ID {
		t.Fatalf("expected parent_id to be %s, got %v", rootComment.ID, reply1.ParentID)
	}

	// User 1 trả lời tiếp
	_, err = svc.ReplyComment(ctx, user1, rootComment.ID, domain.ReplyCommentReq{
		Content: "Chuẩn luôn đạo hữu ơi!",
	})
	if err != nil {
		t.Fatalf("failed to reply 2: %v", err)
	}

	// 3. Lấy danh sách bình luận của chapter -> comment gốc phải có reply_count = 2
	comments, err := svc.GetChapterComments(ctx, chapterID, &user1, utils.PaginationParams{Limit: 10, Page: 1})
	if err != nil {
		t.Fatalf("failed to get chapter comments: %v", err)
	}
	if len(comments) != 1 {
		t.Fatalf("expected 1 root comment, got %d", len(comments))
	}
	if comments[0].ReplyCount != 2 {
		t.Fatalf("expected reply_count = 2, got %d", comments[0].ReplyCount)
	}

	// 4. Lấy danh sách các câu trả lời của bình luận gốc
	replies, err := svc.GetCommentReplies(ctx, rootComment.ID, &user1, utils.PaginationParams{Limit: 10, Page: 1})
	if err != nil {
		t.Fatalf("failed to get comment replies: %v", err)
	}
	if len(replies) != 2 {
		t.Fatalf("expected 2 replies, got %d", len(replies))
	}
}

func TestCommentService_Reactions(t *testing.T) {
	repo := newMockCommentRepo()
	svc := NewCommentService(repo, nil)
	ctx := context.Background()

	chapterID := uuid.New()
	user1 := uuid.New()
	user2 := uuid.New()

	comment, err := svc.CreateComment(ctx, user1, domain.CreateCommentReq{
		ChapterID: chapterID,
		Content:   "Truyện đỉnh nóc kịch trần!",
	})
	if err != nil {
		t.Fatalf("failed to create comment: %v", err)
	}

	// 1. User 1 thả tim (love)
	reactResp, err := svc.ReactToComment(ctx, user1, comment.ID, domain.ReactCommentReq{
		ReactionType: "love",
	})
	if err != nil {
		t.Fatalf("react error: %v", err)
	}
	if reactResp.Action != "added" || *reactResp.ReactionType != "love" || reactResp.TotalReactions != 1 {
		t.Fatalf("unexpected react response: %+v", reactResp)
	}

	// 2. User 2 thả haha
	reactResp2, err := svc.ReactToComment(ctx, user2, comment.ID, domain.ReactCommentReq{
		ReactionType: "haha",
	})
	if err != nil {
		t.Fatalf("react 2 error: %v", err)
	}
	if reactResp2.Action != "added" || reactResp2.TotalReactions != 2 {
		t.Fatalf("unexpected react 2 response: %+v", reactResp2)
	}

	// 3. User 1 đổi từ love sang like
	reactResp3, err := svc.ReactToComment(ctx, user1, comment.ID, domain.ReactCommentReq{
		ReactionType: "like",
	})
	if err != nil {
		t.Fatalf("switch react error: %v", err)
	}
	if reactResp3.Action != "updated" || *reactResp3.ReactionType != "like" || reactResp3.TotalReactions != 2 {
		t.Fatalf("unexpected switch react response: %+v", reactResp3)
	}

	// 4. User 1 bấm lại like -> Hủy reaction (toggle off)
	reactResp4, err := svc.ReactToComment(ctx, user1, comment.ID, domain.ReactCommentReq{
		ReactionType: "like",
	})
	if err != nil {
		t.Fatalf("remove react error: %v", err)
	}
	if reactResp4.Action != "removed" || reactResp4.ReactionType != nil || reactResp4.TotalReactions != 1 {
		t.Fatalf("unexpected remove react response: %+v", reactResp4)
	}

	// 5. Kiểm tra danh sách comment có hiển thị thống kê reactions và user_reaction đúng không
	comments, err := svc.GetChapterComments(ctx, chapterID, &user2, utils.PaginationParams{Limit: 10, Page: 1})
	if err != nil {
		t.Fatalf("failed to get comments: %v", err)
	}
	if comments[0].TotalReactions != 1 {
		t.Fatalf("expected 1 total reaction, got %d", comments[0].TotalReactions)
	}
	if comments[0].UserReaction == nil || *comments[0].UserReaction != "haha" {
		t.Fatalf("expected user2 reaction to be 'haha', got %v", comments[0].UserReaction)
	}
}
