-- name: CreateNotification :one
INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    reference_id,
    reference_type
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING id, user_id, title, message, type, reference_id, reference_type, is_read, created_at;

-- name: GetUserNotifications :many
SELECT 
    id, user_id, title, message, type, reference_id, reference_type, is_read, created_at
FROM notifications
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetUnreadNotificationCount :one
SELECT COUNT(*)::int AS unread_count
FROM notifications
WHERE user_id = $1 AND is_read = FALSE;

-- name: MarkNotificationAsRead :exec
UPDATE notifications
SET is_read = TRUE
WHERE id = $1 AND user_id = $2;

-- name: MarkAllNotificationsAsRead :exec
UPDATE notifications
SET is_read = TRUE
WHERE user_id = $1 AND is_read = FALSE;
