-- name: ListSubscriptionPlans :many
SELECT id, name, price, duration_days, description
FROM subscription_plans
ORDER BY price ASC;

-- name: GetSubscriptionPlanByID :one
SELECT id, name, price, duration_days, description
FROM subscription_plans
WHERE id = $1;

-- name: CreatePayment :one
INSERT INTO payments (
    user_id,
    plan_id,
    amount,
    provider,
    status,
    transaction_id
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING id, user_id, plan_id, amount, provider, status, transaction_id, created_at, updated_at;

-- name: GetPaymentByID :one
SELECT id, user_id, plan_id, amount, provider, status, transaction_id, created_at, updated_at
FROM payments
WHERE id = $1;

-- name: UpdatePaymentStatus :one
UPDATE payments
SET 
    status = $2,
    transaction_id = COALESCE($3, transaction_id),
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING id, user_id, plan_id, amount, provider, status, transaction_id, created_at, updated_at;

-- name: ActivateSubscription :one
INSERT INTO subscriptions (
    user_id,
    plan_id,
    started_at,
    expires_at,
    status
) VALUES (
    $1, $2, CURRENT_TIMESTAMP, $3, 'active'
)
RETURNING id, user_id, plan_id, started_at, expires_at, status, created_at;

-- name: GetUserActiveSubscription :one
SELECT s.id, s.user_id, s.plan_id, s.started_at, s.expires_at, s.status, p.name AS plan_name
FROM subscriptions s
JOIN subscription_plans p ON s.plan_id = p.id
WHERE s.user_id = $1 AND s.status = 'active' AND s.expires_at > CURRENT_TIMESTAMP
ORDER BY s.expires_at DESC
LIMIT 1;

-- name: ListUserPayments :many
SELECT 
    p.id, p.user_id, p.plan_id, p.amount, p.provider, p.status, p.transaction_id, p.created_at, p.updated_at,
    sp.name AS plan_name, sp.duration_days
FROM payments p
LEFT JOIN subscription_plans sp ON p.plan_id = sp.id
WHERE p.user_id = $1
ORDER BY p.created_at DESC;

