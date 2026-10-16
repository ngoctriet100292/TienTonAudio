-- Short-lived OAuth state and one-use login codes; no provider access tokens are retained.
BEGIN;
CREATE TABLE IF NOT EXISTS oauth_flows (
    state_hash TEXT PRIMARY KEY,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'facebook', 'apple')),
    browser_hash TEXT NOT NULL,
    session_data TEXT NOT NULL,
    redirect_path TEXT NOT NULL DEFAULT '/',
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_oauth_flows_expiry ON oauth_flows(expires_at);
CREATE TABLE IF NOT EXISTS oauth_login_codes (
    code_hash TEXT PRIMARY KEY,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'facebook', 'apple')),
    browser_hash TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    redirect_path TEXT NOT NULL DEFAULT '/',
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_oauth_login_codes_expiry ON oauth_login_codes(expires_at);
COMMIT;
