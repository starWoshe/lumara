-- LUMARA Academy — початкова міграція
-- Застосовується автоматично через CI/CD (.github/workflows/db-deploy.yml)

-- Enums
DO $$ BEGIN
  CREATE TYPE "AgentType" AS ENUM ('LUNA', 'ARCAS', 'NUMI', 'UMBRA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AIModel" AS ENUM ('CLAUDE_CLAUDE_OPUS_4_6', 'CLAUDE_SONNET_4_6', 'GPT4');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'BASIC', 'PRO', 'ELITE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'QUEUED', 'PUBLISHED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ContentPlatform" AS ENUM ('INSTAGRAM', 'TELEGRAM', 'TWITTER', 'FACEBOOK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- users
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "tenant_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- accounts (NextAuth)
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- sessions (NextAuth)
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_session_token_key" ON "sessions"("session_token");

-- verification_tokens (NextAuth)
CREATE TABLE IF NOT EXISTS "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- profiles
CREATE TABLE IF NOT EXISTS "profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "birth_date" TIMESTAMP(3),
    "birth_time" TEXT,
    "birth_place" TEXT,
    "language" TEXT NOT NULL DEFAULT 'uk',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Kiev',
    "tenant_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_user_id_key" ON "profiles"("user_id");

-- agents
CREATE TABLE IF NOT EXISTS "agents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "AgentType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "model" "AIModel" NOT NULL DEFAULT 'CLAUDE_SONNET_4_6',
    "prompt_file" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "token_limit" INTEGER NOT NULL DEFAULT 4000,
    "tenant_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "agents_type_key" ON "agents"("type");

-- conversations
CREATE TABLE IF NOT EXISTS "conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "title" TEXT,
    "token_used" INTEGER NOT NULL DEFAULT 0,
    "tenant_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- messages
CREATE TABLE IF NOT EXISTS "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "token_count" INTEGER,
    "tenant_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- subscriptions
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_price_id" TEXT,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "tenant_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_customer_id_key" ON "subscriptions"("stripe_customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- courses
CREATE TABLE IF NOT EXISTS "courses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cover_image" TEXT,
    "agent_type" "AgentType",
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "price" INTEGER NOT NULL DEFAULT 0,
    "tenant_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "courses_slug_key" ON "courses"("slug");

-- enrollments
CREATE TABLE IF NOT EXISTS "enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "completed_at" TIMESTAMP(3),
    "tenant_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "enrollments_user_id_course_id_key" ON "enrollments"("user_id", "course_id");

-- content_queue
CREATE TABLE IF NOT EXISTS "content_queue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_type" "AgentType" NOT NULL,
    "platform" "ContentPlatform" NOT NULL,
    "content" TEXT NOT NULL,
    "media_url" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "tenant_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "content_queue_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
DO $$ BEGIN
  ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed: агенти LUMARA
INSERT INTO "agents" ("type", "name", "description", "model", "prompt_file", "token_limit", "updated_at")
SELECT 'LUNA', 'LUNA', 'Астрологічний провідник', 'CLAUDE_SONNET_4_6', 'luna.ts', 4000, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "agents" WHERE "type" = 'LUNA');

INSERT INTO "agents" ("type", "name", "description", "model", "prompt_file", "token_limit", "updated_at")
SELECT 'ARCAS', 'ARCAS', 'Оракул Таро', 'CLAUDE_SONNET_4_6', 'arcas.ts', 4000, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "agents" WHERE "type" = 'ARCAS');

INSERT INTO "agents" ("type", "name", "description", "model", "prompt_file", "token_limit", "updated_at")
SELECT 'NUMI', 'NUMI', 'Провідник нумерології', 'CLAUDE_SONNET_4_6', 'numi.ts', 4000, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "agents" WHERE "type" = 'NUMI');

INSERT INTO "agents" ("type", "name", "description", "model", "prompt_file", "token_limit", "updated_at")
SELECT 'UMBRA', 'UMBRA', 'Езо-психолог', 'GPT4', 'umbra.ts', 3000, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "agents" WHERE "type" = 'UMBRA');

-- Додаткові колонки (IF NOT EXISTS — безпечно запускати повторно)
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "acquisition_source" TEXT;
