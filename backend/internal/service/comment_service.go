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

type CommentService interface {
	CreateComment(ctx context.Context, userID uuid.UUID, req domain.CreateCommentReq) (*domain.CommentResp, error)
	ReplyComment(ctx context.Context, userID uuid.UUID, parentCommentID uuid.UUID, req domain.ReplyCommentReq) (*domain.CommentResp, error)
	GetChapterComments(ctx context.Context, chapterID uuid.UUID, currentUserID *uuid.UUID, pagination utils.PaginationParams) ([]domain.CommentResp, error)
	GetCommentReplies(ctx context.Context, parentCommentID uuid.UUID, currentUserID *uuid.UUID, pagination utils.PaginationParams) ([]domain.CommentResp, error)
	DeleteComment(ctx context.Context, userID uuid.UUID, commentID uuid.UUID) error
	ReactToComment(ctx context.Context, userID uuid.UUID, commentID uuid.UUID, req domain.ReactCommentReq) (*domain.ReactCommentResp, error)
}

type commentService struct {
	repo       repository.StoryRepository
	notifyRepo repository.NotificationRepository
}

func NewCommentService(repo repository.StoryRepository, notifyRepo repository.NotificationRepository) CommentService {
	return &commentService{repo: repo, notifyRepo: notifyRepo}
}

var validReactions = map[string]bool{
	"like":  true,
	"love":  true,
	"haha":  true,
	"wow":   true,
	"sad":   true,
	"angry": true,
}

func (s *commentService) CreateComment(ctx context.Context, userID uuid.UUID, req domain.CreateCommentReq) (*domain.CommentResp, error) {
	if req.Content == "" {
		return nil, errors.New("comment content is required")
	}

	var parentUUID uuid.NullUUID
	if req.ParentID != nil {
		parent, err := s.repo.GetCommentByID(ctx, *req.ParentID)
		if err != nil {
			return nil, errors.New("parent comment not found")
		}
		parentUUID = uuid.NullUUID{UUID: parent.ID, Valid: true}
	}

	userUUID := uuid.NullUUID{UUID: userID, Valid: true}
	chapterUUID := uuid.NullUUID{UUID: req.ChapterID, Valid: true}

	comment, err := s.repo.CreateComment(ctx, db.CreateCommentParams{
		UserID:                userUUID,
		ChapterID:             chapterUUID,
		ParentID:              parentUUID,
		Content:               req.Content,
		AudioTimestampSeconds: req.AudioTimestampSeconds,
	})
	if err != nil {
		return nil, fmt.Errorf("create comment error: %w", err)
	}

	var pID *uuid.UUID
	if comment.ParentID.Valid {
		pID = &comment.ParentID.UUID
	}
	var uID *uuid.UUID
	if comment.UserID.Valid {
		uID = &comment.UserID.UUID
	}
	var cID *uuid.UUID
	if comment.ChapterID.Valid {
		cID = &comment.ChapterID.UUID
	}

	isDel := false
	if comment.IsDeleted != nil {
		isDel = *comment.IsDeleted
	}

	return &domain.CommentResp{
		ID:                    comment.ID,
		UserID:                uID,
		Username:              "",
		ChapterID:             cID,
		ParentID:              pID,
		Content:               comment.Content,
		AudioTimestampSeconds: comment.AudioTimestampSeconds,
		IsDeleted:             isDel,
		ReplyCount:            0,
		TotalReactions:        0,
		Reactions:             make(map[string]int),
		CreatedAt:             comment.CreatedAt.Time,
		UpdatedAt:             comment.UpdatedAt.Time,
	}, nil
}

func (s *commentService) ReplyComment(ctx context.Context, userID uuid.UUID, parentCommentID uuid.UUID, req domain.ReplyCommentReq) (*domain.CommentResp, error) {
	parent, err := s.repo.GetCommentByID(ctx, parentCommentID)
	if err != nil {
		return nil, errors.New("parent comment not found")
	}

	if !parent.ChapterID.Valid {
		return nil, errors.New("parent comment is not associated with any chapter")
	}

	replyResp, err := s.CreateComment(ctx, userID, domain.CreateCommentReq{
		ChapterID:             parent.ChapterID.UUID,
		ParentID:              &parentCommentID,
		Content:               req.Content,
		AudioTimestampSeconds: req.AudioTimestampSeconds,
	})
	if err != nil {
		return nil, err
	}

	if s.notifyRepo != nil && parent.UserID.Valid && parent.UserID.UUID != userID {
		msg := req.Content
		if len(msg) > 80 {
			msg = msg[:77] + "..."
		}
		refType := "comment"
		_, _ = s.notifyRepo.CreateNotification(ctx, db.CreateNotificationParams{
			UserID:        parent.UserID.UUID,
			Title:         "Có phản hồi mới cho bình luận của bạn",
			Message:       fmt.Sprintf("Một đạo hữu đã trả lời: \"%s\"", msg),
			Type:          "comment_reply",
			ReferenceID:   uuid.NullUUID{UUID: parent.ID, Valid: true},
			ReferenceType: &refType,
		})
	}

	return replyResp, nil
}

