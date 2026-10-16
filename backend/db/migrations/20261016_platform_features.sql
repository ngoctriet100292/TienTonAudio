BEGIN;
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
COMMIT;
