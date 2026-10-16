package repository

import (
	"context"
	"fmt"

	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CommunityRepository interface {
	ListPosts(ctx context.Context, currentUserID *uuid.UUID, topic string, page, limit int) ([]domain.CommunityPost, error)
	CreatePost(ctx context.Context, userID uuid.UUID, req domain.CreateCommunityPostReq) (*domain.CommunityPost, error)
	GetPostByID(ctx context.Context, postID uuid.UUID, currentUserID *uuid.UUID) (*domain.CommunityPost, error)
	DeletePost(ctx context.Context, postID, userID uuid.UUID, isAdmin bool) error
	ToggleLike(ctx context.Context, postID, userID uuid.UUID) (*domain.TogglePostLikeResp, error)
	ListComments(ctx context.Context, postID uuid.UUID) ([]domain.CommunityComment, error)
	CreateComment(ctx context.Context, postID, userID uuid.UUID, req domain.CreateCommunityCommentReq) (*domain.CommunityComment, error)
}

type communityRepository struct {
	pool *pgxpool.Pool
}

func NewCommunityRepository(pool *pgxpool.Pool) CommunityRepository {
	return &communityRepository{pool: pool}
}

func (r *communityRepository) ListPosts(ctx context.Context, currentUserID *uuid.UUID, topic string, page, limit int) ([]domain.CommunityPost, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	query := `
		SELECT 
			p.id, p.user_id, p.story_id, p.topic, p.content, p.like_count, p.comment_count, p.created_at, p.updated_at,
			u.username, u.avatar_url, u.role, COALESCE(u.cultivation_exp, 0),
			s.title AS story_title, s.slug AS story_slug, s.cover_image_url AS story_cover_url,
			CASE 
				WHEN $1::uuid IS NOT NULL AND l.user_id IS NOT NULL THEN true 
				ELSE false 
			END AS is_liked
		FROM community_posts p
		JOIN users u ON p.user_id = u.id
		LEFT JOIN stories s ON p.story_id = s.id
		LEFT JOIN community_post_likes l ON p.id = l.post_id AND l.user_id = $1
		WHERE ($2 = '' OR p.topic = $2)
		ORDER BY p.created_at DESC
		LIMIT $3 OFFSET $4
	`

	var uid *uuid.UUID
	if currentUserID != nil && *currentUserID != uuid.Nil {
		uid = currentUserID
	}

	rows, err := r.pool.Query(ctx, query, uid, topic, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list community posts error: %w", err)
	}
	defer rows.Close()

	var posts []domain.CommunityPost
	for rows.Next() {
		var p domain.CommunityPost
		var cultivationExp int64

		err := rows.Scan(
			&p.ID, &p.UserID, &p.StoryID, &p.Topic, &p.Content, &p.LikeCount, &p.CommentCount, &p.CreatedAt, &p.UpdatedAt,
			&p.AuthorName, &p.AuthorAvatar, &p.AuthorRole, &cultivationExp,
			&p.StoryTitle, &p.StorySlug, &p.StoryCoverURL,
			&p.IsLiked,
		)
		if err != nil {
			return nil, fmt.Errorf("scan post error: %w", err)
		}

		p.CultivationRealm, p.CultivationLevel, _, _, p.CultivationColor, _ = domain.CalculateCultivationRealm(cultivationExp)
		posts = append(posts, p)
	}

	return posts, nil
}

func (r *communityRepository) CreatePost(ctx context.Context, userID uuid.UUID, req domain.CreateCommunityPostReq) (*domain.CommunityPost, error) {
	topic := req.Topic
	if topic == "" {
		topic = "luan_dao"
	}

	var postID uuid.UUID
	query := `
		INSERT INTO community_posts (user_id, story_id, topic, content)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`
	err := r.pool.QueryRow(ctx, query, userID, req.StoryID, topic, req.Content).Scan(&postID)
	if err != nil {
		return nil, fmt.Errorf("create community post error: %w", err)
	}

	return r.GetPostByID(ctx, postID, &userID)
}

func (r *communityRepository) GetPostByID(ctx context.Context, postID uuid.UUID, currentUserID *uuid.UUID) (*domain.CommunityPost, error) {
	query := `
		SELECT 
			p.id, p.user_id, p.story_id, p.topic, p.content, p.like_count, p.comment_count, p.created_at, p.updated_at,
			u.username, u.avatar_url, u.role, COALESCE(u.cultivation_exp, 0),
			s.title AS story_title, s.slug AS story_slug, s.cover_image_url AS story_cover_url,
			CASE 
				WHEN $2::uuid IS NOT NULL AND l.user_id IS NOT NULL THEN true 
				ELSE false 
			END AS is_liked
		FROM community_posts p
		JOIN users u ON p.user_id = u.id
		LEFT JOIN stories s ON p.story_id = s.id
		LEFT JOIN community_post_likes l ON p.id = l.post_id AND l.user_id = $2
		WHERE p.id = $1
	`

	var uid *uuid.UUID
	if currentUserID != nil && *currentUserID != uuid.Nil {
		uid = currentUserID
	}

	var p domain.CommunityPost
	var cultivationExp int64

	err := r.pool.QueryRow(ctx, query, postID, uid).Scan(
		&p.ID, &p.UserID, &p.StoryID, &p.Topic, &p.Content, &p.LikeCount, &p.CommentCount, &p.CreatedAt, &p.UpdatedAt,
		&p.AuthorName, &p.AuthorAvatar, &p.AuthorRole, &cultivationExp,
		&p.StoryTitle, &p.StorySlug, &p.StoryCoverURL,
		&p.IsLiked,
	)
	if err != nil {
		return nil, fmt.Errorf("get post by id error: %w", err)
	}

	p.CultivationRealm, p.CultivationLevel, _, _, p.CultivationColor, _ = domain.CalculateCultivationRealm(cultivationExp)
	return &p, nil
}

func (r *communityRepository) DeletePost(ctx context.Context, postID, userID uuid.UUID, isAdmin bool) error {
	var query string
	var err error

	if isAdmin {
		query = `DELETE FROM community_posts WHERE id = $1`
		tag, err := r.pool.Exec(ctx, query, postID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return fmt.Errorf("bài viết không tồn tại")
		}
		return nil
	}

	query = `DELETE FROM community_posts WHERE id = $1 AND user_id = $2`
	tag, err := r.pool.Exec(ctx, query, postID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("không có quyền xóa hoặc bài viết không tồn tại")
	}
	return nil
}

func (r *communityRepository) ToggleLike(ctx context.Context, postID, userID uuid.UUID) (*domain.TogglePostLikeResp, error) {
	var exists bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM community_post_likes WHERE post_id = $1 AND user_id = $2)`
	err := r.pool.QueryRow(ctx, checkQuery, postID, userID).Scan(&exists)
	if err != nil {
		return nil, err
	}

	if exists {
		_, err = r.pool.Exec(ctx, `DELETE FROM community_post_likes WHERE post_id = $1 AND user_id = $2`, postID, userID)
		if err != nil {
			return nil, err
		}
	} else {
		_, err = r.pool.Exec(ctx, `INSERT INTO community_post_likes (post_id, user_id, reaction_type) VALUES ($1, $2, 'like') ON CONFLICT DO NOTHING`, postID, userID)
		if err != nil {
			return nil, err
		}
	}

	var likeCount int
	err = r.pool.QueryRow(ctx, `SELECT like_count FROM community_posts WHERE id = $1`, postID).Scan(&likeCount)
	if err != nil {
		return nil, err
	}

	return &domain.TogglePostLikeResp{
		IsLiked:   !exists,
		LikeCount: likeCount,
	}, nil
}

func (r *communityRepository) ListComments(ctx context.Context, postID uuid.UUID) ([]domain.CommunityComment, error) {
	query := `
		SELECT 
			c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at,
			u.username, u.avatar_url, u.role, COALESCE(u.cultivation_exp, 0)
		FROM community_post_comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.post_id = $1
		ORDER BY c.created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []domain.CommunityComment
	for rows.Next() {
		var c domain.CommunityComment
		var cultivationExp int64

		err := rows.Scan(
			&c.ID, &c.PostID, &c.UserID, &c.ParentID, &c.Content, &c.CreatedAt,
			&c.AuthorName, &c.AuthorAvatar, &c.AuthorRole, &cultivationExp,
		)
		if err != nil {
			return nil, err
		}

		c.CultivationRealm, c.CultivationLevel, _, _, c.CultivationColor, _ = domain.CalculateCultivationRealm(cultivationExp)
		comments = append(comments, c)
	}

	return comments, nil
}