func (s *commentService) GetChapterComments(ctx context.Context, chapterID uuid.UUID, currentUserID *uuid.UUID, pagination utils.PaginationParams) ([]domain.CommentResp, error) {
	rows, err := s.repo.GetChapterComments(ctx, db.GetChapterCommentsParams{
		ChapterID: uuid.NullUUID{UUID: chapterID, Valid: true},
		Limit:     pagination.Limit,
		Offset:    pagination.Offset(),
	})
	if err != nil {
		return nil, fmt.Errorf("get chapter comments error: %w", err)
	}

	if len(rows) == 0 {
		return []domain.CommentResp{}, nil
	}

	commentIDs := make([]uuid.UUID, len(rows))
	for i, r := range rows {
		commentIDs[i] = r.ID
	}

	// Batch fetch reaction counts
	reactionCounts, _ := s.repo.GetMultipleCommentsReactionCounts(ctx, commentIDs)
	reactionMap := make(map[uuid.UUID]map[string]int)
	totalMap := make(map[uuid.UUID]int)
	for _, rc := range reactionCounts {
		if reactionMap[rc.CommentID] == nil {
			reactionMap[rc.CommentID] = make(map[string]int)
		}
		cnt := int(rc.Count)
		reactionMap[rc.CommentID][rc.ReactionType] = cnt
		totalMap[rc.CommentID] += cnt
	}

	// Batch fetch user reactions if authenticated
	userReactionMap := make(map[uuid.UUID]string)
	if currentUserID != nil {
		userReactions, _ := s.repo.GetMultipleCommentsUserReactions(ctx, db.GetMultipleCommentsUserReactionsParams{
			Column1: commentIDs,
			UserID:  *currentUserID,
		})
		for _, ur := range userReactions {
			userReactionMap[ur.CommentID] = ur.ReactionType
		}
	}

	result := make([]domain.CommentResp, len(rows))
	for i, r := range rows {
		var pID *uuid.UUID
		if r.ParentID.Valid {
			pID = &r.ParentID.UUID
		}
		var uID *uuid.UUID
		if r.UserID.Valid {
			uID = &r.UserID.UUID
		}
		var cID *uuid.UUID
		if r.ChapterID.Valid {
			cID = &r.ChapterID.UUID
		}
		isDel := false
		if r.IsDeleted != nil {
			isDel = *r.IsDeleted
		}

		reactions := reactionMap[r.ID]
		if reactions == nil {
			reactions = make(map[string]int)
		}

		var userReact *string
		if ur, ok := userReactionMap[r.ID]; ok {
			userReact = &ur
		}

		result[i] = domain.CommentResp{
			ID:                    r.ID,
			UserID:                uID,
			Username:              r.Username,
			AvatarURL:             r.AvatarUrl,
			ChapterID:             cID,
			ParentID:              pID,
			Content:               r.Content,
			AudioTimestampSeconds: r.AudioTimestampSeconds,
			IsDeleted:             isDel,
			ReplyCount:            int(r.ReplyCount),
			TotalReactions:        totalMap[r.ID],
			Reactions:             reactions,
			UserReaction:          userReact,
			CreatedAt:             r.CreatedAt.Time,
			UpdatedAt:             r.UpdatedAt.Time,
		}
	}

	return result, nil
}

