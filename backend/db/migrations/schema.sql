-- ============================================================
-- SCHEMA DATABASE CHO TRANG WEB NGHE TRUYỆN AUDIO
-- PostgreSQL (Idempotent Schema)
-- ============================================================

-- Kích hoạt extension hỗ trợ tìm kiếm và sinh UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- 1. BẢNG NGƯỜI DÙNG
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    avatar_url VARCHAR(500),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'narrator')),
    is_email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    two_factor_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    two_factor_secret VARCHAR(255),
    cultivation_exp BIGINT DEFAULT 0,
    cultivation_realm VARCHAR(50) DEFAULT 'Phàm Nhân',
    provider VARCHAR(50) DEFAULT 'local',
    provider_id VARCHAR(255),
    deleted_at TIMESTAMPTZ,               -- Soft delete: giữ lại review/lịch sử khi user "xóa" tài khoản
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cultivation_exp BIGINT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_listening_reward_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cultivation_realm VARCHAR(50) DEFAULT 'Phàm Nhân';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'local';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'narrator', 'partner', 'creator'));

CREATE INDEX IF NOT EXISTS idx_users_not_deleted ON users(id) WHERE deleted_at IS NULL;

-- Bảng lưu thông tin tài khoản liên kết OAuth (Google, Facebook, Apple)
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'facebook', 'apple'
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    avatar_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider, provider_user_id);

-- Bảng token xác thực email khi đăng ký
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(100) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);

-- Bảng token đặt lại mật khẩu khi quên
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(100) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);

-- Bảng lưu trữ và quản lý phiên refresh token
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    revoked BOOLEAN DEFAULT FALSE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- Bảng mã dự phòng cứu hộ 2FA
CREATE TABLE IF NOT EXISTS two_factor_backup_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    used BOOLEAN DEFAULT FALSE NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_two_factor_backup_codes_user ON two_factor_backup_codes(user_id);

-- ============================================================
-- 2. TÁC GIẢ & GIỌNG ĐỌC (NARRATOR)
-- ============================================================
CREATE TABLE IF NOT EXISTS authors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) UNIQUE NOT NULL,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS narrators (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) UNIQUE NOT NULL,
    avatar_url VARCHAR(500),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. THỂ LOẠI (CATEGORIES) & TAG
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(60) UNIQUE NOT NULL
);

-- ============================================================
-- 4. BẢNG TRUYỆN (STORIES)
-- ============================================================
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(300) UNIQUE NOT NULL,
    description TEXT,
    cover_image_url VARCHAR(500),
    author_id INT REFERENCES authors(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'paused', 'dropped')),
    view_count BIGINT DEFAULT 0,
    total_chapters INT DEFAULT 0,
    rating_avg NUMERIC(3, 2) DEFAULT 0.00,
    rating_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE stories ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Bảng nối n-n giữa Truyện và Thể loại
CREATE TABLE IF NOT EXISTS story_categories (
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (story_id, category_id)
);

-- Bảng nối n-n giữa Truyện và Tag
CREATE TABLE IF NOT EXISTS story_tags (
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (story_id, tag_id)
);

-- ============================================================
-- 5. BẢNG TẬP/CHƯƠNG AUDIO (CHAPTERS)
-- ============================================================
CREATE TABLE IF NOT EXISTS chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    narrator_id INT REFERENCES narrators(id) ON DELETE SET NULL,
    chapter_number NUMERIC(6, 1) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    content_url VARCHAR(500),
    is_premium BOOLEAN DEFAULT FALSE,
    duration_seconds INT NOT NULL DEFAULT 0,
    waveform_data JSONB,
    timeline_markers JSONB DEFAULT '[]'::jsonb,
    listen_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_story_chapter UNIQUE (story_id, chapter_number)
);

ALTER TABLE chapters ADD COLUMN IF NOT EXISTS content_url VARCHAR(500);
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS timeline_markers JSONB DEFAULT '[]'::jsonb;

-- Tách file audio ra bảng riêng: hỗ trợ nhiều chất lượng / nhiều CDN dự phòng
CREATE TABLE IF NOT EXISTS chapter_audio_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    quality VARCHAR(20) NOT NULL CHECK (quality IN ('64k', '128k', '320k', 'hls')),
    audio_url VARCHAR(1000) NOT NULL,
    file_size_bytes BIGINT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_chapter_quality_url UNIQUE (chapter_id, quality, audio_url)
);

CREATE INDEX IF NOT EXISTS idx_chapter_audio_chapter ON chapter_audio_files(chapter_id);