func (r *communityRepository) CreateComment(ctx context.Context, postID, userID uuid.UUID, req domain.CreateCommunityCommentReq) (*domain.CommunityComment, error) {
	var commentID uuid.UUID
	query := `
		INSERT INTO community_post_comments (post_id, user_id, parent_id, content)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`
	err := r.pool.QueryRow(ctx, query, postID, userID, req.ParentID, req.Content).Scan(&commentID)
	if err != nil {
		return nil, fmt.Errorf("create comment error: %w", err)
	}

	singleQuery := `
		SELECT 
			c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at,
			u.username, u.avatar_url, u.role, COALESCE(u.cultivation_exp, 0)
		FROM community_post_comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.id = $1
	`
	var c domain.CommunityComment
	var cultivationExp int64
	err = r.pool.QueryRow(ctx, singleQuery, commentID).Scan(
		&c.ID, &c.PostID, &c.UserID, &c.ParentID, &c.Content, &c.CreatedAt,
		&c.AuthorName, &c.AuthorAvatar, &c.AuthorRole, &cultivationExp,
	)
	if err != nil {
		return nil, err
	}

	c.CultivationRealm, c.CultivationLevel, _, _, c.CultivationColor, _ = domain.CalculateCultivationRealm(cultivationExp)
	return &c, nil
}
