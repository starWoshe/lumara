<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->

---

# AGENTS.md — Інструкції для AI-агентів

Цей файл містить повний огляд проєкту **LUMARA Academy** для AI coding агентів. Читай цей файл перед початком будь-якої роботи.

## 🌿 Огляд проєкту

**LUMARA Academy** — езотерична академія нового покоління. Платформа поєднує стародавню мудрість (астрологія, таро, нумерологія, езо-психологія) з сучасним штучним інтелектом. Користувачі спілкуються з персональними AI-персонажами, кожен з яких має унікальну особистість, знання та стиль спілкування.

- **Веб-сайт:** [lumara.fyi](https://lumara.fyi)
- **Репозиторій:** Монорепо на pnpm workspaces + Turbo
- **Мова документації та коментарів:** Українська
- **Технічні терміни:** Англійською (назви функцій, змінних, команди)

## 🏗️ Архітектура монорепо

```
lumara/
├── apps/
│   ├── web/          # Next.js 14 — головний застосунок (порт 3000)
│   └── admin/        # Адмін панель (порт 3001, поки що заглушка)
├── packages/
│   ├── agents/       # AI агенти (LUNA, ARCAS, NUMI, UMBRA) + системні промпти
│   ├── content/      # Автогенерація контенту для соцмереж (заглушка, Фаза 3)
│   ├── database/     # Prisma схема, клієнт, міграції Supabase
│   ├── ui/           # Спільна UI бібліотека (Button, Card, cn)
│   └── shared/       # TypeScript типи та Zod схеми
├── .github/workflows/# GitHub Actions CI/CD
├── CLAUDE.md         # Детальні інструкції для Claude агента
├── README.md         # Опис проєкту
└── AGENTS.md         # Цей файл
```

## 🛠️ Технологічний стек

| Шар | Технологія | Версія / Примітки |
|-----|-----------|-------------------|
| **Frontend** | Next.js (App Router) | 14.2.3 |
| **Мова** | TypeScript | 5.4.5, strict mode |
| **Стилі** | Tailwind CSS | 3.4.3, кастомна палітра `lumara-*` та `gold-*` |
| **UI компоненти** | Власна бібліотека + shadcn/ui патерни | `@lumara/ui` |
| **Auth** | Supabase SSR | `@supabase/ssr`, middleware-based |
| **Database** | Supabase (PostgreSQL) | Через Prisma |
| **ORM** | Prisma | 5.13.0, бінарні таргети: `native`, `rhel-openssl-3.0.x` |
| **AI** | Anthropic Claude API + OpenAI GPT-4 | `ai` SDK, `@anthropic-ai/sdk` |
| **Платежі** | Stripe | checkout, portal, webhook |
| **Email** | Resend | Транзакційні листи |
| **Монорепо** | pnpm workspaces + Turbo | pnpm 10.6.5, turbo ^2.0.0 |
| **Deploy** | Vercel | Регіон `fra1`, GitHub інтеграція |
| **Аналітика** | Vercel Analytics | `@vercel/analytics` |

## 📦 Залежності між пакетами

```
apps/web
  ├─ @lumara/agents
  ├─ @lumara/database
  ├─ @lumara/shared
  ├─ @lumara/ui
  └─ (зовнішні: next, react, stripe, supabase, anthropic, ai, zod...)

apps/admin
  ├─ @lumara/shared
  ├─ @lumara/ui
  └─ @lumara/database

packages/agents
  └─ @lumara/shared

packages/content
  ├─ @lumara/agents
  └─ @lumara/shared

packages/database
  └─ (без workspace залежностей, тільки @prisma/client)

packages/shared
  └─ zod

packages/ui
  └─ clsx, tailwind-merge (peer: react, react-dom)
```

## 🚀 Команди збірки та розробки

Всі команди запускаються з кореня проєкту.

| Команда | Призначення |
|---------|-------------|
| `pnpm install` | Встановлення залежностей |
| `pnpm dev` | Запуск dev-режиму для всіх застосунків через Turbo |
| `pnpm build` | Збірка продакшн через Turbo |
| `pnpm lint` | ESLint для всіх пакетів |
| `pnpm type-check` | TypeScript `--noEmit` для всіх пакетів |
| `pnpm format` | Prettier для всіх `**/*.{ts,tsx,md}` |
| `pnpm db:generate` | Генерація Prisma клієнта |
| `pnpm db:migrate` | Prisma migrate dev |
| `pnpm db:push` | Prisma db push |

Окремі пакети:
- `pnpm --filter @lumara/web dev` — dev web (порт 3000)
- `pnpm --filter @lumara/admin dev` — dev admin (порт 3001)
- `pnpm --filter @lumara/agents build:prompts` — компіляція markdown промптів у `src/prompts.ts`
- `pnpm --filter @lumara/database db:studio` — Prisma Studio
- `pnpm --filter @lumara/database db:seed` — сід даних

## 🧪 Тестування

**Важливо:** У проєкті наразі відсутні власні тести. Жодних `.test.*`, `.spec.*` чи `__tests__` директорій у вихідному коді немає.

CI/CD виконує лише:
- TypeScript type-check (`pnpm run type-check`)
- ESLint (`pnpm run lint`)

При додаванні тестів рекомендується використовувати фреймворк, який підходить для Next.js (наприклад, Vitest або Jest + React Testing Library).

## 🎨 Стиль коду та форматування

### Prettier (`.prettierrc`)
- `semi: false` — без крапок з комою
- `singleQuote: true` — одинарні лапки
- `tabWidth: 2` — відступ 2 пробіли
- `trailingComma: "es5"`
- `printWidth: 100`
- `plugins: ["prettier-plugin-tailwindcss"]`

### ESLint
- Конфіг у `apps/web/.eslintrc.json` та `apps/admin/.eslintrc.json`
- Розширює `"next/core-web-vitals"`
- `packages/ui` має заглушку `"lint": "echo 'no lint'"`

### TypeScript
- Базовий конфіг: `tsconfig.base.json`
- `strict: true`, `moduleResolution: "bundler"`, `target: "ES2022"`
- Усі функції та змінні мають бути типізовані
- Інтерфейси для всіх об'єктів БД

### Конвенції React / Next.js
- **Server Components за замовчуванням**
- **Client Components** тільки за потреби інтерактивності (`'use client'`)
- Компоненти в `/components/`, сторінки в `/app/`
- API маршрути в `/app/api/`
- Вхідні дані в API завжди валідуються через `zod`

### Коментарі та документація
- Всі коментарі в коді — **українською**
- Повідомлення комітів — **українською**, чіткі та конкретні:
  - ✅ `додано базову схему бази даних`
  - ❌ `fix`, `update`, `changes`

## 🤖 AI Агенти

Проєкт має 4 AI-персонажі:

| Агент | Спеціалізація | Модель | Ліміт токенів |
|-------|--------------|--------|---------------|
| **LUNA** | Астрологія, натальні карти, транзити | Claude | 4000 |
| **ARCAS** | Таро, Оракул, розклади | Claude | 4000 |
| **NUMI** | Нумерологія, матриця долі | Claude | 4000 |
| **UMBRA** | Езо-психологія, архетипи, тінь | Claude / GPT-4 | 3000 |

### Структура агентів (`packages/agents/`)
- Промпти зберігаються у markdown файлах в папках `luna/`, `arcas/`, `numi/`, `umbra/`, `prompts/`
- `scripts/build-prompts.js` компілює markdown у `src/prompts.ts`
- `src/index.ts` експортує `AgentType`, `AGENT_MODELS`, `AGENT_TOKEN_LIMITS`, функції отримання промптів
- Для зміни промптів спочатку редагуй markdown, потім запускай `pnpm --filter @lumara/agents build:prompts`

## 🗄️ База даних

### Технології
- **PostgreSQL** через Supabase
- **Prisma** як ORM
- **Prisma Client** згенерований у `packages/database`

### Схема (основні моделі)
- `User` / `Profile` / `Account` / `Session` / `VerificationToken` — NextAuth-сумісна авторизація
- `ActivityLog` — логування дій користувачів (`SIGN_IN`, `CHAT_STARTED`, `MESSAGE_SENT` тощо)
- `Agent` — конфігурація AI агентів
- `Conversation` / `Message` — історія чатів
- `Subscription` — підписки Stripe (`FREE`, `BASIC`, `PRO`, `ELITE`)
- `Course` / `Enrollment` — курси академії
- `ContentQueue` — черга контенту для соцмереж
- `TokenUsage` — трекінг витрат токенів
- `AdminSetting` — налаштування адмінки

### Принципи схеми
- Всі таблиці мають `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- Всі таблиці мають `created_at` і `updated_at`
- М'яке видалення: `deleted_at TIMESTAMP` (не видаляти записи фізично)
- Поле `tenant_id` закладено для майбутнього white-label

### Змінні середовища для БД
```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

## 🔐 Авторизація

- **Supabase SSR** (`@supabase/ssr`) з middleware (`apps/web/src/middleware.ts`)
- Middleware створює server client, перевіряє сесію, захищає маршрути
- Публічні шляхи: `/`, `/login`, `/pricing`, `/mages`, `/links`, `/api/auth/*`, `/api/stripe/webhook`, `/api/debug*`, `/auth/*`
- Неавторизованих користувачів перенаправляє на `/login` з `callbackUrl`
- Для API повертає `401 Unauthorized`

## 💳 Платежі (Stripe)

- Checkout: `/api/stripe/checkout`
- Customer Portal: `/api/stripe/portal`
- Webhook: `/api/stripe/webhook` (публічний endpoint, не вимагає auth)

## 🔄 CI/CD та деплой

### GitHub Actions
1. **CI/CD** (`.github/workflows/ci.yml`):
   - Тригери: push у `main` / `dev`, PR у `main`
   - Jobs: `type-check`, `lint`
   - Node.js 22, pnpm 9

2. **Database Deploy** (`.github/workflows/db-deploy.yml`):
   - Тригер: зміни в `schema.prisma`, `*.sql`, або workflow файлі
   - Генерує Prisma client, застосовує міграції, виконує SQL/RLS скрипти через `pg`

3. **Daily агенти** (`daily-*.yml`) — cron workflow для публікації контенту агентів

### Деплой
- **Vercel GitHub інтеграція** — автоматичний деплой
- `main` → продакшн (`lumara.fyi`)
- `dev` → preview деплой
- `feature/*` — гілки для розробки

### Vercel конфігурація
- Регіон: `fra1` (Frankfurt)
- Cron: `/api/health` кожні 5 днів о 09:00 UTC
- `outputDirectory: ".next"`

## 📝 Змінні середовища

Скопіюй `.env.example` у `.env.local` та заповни значення.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database (Prisma)
DATABASE_URL=
DIRECT_URL=

# Anthropic (Claude API)
ANTHROPIC_API_KEY=

# OpenAI (GPT-4 для UMBRA)
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_LIVE_MODE=false

# Resend (Email)
RESEND_API_KEY=
EMAIL_FROM=noreply@lumara.fyi

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=LUMARA Academy
ADMIN_EMAIL=
```

## ⚠️ Важливі правила розробки

1. **Масштабованість** — кожне рішення має витримати 100 000+ користувачів
2. **Безпека** — ніколи не довіряй вхідним даним без валідації (zod)
3. **Продуктивність** — використовуй Server Components, кешування
4. **Документація** — коментуй складну логіку українською
5. **Git workflow** — після кожного логічно завершеного блоку: коміт → пуш
6. **Нові модулі** — перед реалізацією створи `INSTRUCTIONS.md` у папці модуля (див. `CLAUDE.md`)
7. **Секрети** — ніколи не хардкодь ключі; використовуй `.env.local` / Vercel Env Variables

## 📂 Корисні посилання

- `CLAUDE.md` — детальні інструкції для Claude агента (мова, архітектура, правила)
- `README.md` — огляд проєкту для людей
- `packages/database/prisma/schema.prisma` — повна схема БД
- `packages/agents/scripts/build-prompts.js` — збірка промптів агентів
- `.github/workflows/` — всі CI/CD пайплайни

---

*Останнє оновлення: Квітень 2026*
*Проект: LUMARA Academy · lumara.fyi*