-- ============================================================
-- 6. TIẾN TRÌNH NGHE & LỊCH SỬ (LISTENING PROGRESS / HISTORY)
-- ============================================================
CREATE TABLE IF NOT EXISTS listening_history (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    last_position_seconds INT NOT NULL DEFAULT 0,
    playback_speed NUMERIC(3, 2) DEFAULT 1.00,
    is_completed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, chapter_id)
);
ALTER TABLE listening_history ADD COLUMN IF NOT EXISTS playback_speed NUMERIC(3, 2) DEFAULT 1.00;

-- ============================================================
-- 7. YÊU THÍCH / THEO DÕI (BOOKMARKS / FAVORITES)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_favorites (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, story_id)
);

-- ============================================================
-- 8. ĐÁNH GIÁ (REVIEWS) — 1 user chỉ review 1 lần / truyện
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_story_review UNIQUE (user_id, story_id)
);

-- ============================================================
-- 9. BÌNH LUẬN THEO CHƯƠNG (COMMENTS) — nhiều lần, có reply
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    audio_timestamp_seconds INT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_chapter ON comments(chapter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- Bảng biểu cảm cho bình luận (like, love, haha, wow, sad, angry)
CREATE TABLE IF NOT EXISTS comment_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'love', 'haha', 'wow', 'sad', 'angry')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_comment_reaction UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON comment_reactions(comment_id);

