BEGIN;
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
COMMIT;
