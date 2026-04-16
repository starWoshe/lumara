# Передача сесії: Ремонт Google OAuth (Supabase Auth)

## Автор
Агент Кімі (розробник). Дата: 2026-04-16.

## Статус
**Частково вирішено**. Синхронізація з базою працює, але middleware ще може не пускати на `/dashboard` через проблеми з cookies. Останнє виправлення — серверний API route `/api/auth/callback`.

---

## Початкова проблема
Користувач не міг увійти через Google. Сайт повертав:
```
Unsupported provider: provider is not enabled
```

**Реальна причина:** додаток (`lumara.fyi`) підключений до проекту `ldjshzqsjaarikoaddet.supabase.co`, а не до `hvpesmplwfkobnbsswpb.supabase.co`.

---

## Всі дурощі, які я наробив

### 1. Витрачено багато часу на Google OAuth замість перевірки env-змінних
**Що робив:** довго лікував Google provider у Dashboard, перевіряв Redirect URLs, Client ID/Secret.

**Чому це була дурість:** помилка `Unsupported provider` виникала через те, що **код сайту говорив з іншим проектом Supabase** (`ldjshzqsjaarikoaddet`). Там Google дійсно був вимкнений. Замість того щоб одразу перевірити `NEXT_PUBLIC_SUPABASE_URL` на Vercel, я гнав користувача налаштовувати Google Cloud Console.

**Урок:** при `Unsupported provider` спершу перевіряй, з якого проекту Supabase йде запит у Network tab.

---

### 2. Проблема PKCE verifier
**Що робив:** переносив callback з сервера (`route.ts`) на клієнт (`page.tsx`), потім назад, потім знову на клієнт.

**Чому це була дурість:** Supabase Google OAuth працює в **implicit flow** (повертає `#access_token` в URL hash), а не в PKCE flow з `code`. Я не одразу це зрозумів і годинами боровся з `PKCE code verifier not found`, намагаючись налаштувати `@supabase/ssr` з cookies, `localStorage`, `detectSessionInUrl: false`.

**Урок:** якщо Google повертає `access_token` в `#hash` — це implicit flow. Не треба шукати `code_verifier`.

---

### 3. Проблеми з DATABASE_URL
**Що робив:** змінив `packages/database/.env.example`, оновив GitHub Secrets, але не оновив Vercel Environment Variables.

**Наслідок:** API route `/api/auth/sync` падав з `Authentication failed against database server`.

**Додаткова дурість:** спробував використовувати Supabase Pooler (`aws-1-eu-west-1.pooler.supabase.com`), але пароль не підходив для pooler. Потім спробував пряме підключення (`db.hvpesmplwfkobnbsswpb.supabase.co`), але воно було недоступне з локальної машини (можливо, обмеження IP).

**Урок:** якщо `DATABASE_URL` змінився — треба оновити **і GitHub Secrets, і Vercel env variables**. Перевіряй через `npx vercel env ls`.

---

### 4. Middleware не бачив сесію
**Що робив:** повертався до `@supabase/supabase-js` (чистий browser client), потім знову до `@supabase/ssr`, потім знову чистий client.

**Чому це була дурість:** middleware (`apps/web/src/lib/supabase/middleware.ts`) використовує `@supabase/ssr` і шукає сесію в **cookies**. Чистий `supabase-js` пише в `localStorage` — middleware його не бачить. А `@supabase/ssr` версії 0.3.0 погано працює з implicit flow і `window.location.hash`.

**Урок:** у Next.js 14 з middleware треба використовувати `@supabase/ssr` і переконатися, що cookies записуються з `path=/`.

---

### 5. createBrowserClient "з'їдав" access_token з hash
**Що робив:** створював `createBrowserClient()` всередині `useEffect`, і до моменту читання `window.location.hash` він вже був порожнім.

**Чому це була дурість:** `createBrowserClient` з `@supabase/ssr` за замовчуванням обробляє URL hash і видаляє `access_token`. Якщо ти створюєш клієнт **перед** читанням hash — токен губиться.

