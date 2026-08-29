-- name: AddFavorite :exec
INSERT INTO user_favorites (user_id, story_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: RemoveFavorite :exec
DELETE FROM user_favorites
WHERE user_id = $1 AND story_id = $2;

-- name: IsFavorite :one
SELECT EXISTS (
    SELECT 1 FROM user_favorites
    WHERE user_id = $1 AND story_id = $2
);

-- name: GetStoryFavoriteCount :one
SELECT COUNT(*)::int AS favorite_count
FROM user_favorites
WHERE story_id = $1;


-- name: GetUserFavorites :many
SELECT 
    s.id, s.title, s.slug, s.cover_image_url, s.total_chapters, s.rating_avg, f.created_at AS favorited_at
FROM user_favorites f
JOIN stories s ON f.story_id = s.id
WHERE f.user_id = $1
ORDER BY f.created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpsertReview :one
INSERT INTO reviews (user_id, story_id, rating, content)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id, story_id)
DO UPDATE SET
    rating = EXCLUDED.rating,
    content = EXCLUDED.content
RETURNING id, user_id, story_id, rating, content, created_at;

-- name: GetStoryReviews :many
SELECT 
    r.id, r.user_id, r.story_id, r.rating, r.content, r.created_at,
    u.username, u.avatar_url
FROM reviews r
JOIN users u ON r.user_id = u.id
WHERE r.story_id = $1
ORDER BY r.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CreateComment :one
INSERT INTO comments (user_id, chapter_id, parent_id, content, audio_timestamp_seconds)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, user_id, chapter_id, parent_id, content, audio_timestamp_seconds, is_deleted, created_at, updated_at;

-- name: GetCommentByID :one
SELECT 
    c.id, c.user_id, c.chapter_id, c.parent_id, c.content, c.audio_timestamp_seconds, c.is_deleted, c.created_at, c.updated_at,
    u.username, u.avatar_url,
    (SELECT COUNT(*)::int FROM comments r WHERE r.parent_id = c.id AND r.is_deleted = FALSE) AS reply_count
FROM comments c
JOIN users u ON c.user_id = u.id
WHERE c.id = $1;

-- name: GetChapterComments :many
SELECT 
    c.id, c.user_id, c.chapter_id, c.parent_id, c.content, c.audio_timestamp_seconds, c.is_deleted, c.created_at, c.updated_at,
    u.username, u.avatar_url,
    (SELECT COUNT(*)::int FROM comments r WHERE r.parent_id = c.id AND r.is_deleted = FALSE) AS reply_count
FROM comments c
JOIN users u ON c.user_id = u.id
WHERE c.chapter_id = $1 AND c.parent_id IS NULL AND c.is_deleted = FALSE
ORDER BY c.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetCommentReplies :many
SELECT 
    c.id, c.user_id, c.chapter_id, c.parent_id, c.content, c.audio_timestamp_seconds, c.is_deleted, c.created_at, c.updated_at,
    u.username, u.avatar_url,
    (SELECT COUNT(*)::int FROM comments r WHERE r.parent_id = c.id AND r.is_deleted = FALSE) AS reply_count
FROM comments c
JOIN users u ON c.user_id = u.id
WHERE c.parent_id = $1 AND c.is_deleted = FALSE
ORDER BY c.created_at ASC
LIMIT $2 OFFSET $3;

-- name: SoftDeleteComment :exec
UPDATE comments
SET is_deleted = TRUE
WHERE id = $1 AND user_id = $2;

-- name: AddCommentReaction :one
INSERT INTO comment_reactions (comment_id, user_id, reaction_type)
VALUES ($1, $2, $3)
ON CONFLICT (comment_id, user_id)
DO UPDATE SET reaction_type = EXCLUDED.reaction_type
RETURNING id, comment_id, user_id, reaction_type, created_at;

-- name: RemoveCommentReaction :exec
DELETE FROM comment_reactions
WHERE comment_id = $1 AND user_id = $2;

-- name: GetUserCommentReaction :one
SELECT reaction_type
FROM comment_reactions
WHERE comment_id = $1 AND user_id = $2;

-- name: GetCommentReactionCounts :many
SELECT reaction_type, COUNT(*)::int AS count
FROM comment_reactions
WHERE comment_id = $1
GROUP BY reaction_type;

-- name: GetMultipleCommentsReactionCounts :many
SELECT comment_id, reaction_type, COUNT(*)::int AS count
FROM comment_reactions
WHERE comment_id = ANY($1::uuid[])
GROUP BY comment_id, reaction_type;

-- name: GetMultipleCommentsUserReactions :many
SELECT comment_id, reaction_type
FROM comment_reactions
WHERE comment_id = ANY($1::uuid[]) AND user_id = $2;

-- name: FollowAuthor :exec
INSERT INTO author_follows (user_id, author_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: UnfollowAuthor :exec
DELETE FROM author_follows
WHERE user_id = $1 AND author_id = $2;

-- name: IsFollowingAuthor :one
SELECT EXISTS (
    SELECT 1 FROM author_follows
    WHERE user_id = $1 AND author_id = $2
);

-- name: GetFollowedAuthors :many
SELECT a.id, a.name, a.slug, a.bio, af.created_at AS followed_at
FROM author_follows af
JOIN authors a ON af.author_id = a.id
WHERE af.user_id = $1
ORDER BY af.created_at DESC;

-- name: FollowNarrator :exec
INSERT INTO narrator_follows (user_id, narrator_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: UnfollowNarrator :exec
DELETE FROM narrator_follows
WHERE user_id = $1 AND narrator_id = $2;

-- name: IsFollowingNarrator :one
SELECT EXISTS (
    SELECT 1 FROM narrator_follows
    WHERE user_id = $1 AND narrator_id = $2
);

-- name: GetFollowedNarrators :many
SELECT n.id, n.name, n.slug, n.avatar_url, n.description, nf.created_at AS followed_at
FROM narrator_follows nf
JOIN narrators n ON nf.narrator_id = n.id
WHERE nf.user_id = $1
ORDER BY nf.created_at DESC;



