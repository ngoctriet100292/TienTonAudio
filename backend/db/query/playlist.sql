-- name: CreatePlaylist :one
INSERT INTO playlists (
    user_id,
    name,
    is_public
) VALUES (
    $1, $2, $3
)
RETURNING id, user_id, name, is_public, created_at, updated_at;

-- name: GetPlaylistByID :one
SELECT id, user_id, name, is_public, created_at, updated_at
FROM playlists
WHERE id = $1;

-- name: ListUserPlaylists :many
SELECT 
    p.id, 
    p.user_id, 
    p.name, 
    p.is_public, 
    p.created_at, 
    p.updated_at,
    COUNT(pi.chapter_id)::int AS total_items
FROM playlists p
LEFT JOIN playlist_items pi ON p.id = pi.playlist_id
WHERE p.user_id = $1
GROUP BY p.id
ORDER BY p.updated_at DESC;

-- name: UpdatePlaylist :one
UPDATE playlists
SET 
    name = COALESCE($2, name),
    is_public = COALESCE($3, is_public),
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $4
RETURNING id, user_id, name, is_public, created_at, updated_at;

-- name: DeletePlaylist :exec
DELETE FROM playlists
WHERE id = $1 AND user_id = $2;

-- name: AddPlaylistItem :one
INSERT INTO playlist_items (
    playlist_id,
    chapter_id,
    position
) VALUES (
    $1,
    $2,
    COALESCE(
        (SELECT MAX(position) + 1 FROM playlist_items WHERE playlist_id = $1),
        1
    )
)
ON CONFLICT (playlist_id, chapter_id) DO NOTHING
RETURNING playlist_id, chapter_id, position, added_at;

-- name: RemovePlaylistItem :exec
DELETE FROM playlist_items
WHERE playlist_id = $1 AND chapter_id = $2;

-- name: GetPlaylistItemsWithDetails :many
SELECT 
    pi.playlist_id, 
    pi.chapter_id, 
    pi.position, 
    pi.added_at,
    c.title AS chapter_title, 
    c.chapter_number, 
    c.duration_seconds, 
    c.listen_count, 
    c.is_premium,
    s.id AS story_id, 
    s.title AS story_title, 
    s.cover_image_url
FROM playlist_items pi
JOIN chapters c ON pi.chapter_id = c.id
JOIN stories s ON c.story_id = s.id
WHERE pi.playlist_id = $1
ORDER BY pi.position ASC;