func (s *commentService) GetCommentReplies(ctx context.Context, parentCommentID uuid.UUID, currentUserID *uuid.UUID, pagination utils.PaginationParams) ([]domain.CommentResp, error) {
	rows, err := s.repo.GetCommentReplies(ctx, db.GetCommentRepliesParams{
		ParentID: uuid.NullUUID{UUID: parentCommentID, Valid: true},
		Limit:    pagination.Limit,
		Offset:   pagination.Offset(),
	})
	if err != nil {
		return nil, fmt.Errorf("get comment replies error: %w", err)
	}

	if len(rows) == 0 {
		return []domain.CommentResp{}, nil
	}

	commentIDs := make([]uuid.UUID, len(rows))
	for i, r := range rows {
		commentIDs[i] = r.ID
	}

	reactionCounts, _ := s.repo.GetMultipleCommentsReactionCounts(ctx, commentIDs)
	reactionMap := make(map[uuid.UUID]map[string]int)
	totalMap := make(map[uuid.UUID]int)
	for _, rc := range reactionCounts {
		if reactionMap[rc.CommentID] == nil {
			reactionMap[rc.CommentID] = make(map[string]int)
		}
		cnt := int(rc.Count)
		reactionMap[rc.CommentID][rc.ReactionType] = cnt
		totalMap[rc.CommentID] += cnt
	}

	userReactionMap := make(map[uuid.UUID]string)
	if currentUserID != nil {
		userReactions, _ := s.repo.GetMultipleCommentsUserReactions(ctx, db.GetMultipleCommentsUserReactionsParams{
			Column1: commentIDs,
			UserID:  *currentUserID,
		})
		for _, ur := range userReactions {
			userReactionMap[ur.CommentID] = ur.ReactionType
		}
	}

	result := make([]domain.CommentResp, len(rows))
	for i, r := range rows {
		var pID *uuid.UUID
		if r.ParentID.Valid {
			pID = &r.ParentID.UUID
		}
		var uID *uuid.UUID
		if r.UserID.Valid {
			uID = &r.UserID.UUID
		}
		var cID *uuid.UUID
		if r.ChapterID.Valid {
			cID = &r.ChapterID.UUID
		}
		isDel := false
		if r.IsDeleted != nil {
			isDel = *r.IsDeleted
		}

		reactions := reactionMap[r.ID]
		if reactions == nil {
			reactions = make(map[string]int)
		}

		var userReact *string
		if ur, ok := userReactionMap[r.ID]; ok {
			userReact = &ur
		}

		result[i] = domain.CommentResp{
			ID:                    r.ID,
			UserID:                uID,
			Username:              r.Username,
			AvatarURL:             r.AvatarUrl,
			ChapterID:             cID,
			ParentID:              pID,
			Content:               r.Content,
			AudioTimestampSeconds: r.AudioTimestampSeconds,
			IsDeleted:             isDel,
			ReplyCount:            int(r.ReplyCount),
			TotalReactions:        totalMap[r.ID],
			Reactions:             reactions,
			UserReaction:          userReact,
			CreatedAt:             r.CreatedAt.Time,
			UpdatedAt:             r.UpdatedAt.Time,
		}
	}

	return result, nil
}

func (s *commentService) DeleteComment(ctx context.Context, userID uuid.UUID, commentID uuid.UUID) error {
	return s.repo.SoftDeleteComment(ctx, db.SoftDeleteCommentParams{
		ID:     commentID,
		UserID: uuid.NullUUID{UUID: userID, Valid: true},
	})
}

func (s *commentService) ReactToComment(ctx context.Context, userID uuid.UUID, commentID uuid.UUID, req domain.ReactCommentReq) (*domain.ReactCommentResp, error) {
	if !validReactions[req.ReactionType] {
		return nil, fmt.Errorf("invalid reaction type: %s (supported: like, love, haha, wow, sad, angry)", req.ReactionType)
	}

	// Kiểm tra comment có tồn tại không
	if _, err := s.repo.GetCommentByID(ctx, commentID); err != nil {
		return nil, errors.New("comment not found")
	}

	currentReaction, _ := s.repo.GetUserCommentReaction(ctx, db.GetUserCommentReactionParams{
		CommentID: commentID,
		UserID:    userID,
	})

	action := "added"
	var finalReaction *string

	if currentReaction == req.ReactionType {
		// Bấm lại cùng reaction -> xóa (toggle off)
		_ = s.repo.RemoveCommentReaction(ctx, db.RemoveCommentReactionParams{
			CommentID: commentID,
			UserID:    userID,
		})
		action = "removed"
		finalReaction = nil
	} else {
		// Thêm mới hoặc thay đổi sang reaction khác
		if currentReaction != "" {
			action = "updated"
		}
		_, err := s.repo.AddCommentReaction(ctx, db.AddCommentReactionParams{
			CommentID:    commentID,
			UserID:       userID,
			ReactionType: req.ReactionType,
		})
		if err != nil {
			return nil, fmt.Errorf("save reaction error: %w", err)
		}
		finalReaction = &req.ReactionType
	}

	// Lấy lại danh sách thống kê mới nhất
	counts, _ := s.repo.GetCommentReactionCounts(ctx, commentID)
	reactionMap := make(map[string]int)
	total := 0
	for _, c := range counts {
		cnt := int(c.Count)
		reactionMap[c.ReactionType] = cnt
		total += cnt
	}

	return &domain.ReactCommentResp{
		Action:         action,
		ReactionType:   finalReaction,
		TotalReactions: total,
		Reactions:      reactionMap,
	}, nil
}
