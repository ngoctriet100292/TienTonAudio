-- name: CreateReport :one
INSERT INTO reports (
    user_id,
    target_type,
    target_id,
    reason,
    description
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING id, user_id, target_type, target_id, reason, description, status, resolved_by, admin_notes, created_at, updated_at;

-- name: ListReports :many
SELECT 
    r.id, r.user_id, r.target_type, r.target_id, r.reason, r.description, r.status,
    r.resolved_by, r.admin_notes, r.created_at, r.updated_at,
    u.username AS reporter_username
FROM reports r
JOIN users u ON r.user_id = u.id
WHERE ($1::text = '' OR r.status = $1)
ORDER BY r.created_at DESC
LIMIT $2 OFFSET $3;


-- name: GetReportByID :one
SELECT 
    r.id, r.user_id, r.target_type, r.target_id, r.reason, r.description, r.status,
    r.resolved_by, r.admin_notes, r.created_at, r.updated_at,
    u.username AS reporter_username
FROM reports r
JOIN users u ON r.user_id = u.id
WHERE r.id = $1;

-- name: UpdateReportStatus :one
UPDATE reports
SET 
    status = $2,
    resolved_by = $3,
    admin_notes = $4,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING id, user_id, target_type, target_id, reason, description, status, resolved_by, admin_notes, created_at, updated_at;
