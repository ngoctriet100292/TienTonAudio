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
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'narrator')),
    is_email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    two_factor_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    two_factor_secret VARCHAR(255),
    cultivation_exp BIGINT DEFAULT 0,
    cultivation_realm VARCHAR(50) DEFAULT 'Luyện Khí',
    deleted_at TIMESTAMPTZ,               -- Soft delete: giữ lại review/lịch sử khi user "xóa" tài khoản
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS cultivation_exp BIGINT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cultivation_realm VARCHAR(50) DEFAULT 'Luyện Khí';

CREATE INDEX IF NOT EXISTS idx_users_not_deleted ON users(id) WHERE deleted_at IS NULL;

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
    status VARCHAR(20) DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'dropped')),
    view_count BIGINT DEFAULT 0,
    total_chapters INT DEFAULT 0,
    rating_avg NUMERIC(3, 2) DEFAULT 0.00,
    rating_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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
    is_premium BOOLEAN DEFAULT FALSE,
    duration_seconds INT NOT NULL DEFAULT 0,
    waveform_data JSONB,
    listen_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_story_chapter UNIQUE (story_id, chapter_number)
);

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