-- =========================================
-- Міграція: Активний пошук клієнтів (Outreach)
-- Виконати в Supabase Dashboard → SQL Editor
-- =========================================

-- Enum типи
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outreachplatform') THEN
        CREATE TYPE "OutreachPlatform" AS ENUM ('TELEGRAM_GROUP', 'INSTAGRAM_COMMENT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outreachlanguage') THEN
        CREATE TYPE "OutreachLanguage" AS ENUM ('UK', 'RU', 'EN', 'DE');
    END IF;
END $$;

-- Таблиця відповідей магів (групи + Instagram)
CREATE TABLE IF NOT EXISTS "outreach_responses" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "platform" "OutreachPlatform" NOT NULL,
    "agent_type" "AgentType" NOT NULL,
    "language" "OutreachLanguage" NOT NULL,
    "group_handle" TEXT,
    "external_post_id" TEXT,
    "external_thread_id" TEXT,
    "trigger_phrase" TEXT,
    "response_text" TEXT NOT NULL,
    "target_url" TEXT,
    "user_handle" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Індекси для outreach_responses
CREATE INDEX IF NOT EXISTS "idx_outreach_platform_created" ON "outreach_responses" ("platform", "created_at");
CREATE INDEX IF NOT EXISTS "idx_outreach_agent_created" ON "outreach_responses" ("agent_type", "created_at");
CREATE INDEX IF NOT EXISTS "idx_outreach_language" ON "outreach_responses" ("language");

-- Таблиця переходів на сайт (реферальні кліки)
CREATE TABLE IF NOT EXISTS "referral_clicks" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "source" TEXT NOT NULL,
    "agent_type" "AgentType",
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Індекси для referral_clicks
CREATE INDEX IF NOT EXISTS "idx_referral_source_created" ON "referral_clicks" ("source", "created_at");
CREATE INDEX IF NOT EXISTS "idx_referral_agent" ON "referral_clicks" ("agent_type");

-- RLS: вимкнути для service role (скрипти Python використовують service role key)
ALTER TABLE "outreach_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "referral_clicks" ENABLE ROW LEVEL SECURITY;

-- Policy: anon/аутентифіковані користувачі — тільки читання (для адмінки)
CREATE POLICY "Allow read outreach_responses" ON "outreach_responses"
    FOR SELECT USING (true);

CREATE POLICY "Allow read referral_clicks" ON "referral_clicks"
    FOR SELECT USING (true);

-- Дозволити вставку через service role (виконується поза RLS)
-- Service Role Key обходить RLS за замовчуванням

-- =========================================
-- Перевірка
-- =========================================
SELECT 'outreach_responses' as table_name, COUNT(*) as count FROM "outreach_responses"
UNION ALL
SELECT 'referral_clicks' as table_name, COUNT(*) as count FROM "referral_clicks";
