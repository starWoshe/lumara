-- LUMARA Academy — Row Level Security (RLS) policies
-- Застосовується автоматично через CI/CD (.github/workflows/db-deploy.yml)

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Увімкнути RLS на всіх таблицях
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE "users"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agents"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversations"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "courses"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "enrollments"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_queue"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_logs"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "token_usage"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_settings"      ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────────────────
-- ПРИМІТКА: service_role (Prisma backend) автоматично обходить RLS.
-- Політики нижче захищають прямий доступ через anon/authenticated ключі.
-- ──────────────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. users
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "users: власний перегляд" ON "users";
CREATE POLICY "users: власний перегляд"
  ON "users" FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "users: власне оновлення" ON "users";
CREATE POLICY "users: власне оновлення"
  ON "users" FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. accounts (NextAuth — тільки через backend)
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "accounts: власний перегляд" ON "accounts";
CREATE POLICY "accounts: власний перегляд"
  ON "accounts" FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. sessions (NextAuth — тільки через backend)
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "sessions: власний перегляд" ON "sessions";
CREATE POLICY "sessions: власний перегляд"
  ON "sessions" FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. verification_tokens (NextAuth — тільки через backend, без user_id)
-- ──────────────────────────────────────────────────────────────────────────────
-- Немає user_id, тому доступ тільки через service_role (Prisma)
-- Жодних публічних політик — RLS блокує прямий доступ

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. profiles
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles: власний перегляд" ON "profiles";
CREATE POLICY "profiles: власний перегляд"
  ON "profiles" FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "profiles: власне створення" ON "profiles";
CREATE POLICY "profiles: власне створення"
  ON "profiles" FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "profiles: власне оновлення" ON "profiles";
CREATE POLICY "profiles: власне оновлення"
  ON "profiles" FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. agents (публічно читаються всіма — це контент-персонажі)
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "agents: публічний перегляд активних" ON "agents";
CREATE POLICY "agents: публічний перегляд активних"
  ON "agents" FOR SELECT
  TO authenticated, anon
  USING (is_active = true AND deleted_at IS NULL);

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. conversations
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "conversations: власний перегляд" ON "conversations";
CREATE POLICY "conversations: власний перегляд"
  ON "conversations" FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text AND deleted_at IS NULL);

DROP POLICY IF EXISTS "conversations: власне створення" ON "conversations";
CREATE POLICY "conversations: власне створення"
  ON "conversations" FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "conversations: власне оновлення" ON "conversations";
CREATE POLICY "conversations: власне оновлення"
  ON "conversations" FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- ──────────────────────────────────────────────────────────────────────────────
-- 9. messages (через conversations)
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "messages: перегляд своїх розмов" ON "messages";
CREATE POLICY "messages: перегляд своїх розмов"
  ON "messages" FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "conversations" c
      WHERE c.id = conversation_id
        AND auth.uid()::text = c.user_id::text
        AND c.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "messages: створення в своїх розмовах" ON "messages";
CREATE POLICY "messages: створення в своїх розмовах"
  ON "messages" FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "conversations" c
      WHERE c.id = conversation_id
        AND auth.uid()::text = c.user_id::text
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 10. subscriptions
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "subscriptions: власний перегляд" ON "subscriptions";
CREATE POLICY "subscriptions: власний перегляд"
  ON "subscriptions" FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text AND deleted_at IS NULL);

-- ──────────────────────────────────────────────────────────────────────────────
-- 11. courses (опубліковані — публічні)
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "courses: публічний перегляд опублікованих" ON "courses";
CREATE POLICY "courses: публічний перегляд опублікованих"
  ON "courses" FOR SELECT
  TO authenticated, anon
  USING (is_published = true AND deleted_at IS NULL);

-- ──────────────────────────────────────────────────────────────────────────────
-- 12. enrollments
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "enrollments: власний перегляд" ON "enrollments";
CREATE POLICY "enrollments: власний перегляд"
  ON "enrollments" FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text AND deleted_at IS NULL);

DROP POLICY IF EXISTS "enrollments: власне створення" ON "enrollments";
CREATE POLICY "enrollments: власне створення"
  ON "enrollments" FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

-- ──────────────────────────────────────────────────────────────────────────────
-- 13. content_queue (тільки backend/admin — жодних публічних політик)
-- ──────────────────────────────────────────────────────────────────────────────
-- Доступ тільки через service_role (GitHub Actions, Prisma)
-- RLS заблокує будь-який прямий доступ через anon/authenticated

-- ──────────────────────────────────────────────────────────────────────────────
-- 14. activity_logs
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "activity_logs: власний перегляд" ON "activity_logs";
CREATE POLICY "activity_logs: власний перегляд"
  ON "activity_logs" FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- ──────────────────────────────────────────────────────────────────────────────
-- 15. token_usage
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "token_usage: власний перегляд" ON "token_usage";
CREATE POLICY "token_usage: власний перегляд"
  ON "token_usage" FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- ──────────────────────────────────────────────────────────────────────────────
-- 16. admin_settings (тільки backend/admin — жодних публічних політик)
-- ──────────────────────────────────────────────────────────────────────────────
-- Доступ тільки через service_role (Prisma backend)
-- RLS заблокує будь-який прямий доступ через anon/authenticated

-- ──────────────────────────────────────────────────────────────────────────────
-- 17. outreach_responses (тільки backend/admin — жодних публічних політик)
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE "outreach_responses" ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────────────────
-- 18. referral_clicks (anon може створювати для трекінгу)
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE "referral_clicks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral_clicks: anon insert" ON "referral_clicks";
CREATE POLICY "referral_clicks: anon insert"
  ON "referral_clicks" FOR INSERT
  TO anon
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────────────
-- 19. announcement_states (власний перегляд)
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE "announcement_states" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcement_states: власний перегляд" ON "announcement_states";
CREATE POLICY "announcement_states: власний перегляд"
  ON "announcement_states" FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- ──────────────────────────────────────────────────────────────────────────────
-- 20. monitor_states (тільки backend)
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE "monitor_states" ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────────────────
-- 21. telegram_groups (тільки backend/admin)
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE "telegram_groups" ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────────────────
-- 22. user_context (власний перегляд)
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE "user_context" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_context: власний перегляд" ON "user_context";
CREATE POLICY "user_context: власний перегляд"
  ON "user_context" FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- ──────────────────────────────────────────────────────────────────────────────
-- 23. telegram_conversations (тільки backend — webhook від бота)
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE "telegram_conversations" ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────────────────
-- 24. verification_tokens (NextAuth — тільки через backend)
-- ──────────────────────────────────────────────────────────────────────────────
-- Немає user_id, тому доступ тільки через service_role (Prisma)
-- Жодних публічних політик — RLS блокує прямий доступ

-- ──────────────────────────────────────────────────────────────────────────────
-- 25. monitored_groups (тільки backend / admin)
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE "monitored_groups" ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────────────────
-- 26. userbot_sessions (тільки backend)
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE "userbot_sessions" ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────────────────
-- 27. userbot_logs (тільки backend / admin)
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE "userbot_logs" ENABLE ROW LEVEL SECURITY;
