-- name: CreateStory :one
INSERT INTO stories (
    title,
    slug,
    description,
    cover_image_url,
    author_id,
    status
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING id, title, slug, description, cover_image_url, author_id, status, view_count, total_chapters, rating_avg, rating_count, created_at, updated_at;

-- name: GetStoryByID :one
SELECT 
    s.id, s.title, s.slug, s.description, s.cover_image_url, s.author_id, s.status,
    s.view_count, s.total_chapters, s.rating_avg, s.rating_count, s.created_at, s.updated_at,
    a.name AS author_name
FROM stories s
LEFT JOIN authors a ON s.author_id = a.id
WHERE s.id = $1;

-- name: GetStoryBySlug :one
SELECT 
    s.id, s.title, s.slug, s.description, s.cover_image_url, s.author_id, s.status,
    s.view_count, s.total_chapters, s.rating_avg, s.rating_count, s.created_at, s.updated_at,
    a.name AS author_name
FROM stories s
LEFT JOIN authors a ON s.author_id = a.id
WHERE s.slug = $1;

-- name: ListStories :many
SELECT 
    s.id, s.title, s.slug, s.description, s.cover_image_url, s.author_id, s.status,
    s.view_count, s.total_chapters, s.rating_avg, s.rating_count, s.created_at, s.updated_at,
    a.name AS author_name
FROM stories s
LEFT JOIN authors a ON s.author_id = a.id
ORDER BY s.updated_at DESC
LIMIT $1 OFFSET $2;

-- name: ListTopViewedStories :many
SELECT 
    s.id, s.title, s.slug, s.description, s.cover_image_url, s.author_id, s.status,
    s.view_count, s.total_chapters, s.rating_avg, s.rating_count, s.created_at, s.updated_at,
    a.name AS author_name
FROM stories s
LEFT JOIN authors a ON s.author_id = a.id
ORDER BY s.view_count DESC, s.updated_at DESC
LIMIT $1 OFFSET $2;


-- name: AdvancedSearchStories :many
SELECT 
    s.id, s.title, s.slug, s.description, s.cover_image_url, s.author_id, s.status,
    s.view_count, s.total_chapters, s.rating_avg, s.rating_count, s.created_at, s.updated_at,
    a.name AS author_name
FROM stories s
LEFT JOIN authors a ON s.author_id = a.id
WHERE 
    ($1::text IS NULL OR s.title ILIKE '%' || $1 || '%' OR a.name ILIKE '%' || $1 || '%')
    AND ($2::int IS NULL OR EXISTS (SELECT 1 FROM story_categories sc WHERE sc.story_id = s.id AND sc.category_id = $2))
    AND ($3::text IS NULL OR s.status = $3)
ORDER BY s.view_count DESC
LIMIT $4 OFFSET $5;

-- name: UpdateStory :one
UPDATE stories
SET 
    title = $2,
    slug = $3,
    description = $4,
    cover_image_url = $5,
    author_id = $6,
    status = $7,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING id, title, slug, description, cover_image_url, author_id, status, view_count, total_chapters, rating_avg, rating_count, created_at, updated_at;

-- name: DeleteStory :exec
DELETE FROM stories
WHERE id = $1;

-- name: UpsertListeningProgress :exec
INSERT INTO listening_history (
    user_id,
    chapter_id,
    story_id,
    last_position_seconds,
    playback_speed,
    is_completed,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP
)
ON CONFLICT (user_id, chapter_id)
DO UPDATE SET
    last_position_seconds = EXCLUDED.last_position_seconds,
    playback_speed = EXCLUDED.playback_speed,
    is_completed = EXCLUDED.is_completed,
    updated_at = CURRENT_TIMESTAMP;

-- name: GetUserListeningHistory :many
SELECT 
    h.chapter_id,
    h.story_id,
    h.last_position_seconds,
    h.playback_speed,
    h.is_completed,
    h.updated_at,
    c.title AS chapter_title,
    c.chapter_number,
    c.duration_seconds,
    s.title AS story_title,
    s.cover_image_url
FROM listening_history h
JOIN chapters c ON h.chapter_id = c.id
JOIN stories s ON h.story_id = s.id
WHERE h.user_id = $1
ORDER BY h.updated_at DESC
LIMIT $2 OFFSET $3;

-- name: GetStoryWithChapters :many
SELECT 
    c.id AS chapter_id,
    c.story_id,
    c.chapter_number,
    c.title AS chapter_title,
    c.duration_seconds,
    c.waveform_data,
    c.listen_count,
    c.is_premium,
    n.name AS narrator_name
FROM chapters c
LEFT JOIN narrators n ON c.narrator_id = n.id
WHERE c.story_id = $1
ORDER BY c.chapter_number ASC;

-- name: SearchStoriesByTitle :many
SELECT 
    id,
    title,
    slug,
    cover_image_url,
    total_chapters,
    view_count,
    rating_avg
FROM stories
WHERE title ILIKE '%' || $1 || '%'
ORDER BY view_count DESC
LIMIT $2 OFFSET $3;

-- name: IncrementChapterListenCount :exec
UPDATE chapters
SET listen_count = listen_count + 1
WHERE id = $1;

-- name: IncrementStoryViewCount :exec
UPDATE stories
SET view_count = view_count + 1
WHERE id = $1;

-- name: ListCategories :many
SELECT id, name, slug, description
FROM categories
ORDER BY name ASC;

-- name: GetCategoryBySlug :one
SELECT id, name, slug, description
FROM categories
WHERE slug = $1;

-- name: CreateCategory :one
INSERT INTO categories (name, slug, description)
VALUES ($1, $2, $3)
RETURNING id, name, slug, description;

-- name: AddStoryCategory :exec
INSERT INTO story_categories (story_id, category_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: GetStoryCategories :many
SELECT c.id, c.name, c.slug, c.description
FROM categories c
JOIN story_categories sc ON c.id = sc.category_id
WHERE sc.story_id = $1;

-- name: GetRelatedStories :many
SELECT DISTINCT 
    s.id, s.title, s.slug, s.description, s.cover_image_url, s.author_id, s.status,
    s.view_count, s.total_chapters, s.rating_avg, s.rating_count, s.created_at, s.updated_at,
    a.name AS author_name
FROM stories s
LEFT JOIN authors a ON s.author_id = a.id
WHERE s.id != $1
  AND (
    s.author_id = (SELECT author_id FROM stories WHERE id = $1)
    OR EXISTS (
        SELECT 1 FROM story_categories sc1
        JOIN story_categories sc2 ON sc1.category_id = sc2.category_id
        WHERE sc1.story_id = $1 AND sc2.story_id = s.id
    )
  )
ORDER BY s.rating_avg DESC NULLS LAST, s.view_count DESC NULLS LAST
LIMIT $2;