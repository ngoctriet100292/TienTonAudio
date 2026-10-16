-- name: CreateChapter :one
INSERT INTO chapters (
    story_id,
    narrator_id,
    chapter_number,
    title,
    content,
    content_url,
    is_premium,
    duration_seconds,
    waveform_data,
    timeline_markers, publication_status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
)
RETURNING id, story_id, narrator_id, chapter_number, title, content, content_url, is_premium, duration_seconds, waveform_data, timeline_markers, listen_count, created_at, updated_at, publication_status, scheduled_at, review_reason, edit_version;

-- name: UpsertChapter :one
INSERT INTO chapters (
    story_id,
    narrator_id,
    chapter_number,
    title,
    content,
    content_url,
    is_premium,
    duration_seconds,
    waveform_data,
    timeline_markers, publication_status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
)
ON CONFLICT (story_id, chapter_number) DO UPDATE
SET 
    publication_status=EXCLUDED.publication_status,
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    content_url = COALESCE(EXCLUDED.content_url, chapters.content_url),
    is_premium = COALESCE(EXCLUDED.is_premium, chapters.is_premium),
    timeline_markers = COALESCE(EXCLUDED.timeline_markers, chapters.timeline_markers),
    updated_at = CURRENT_TIMESTAMP
RETURNING id, story_id, narrator_id, chapter_number, title, content, content_url, is_premium, duration_seconds, waveform_data, timeline_markers, listen_count, created_at, updated_at, publication_status, scheduled_at, review_reason, edit_version;

-- name: GetChapterByID :one
SELECT 
    c.id, c.story_id, c.narrator_id, c.chapter_number, c.title, c.content, c.content_url, c.is_premium,
    c.duration_seconds, c.waveform_data, c.timeline_markers, c.listen_count, c.created_at, c.updated_at,
    n.name AS narrator_name
FROM chapters c
LEFT JOIN narrators n ON c.narrator_id = n.id
WHERE c.id = $1;

-- name: GetChapterByNumber :one
SELECT 
    c.id, c.story_id, c.narrator_id, c.chapter_number, c.title, c.content, c.content_url, c.is_premium,
    c.duration_seconds, c.waveform_data, c.timeline_markers, c.listen_count, c.created_at, c.updated_at,
    n.name AS narrator_name
FROM chapters c
LEFT JOIN narrators n ON c.narrator_id = n.id
WHERE c.story_id = $1 AND c.chapter_number = $2;

-- name: ListChaptersByStory :many
SELECT 
    c.id, c.story_id, c.narrator_id, c.chapter_number, c.title, c.content, c.content_url, c.is_premium,
    c.duration_seconds, c.waveform_data, c.timeline_markers, c.listen_count, c.created_at, c.updated_at,
    n.name AS narrator_name
FROM chapters c
LEFT JOIN narrators n ON c.narrator_id = n.id
WHERE c.publication_status='published' AND c.story_id = $1
ORDER BY c.chapter_number ASC;

-- name: UpdateChapter :one
UPDATE chapters
SET 
    title = $2,
    narrator_id = $3,
    chapter_number = $4,
    content = $5,
    content_url = $6,
    is_premium = $7,
    duration_seconds = $8,
    waveform_data = $9,
    timeline_markers = $10,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING id, story_id, narrator_id, chapter_number, title, content, content_url, is_premium, duration_seconds, waveform_data, timeline_markers, listen_count, created_at, updated_at, publication_status, scheduled_at, review_reason, edit_version;

-- name: DeleteChapter :exec
DELETE FROM chapters
WHERE id = $1;

-- name: AddChapterAudioFile :one
INSERT INTO chapter_audio_files (
    chapter_id,
    quality,
    audio_url,
    file_size_bytes,
    is_primary
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING id, chapter_id, quality, audio_url, file_size_bytes, is_primary, created_at;

-- name: GetChapterAudioFiles :many
SELECT id, chapter_id, quality, audio_url, file_size_bytes, is_primary, created_at
FROM chapter_audio_files
WHERE chapter_id = $1
ORDER BY is_primary DESC, quality ASC;