-- ============================================================
-- 10. PLAYLIST CÁ NHÂN
-- ============================================================
CREATE TABLE IF NOT EXISTS playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS playlist_items (
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    position INT NOT NULL,
    added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (playlist_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_playlist_items_order ON playlist_items(playlist_id, position);

-- ============================================================
-- 11. GÓI TRẢ PHÍ / PREMIUM (SUBSCRIPTIONS & PAYMENTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    duration_days INT NOT NULL,
    description TEXT
);

INSERT INTO subscription_plans (id, name, price, duration_days, description) VALUES
(1, 'Kết Đan (30 ngày)', 49000, 30, 'Truy cập chương VIP trong 30 ngày; Tu vi nghe x2 khi VIP còn hiệu lực; Tặng 1.500 EXP sau khi thanh toán được xác nhận.'),
(2, 'Nguyên Anh (90 ngày)', 129000, 90, 'Truy cập chương VIP trong 90 ngày; Tu vi nghe x2 khi VIP còn hiệu lực; Tặng 4.500 EXP sau khi thanh toán được xác nhận.'),
(3, 'Tiên Vương (365 ngày)', 449000, 365, 'Truy cập chương VIP trong 365 ngày; Tu vi nghe x2 khi VIP còn hiệu lực; Tặng 18.250 EXP sau khi thanh toán được xác nhận.')
-- Keep existing membership plans when bootstrapping an established database.
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id INT REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active ON subscriptions(user_id, status, expires_at DESC);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id INT REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_txn ON payments(transaction_id);

-- ============================================================
-- 12. HỆ THỐNG THÔNG BÁO (NOTIFICATIONS)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- 13. BÁO LỖI & BÁO CÁO VI PHẠM (REPORTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('chapter', 'comment', 'story')),
    target_id UUID NOT NULL,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);

-- ============================================================
-- 14. THEO DÕI TÁC GIẢ & GIỌNG ĐỌC (FOLLOWS)
-- ============================================================
CREATE TABLE IF NOT EXISTS author_follows (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    author_id INT REFERENCES authors(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, author_id)
);

CREATE TABLE IF NOT EXISTS narrator_follows (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    narrator_id INT REFERENCES narrators(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, narrator_id)
);

-- ============================================================
-- INDEXES HỖ TRỢ TÌM KIẾM
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_stories_title_trgm ON stories USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_stories_rating ON stories(rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_stories_views ON stories(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_stories_author ON stories(author_id);
CREATE INDEX IF NOT EXISTS idx_chapters_story_number ON chapters(story_id, chapter_number);

-- ============================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION update_story_rating() RETURNS TRIGGER AS $$
DECLARE
    target_story_id UUID;
BEGIN
    target_story_id := COALESCE(NEW.story_id, OLD.story_id);

    UPDATE stories SET
        rating_avg = COALESCE((SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM reviews WHERE story_id = target_story_id), 0),
        rating_count = (SELECT COUNT(*) FROM reviews WHERE story_id = target_story_id)
    WHERE id = target_story_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_rating ON reviews;
CREATE TRIGGER trg_update_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_story_rating();

CREATE OR REPLACE FUNCTION update_story_chapter_count() RETURNS TRIGGER AS $$
DECLARE
    target_story_id UUID;
BEGIN
    target_story_id := COALESCE(NEW.story_id, OLD.story_id);

    UPDATE stories SET
        total_chapters = (SELECT COUNT(*) FROM chapters WHERE story_id = target_story_id)
    WHERE id = target_story_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_chapter_count ON chapters;
CREATE TRIGGER trg_update_chapter_count
AFTER INSERT OR DELETE ON chapters
FOR EACH ROW EXECUTE FUNCTION update_story_chapter_count();

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_stories_updated_at ON stories;
CREATE TRIGGER trg_stories_updated_at BEFORE UPDATE ON stories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_chapters_updated_at ON chapters;
CREATE TRIGGER trg_chapters_updated_at BEFORE UPDATE ON chapters
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;
CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_playlists_updated_at ON playlists;
CREATE TRIGGER trg_playlists_updated_at BEFORE UPDATE ON playlists
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_reports_updated_at ON reports;
CREATE TRIGGER trg_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 15. MẠNG XÃ HỘI TIÊN HIỆP: LUẬN ĐẠO CÁC (COMMUNITY FEED)
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
    topic VARCHAR(50) DEFAULT 'luan_dao' NOT NULL,
    content TEXT NOT NULL,
    like_count INT DEFAULT 0 NOT NULL,
    comment_count INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_topic ON community_posts(topic);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);

CREATE TABLE IF NOT EXISTS community_post_likes (
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) DEFAULT 'like' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES community_post_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_community_post_comments_post ON community_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_post_comments_parent ON community_post_comments(parent_id);

-- Triggers cập nhật like_count và comment_count cho bài viết
CREATE OR REPLACE FUNCTION update_community_post_counts() RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'community_post_likes' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE community_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'community_post_comments' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE community_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_likes_count ON community_post_likes;
CREATE TRIGGER trg_post_likes_count AFTER INSERT OR DELETE ON community_post_likes
    FOR EACH ROW EXECUTE FUNCTION update_community_post_counts();

DROP TRIGGER IF EXISTS trg_post_comments_count ON community_post_comments;
CREATE TRIGGER trg_post_comments_count AFTER INSERT OR DELETE ON community_post_comments
    FOR EACH ROW EXECUTE FUNCTION update_community_post_counts();

DROP TRIGGER IF EXISTS trg_community_posts_updated_at ON community_posts;
CREATE TRIGGER trg_community_posts_updated_at BEFORE UPDATE ON community_posts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- Database-backed cultivation catalogue.
CREATE TABLE IF NOT EXISTS cultivation_realms (
    level INTEGER PRIMARY KEY CHECK (level > 0),
    name TEXT NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
    tier TEXT NOT NULL CHECK (tier IN ('vo-dao', 'tu-tien', 'tien-gioi')),
    tier_name TEXT NOT NULL,
    min_exp BIGINT NOT NULL UNIQUE CHECK (min_exp >= 0),
    description TEXT NOT NULL,
    ability TEXT NOT NULL DEFAULT '',
    privilege TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL CHECK (color ~ '^#[0-9a-fA-F]{6}$')
);

-- Short-lived OAuth state and one-use login codes; no provider access tokens are retained.
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

ALTER TABLE stories ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'published' CHECK(publication_status IN ('draft','pending','published'));
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'published' CHECK(publication_status IN ('draft','pending','published','scheduled'));
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS plan_name TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS duration_days INTEGER;
UPDATE payments p SET plan_name=sp.name,duration_days=sp.duration_days FROM subscription_plans sp WHERE sp.id=p.plan_id AND (p.plan_name IS NULL OR p.duration_days IS NULL);
ALTER TABLE oauth_flows ADD COLUMN IF NOT EXISTS link_user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE TABLE IF NOT EXISTS story_follows (
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,story_id)
);
CREATE INDEX IF NOT EXISTS idx_story_followers ON story_follows(story_id);
CREATE TABLE IF NOT EXISTS chapter_announcements (
 chapter_id UUID PRIMARY KEY REFERENCES chapters(id) ON DELETE CASCADE,
 announced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Existing chapters are not announced retrospectively.
INSERT INTO chapter_announcements(chapter_id) SELECT id FROM chapters WHERE publication_status='published' ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS support_tickets (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 subject VARCHAR(200) NOT NULL,
 category TEXT NOT NULL CHECK(category IN ('usage','payment','copyright','bug','other')),
 payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_support_user ON support_tickets(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS support_messages (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
 sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 4000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_support_messages ON support_messages(ticket_id,created_at);
CREATE TABLE IF NOT EXISTS listening_reward_events (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
 occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 minutes INTEGER NOT NULL DEFAULT 5 CHECK(minutes=5)
);
CREATE INDEX IF NOT EXISTS idx_reward_events_user ON listening_reward_events(user_id,occurred_at);
CREATE TABLE IF NOT EXISTS achievement_claims (
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 achievement_key TEXT NOT NULL,
 period TEXT NOT NULL,
 reward_exp BIGINT NOT NULL CHECK(reward_exp>0),
 claimed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,achievement_key,period)
);
CREATE TABLE IF NOT EXISTS admin_change_log (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
 action TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE OR REPLACE FUNCTION announce_published_chapter() RETURNS TRIGGER AS $$
DECLARE fresh UUID;
BEGIN
 IF NEW.publication_status <> 'published' OR NOT EXISTS(SELECT 1 FROM stories WHERE id=NEW.story_id AND publication_status='published') THEN RETURN NEW; END IF;
 INSERT INTO chapter_announcements(chapter_id) VALUES(NEW.id) ON CONFLICT DO NOTHING RETURNING chapter_id INTO fresh;
 IF fresh IS NOT NULL THEN
  INSERT INTO notifications(user_id,title,message,type,reference_id,reference_type)
  SELECT f.user_id,left('Chương mới: ' || s.title,255),NEW.title,'new_chapter',NEW.id,'chapter'
  FROM story_follows f JOIN stories s ON s.id=f.story_id WHERE f.story_id=NEW.story_id;
 END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_announce_chapter ON chapters;
CREATE TRIGGER trg_announce_chapter AFTER INSERT OR UPDATE OF publication_status ON chapters FOR EACH ROW EXECUTE FUNCTION announce_published_chapter();
CREATE OR REPLACE FUNCTION update_story_chapter_count() RETURNS TRIGGER AS $$
DECLARE previous_story UUID; next_story UUID; previous_count INTEGER:=0; next_count INTEGER:=0;
BEGIN
 IF TG_OP <> 'INSERT' THEN previous_story:=OLD.story_id; previous_count:=CASE WHEN OLD.publication_status='published' THEN 1 ELSE 0 END; END IF;
 IF TG_OP <> 'DELETE' THEN next_story:=NEW.story_id; next_count:=CASE WHEN NEW.publication_status='published' THEN 1 ELSE 0 END; END IF;
 IF previous_story IS NOT DISTINCT FROM next_story AND previous_count=next_count THEN RETURN NULL; END IF;
 IF previous_count=0 AND next_count=0 THEN RETURN NULL; END IF;
 UPDATE stories s SET total_chapters=GREATEST(0,COALESCE(total_chapters,0)
 +CASE WHEN s.id=next_story THEN next_count ELSE 0 END
 -CASE WHEN s.id=previous_story THEN previous_count ELSE 0 END)
 WHERE s.id IN (previous_story,next_story);
 RETURN NULL;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_update_chapter_count ON chapters;
CREATE TRIGGER trg_update_chapter_count AFTER INSERT OR DELETE OR UPDATE OF publication_status,story_id ON chapters FOR EACH ROW EXECUTE FUNCTION update_story_chapter_count();
UPDATE stories s SET total_chapters=(SELECT count(*) FROM chapters c WHERE c.story_id=s.id AND c.publication_status='published');
SELECT setval(pg_get_serial_sequence('subscription_plans','id'),GREATEST(COALESCE((SELECT max(id) FROM subscription_plans),1),1));

ALTER TABLE stories ADD COLUMN IF NOT EXISTS review_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS review_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS edit_version BIGINT NOT NULL DEFAULT 1;
CREATE OR REPLACE FUNCTION bump_chapter_edit_version() RETURNS TRIGGER AS $$
BEGIN
 NEW.edit_version:=OLD.edit_version+1;
 RETURN NEW;
END;$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_chapter_edit_version ON chapters;
CREATE TRIGGER trg_chapter_edit_version BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION bump_chapter_edit_version();
CREATE INDEX IF NOT EXISTS idx_stories_publication_updated ON stories(publication_status,updated_at DESC,id);
CREATE INDEX IF NOT EXISTS idx_chapters_story_publication_number ON chapters(story_id,publication_status,chapter_number,id);
CREATE INDEX IF NOT EXISTS idx_support_updated ON support_tickets(updated_at DESC,id);
CREATE INDEX IF NOT EXISTS idx_support_messages_recent ON support_messages(ticket_id,created_at DESC,id DESC);