**Урок:** витягай `access_token` з `window.location.hash` **один раз** при ініціалізації компонента (наприклад, у `useState` lazy initializer), до створення будь-якого Supabase client.

---

### 6. Неправильне управління cookies в кастомному cookie store
**Що робив:** писав власний `setAll` для `@supabase/ssr`, який не додавав `path=/`.

**Наслідок:** cookies ставилися на `/auth/callback`, і middleware на `/dashboard` їх не бачив.

**Урок:** завжди переконуйся, що session cookies мають `path=/`.

---

## Поточна архітектура (фінальне рішення)

### Клієнт (`/auth/callback/page.tsx`)
1. При завантаженні сторінки **одразу** читає `window.location.hash` і витягує `access_token` та `refresh_token`.
2. Відправляє їх на API route `/api/auth/callback` через `fetch POST`.
3. При успіху редіректить на `/dashboard`.

### Сервер (`/api/auth/callback/route.ts`)
1. Приймає `access_token` і `refresh_token`.
2. Використовує `@supabase/ssr` `createServerClient` **з cookies**, викликає `setSession`.
3. Синхронізує користувача з базою через **Supabase REST API** (а не Prisma), щоб обійти проблеми з `DATABASE_URL`.
4. Встановлює cookies у відповіді (`response.cookies.set`).

### Логін (`/login/page.tsx`)
1. Використовує `@supabase/ssr` `createBrowserClient` для `signInWithOAuth`.
2. Redirect URL: `${window.location.origin}/auth/callback?next=/dashboard`.

---

## Що ще може не працювати

### 1. Cookie `path`
У фінальному серверному route я використовую стандартний `createServerClient` з `@supabase/ssr`. Він **має** встановлювати `path=/` автоматично, але це треба перевірити.

### 2. Vercel Environment Variables
`SUPABASE_SERVICE_ROLE_KEY` і `NEXT_PUBLIC_SUPABASE_ANON_KEY` на Vercel можуть бути застарілими або неправильними. Перевір:
```bash
npx vercel env ls
```

### 3. Supabase RLS (Row Level Security)
Оскільки sync API тепер використовує REST API з `SERVICE_ROLE_KEY`, RLS не має заважати. Але якщо `SERVICE_ROLE_KEY` не встановлений — він fallback на `ANON_KEY`, і RLS може блокувати `INSERT` в `users`/`profiles`.

### 4. Middleware
`apps/web/src/lib/supabase/middleware.ts` перевіряє `supabase.auth.getUser()`. Якщо cookies не встановляться правильно — middleware кине на `/login`.

---

## Як перевірити, що все працює

1. Відкрий `https://lumara.fyi/login`.
2. Натисни F12 → Network.
3. Натисни "Увійти через Google".
4. Після повернення на `/auth/callback`:
   - Перевір, що запит `/api/auth/callback` повертає `200` з `{"success": true}`.
   - Перевір у вкладці Application → Cookies, що є `sb-access-token` і `sb-refresh-token` з `Path=/`.
5. Якщо редірект на `/dashboard` працює — перемога.

---

## Файли, які були змінені
- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/web/src/app/auth/callback/page.tsx`
- `apps/web/src/app/api/auth/callback/route.ts` (новий)
- `apps/web/src/app/api/auth/sync/route.ts`
- `apps/web/src/lib/supabase/client.ts`
- `packages/database/.env.example`
- GitHub Secrets `DATABASE_URL`, `DIRECT_URL`
- Vercel Environment Variables `DATABASE_URL`, `DIRECT_URL`

---

## Рекомендація наступному розробнику
Якщо щось знову ламається — **не міняй клієнтський Supabase client більше 2 разів**. Проблема майже завжди в одному з трьох місць:
1. `env`-змінні (Vercel чи локально)
2. Cookies (чи правильний `path`, чи встановлюються вони сервером)
3. Supabase Provider settings (чи правильний Redirect URL)

І **ніколи** не комбінуй `@supabase/supabase-js` з `@supabase/ssr` в одному проєкті без чіткого розуміння, де який використовується.
