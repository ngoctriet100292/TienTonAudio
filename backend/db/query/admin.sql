-- name: GetDashboardStats :one
SELECT 
    (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS total_users,
    (SELECT COUNT(*) FROM stories) AS total_stories,
    (SELECT COUNT(*) FROM chapters) AS total_chapters,
    (SELECT COALESCE(SUM(view_count), 0) FROM stories) AS total_story_views,
    (SELECT COALESCE(SUM(listen_count), 0) FROM chapters) AS total_chapter_listens,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') AS total_revenue;

-- name: ListUsersForAdmin :many
SELECT id, username, email, avatar_url, role, created_at, updated_at
FROM users
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: UpdateUserRole :one
UPDATE users
SET 
    role = $2,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND deleted_at IS NULL
RETURNING id, username, email, avatar_url, role, created_at, updated_at;

-- name: CreateAuthor :one
INSERT INTO authors (name, slug, bio)
VALUES ($1, $2, $3)
RETURNING id, name, slug, bio, created_at;

-- name: ListAuthors :many
SELECT id, name, slug, bio, created_at
FROM authors
ORDER BY name ASC
LIMIT $1 OFFSET $2;

-- name: GetAuthorByID :one
SELECT id, name, slug, bio, created_at
FROM authors
WHERE id = $1;

-- name: UpdateAuthor :one
UPDATE authors
SET 
    name = $2,
    slug = $3,
    bio = $4
WHERE id = $1
RETURNING id, name, slug, bio, created_at;

-- name: DeleteAuthor :exec
DELETE FROM authors
WHERE id = $1;

-- name: CreateNarrator :one
INSERT INTO narrators (name, slug, avatar_url, description)
VALUES ($1, $2, $3, $4)
RETURNING id, name, slug, avatar_url, description, created_at;

-- name: ListNarrators :many
SELECT id, name, slug, avatar_url, description, created_at
FROM narrators
ORDER BY name ASC
LIMIT $1 OFFSET $2;

-- name: GetNarratorByID :one
SELECT id, name, slug, avatar_url, description, created_at
FROM narrators
WHERE id = $1;

-- name: UpdateNarrator :one
UPDATE narrators
SET 
    name = $2,
    slug = $3,
    avatar_url = $4,
    description = $5
WHERE id = $1
RETURNING id, name, slug, avatar_url, description, created_at;

-- name: DeleteNarrator :exec
DELETE FROM narrators
WHERE id = $1;
