package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
)

type CommunityService interface {
	ListPosts(ctx context.Context, currentUserID *uuid.UUID, topic string, page, limit int) ([]domain.CommunityPost, error)
	CreatePost(ctx context.Context, userID uuid.UUID, req domain.CreateCommunityPostReq) (*domain.CommunityPost, error)
	GetPostByID(ctx context.Context, postID uuid.UUID, currentUserID *uuid.UUID) (*domain.CommunityPost, error)
	DeletePost(ctx context.Context, postID, userID uuid.UUID, isAdmin bool) error
	ToggleLike(ctx context.Context, postID, userID uuid.UUID) (*domain.TogglePostLikeResp, error)
	ListComments(ctx context.Context, postID uuid.UUID) ([]domain.CommunityComment, error)
	CreateComment(ctx context.Context, postID, userID uuid.UUID, req domain.CreateCommunityCommentReq) (*domain.CommunityComment, error)
}

type communityService struct {
	communityRepo repository.CommunityRepository
	userRepo      repository.UserRepository
}

func NewCommunityService(communityRepo repository.CommunityRepository, userRepo repository.UserRepository) CommunityService {
	return &communityService{
		communityRepo: communityRepo,
		userRepo:      userRepo,
	}
}

func (s *communityService) addExp(ctx context.Context, userID uuid.UUID, exp int64) {
	if s.userRepo == nil {
		return
	}
	userCult, err := s.userRepo.GetUserCultivation(ctx, userID)
	if err != nil {
		return
	}
	var currExp int64
	if userCult.CultivationExp != nil {
		currExp = *userCult.CultivationExp
	}
	newExp := currExp + exp
	calcRealm, _, _, _, _, _ := domain.CalculateCultivationRealm(newExp)
	_, _ = s.userRepo.AddUserCultivationExp(ctx, db.AddUserCultivationExpParams{
		ID:               userID,
		CultivationExp:   &exp,
		CultivationRealm: &calcRealm,
	})
}

func (s *communityService) ListPosts(ctx context.Context, currentUserID *uuid.UUID, topic string, page, limit int) ([]domain.CommunityPost, error) {
	return s.communityRepo.ListPosts(ctx, currentUserID, topic, page, limit)
}

func (s *communityService) CreatePost(ctx context.Context, userID uuid.UUID, req domain.CreateCommunityPostReq) (*domain.CommunityPost, error) {
	if len(req.Content) < 5 {
		return nil, fmt.Errorf("nội dung luận đạo tối thiểu 5 ký tự")
	}

	post, err := s.communityRepo.CreatePost(ctx, userID, req)
	if err != nil {
		return nil, err
	}

	// Thưởng +50 EXP Tu Vi khi phát đàn luận đạo
	s.addExp(ctx, userID, 50)

	return post, nil
}

func (s *communityService) GetPostByID(ctx context.Context, postID uuid.UUID, currentUserID *uuid.UUID) (*domain.CommunityPost, error) {
	return s.communityRepo.GetPostByID(ctx, postID, currentUserID)
}

func (s *communityService) DeletePost(ctx context.Context, postID, userID uuid.UUID, isAdmin bool) error {
	return s.communityRepo.DeletePost(ctx, postID, userID, isAdmin)
}

func (s *communityService) ToggleLike(ctx context.Context, postID, userID uuid.UUID) (*domain.TogglePostLikeResp, error) {
	return s.communityRepo.ToggleLike(ctx, postID, userID)
}

func (s *communityService) ListComments(ctx context.Context, postID uuid.UUID) ([]domain.CommunityComment, error) {
	return s.communityRepo.ListComments(ctx, postID)
}

func (s *communityService) CreateComment(ctx context.Context, postID, userID uuid.UUID, req domain.CreateCommunityCommentReq) (*domain.CommunityComment, error) {
	if req.Content == "" {
		return nil, fmt.Errorf("nội dung bình luận không được để trống")
	}

	comment, err := s.communityRepo.CreateComment(ctx, postID, userID, req)
	if err != nil {
		return nil, err
	}

	// Thưởng +10 EXP Tu Vi khi tham gia đàm đạo
	s.addExp(ctx, userID, 10)

	return comment, nil
}
