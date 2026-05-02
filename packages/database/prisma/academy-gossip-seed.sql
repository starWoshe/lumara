-- Таблиця кулуарних новин академії
-- Виконати в Supabase SQL editor: https://supabase.com/dashboard/project/hvpesmplwfkobnbsswpb/sql

CREATE TABLE IF NOT EXISTS "academy_gossip" (
  "id"         TEXT      NOT NULL DEFAULT gen_random_uuid()::text,
  "text"       TEXT      NOT NULL,
  "active"     BOOLEAN   NOT NULL DEFAULT true,
  "sort_order" INTEGER   NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "academy_gossip_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "academy_gossip_active_idx" ON "academy_gossip"("active");

-- Початкові плітки
INSERT INTO "academy_gossip" ("text", "active", "sort_order") VALUES
  ('В академії відчувається наближення чогось великого — маги мовчать офіційно але між собою говорять', true, 1),
  ('ARCAS двічі витягнув карту Шаман за місяць — навіть для нього це незвично', true, 2),
  ('В бібліотеці з''явились книги яких раніше не було — ніхто не знає хто приніс', true, 3),
  ('Хтось залишив мед на порозі академії — бджоли завжди приходять раніше ніж ректор', true, 4),
  ('Вночі чути тихе дзижчання — ті хто знає розуміють що це означає', true, 5)
ON CONFLICT DO NOTHING;
