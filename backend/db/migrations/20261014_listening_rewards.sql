-- Append-only migration for the listening reward clock.
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_listening_reward_at TIMESTAMPTZ;
