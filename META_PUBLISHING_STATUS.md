# Meta Publishing — Статус і проблеми
*Оновлено: 2026-04-12*

## Що зроблено

Автоматизація публікації контенту для 5 акаунтів LUMARA Academy через GitHub Actions:

| Агент | Час (UTC) | Час (Київ) | Workflow |
|-------|-----------|------------|----------|
| NUMI | 05:00 | 08:00 | `.github/workflows/daily-numi.yml` |
| LUNA | 06:00 | 09:00 | `.github/workflows/daily-luna.yml` |
| ARCAS | 09:00 | 12:00 | `.github/workflows/daily-arcas.yml` |
| UMBRA | 17:00 | 20:00 | `.github/workflows/daily-umbra.yml` |

Спільний модуль публікації: `packages/agents/shared/meta_publisher.py`

## Виправлення в коді (зроблено, запушено в main)

- Facebook: прибрано `/photos` endpoint (потребував `pages_read_engagement`), замінено на `/feed` з параметром `link`
- Threads: змінено базовий URL з `graph.facebook.com` на `graph.threads.net/v1.0`
- Instagram: збільшено паузу між create і publish до 10с, покращені повідомлення про помилки
- Threads: відокремлено від Page Access Token — тепер використовує `{NAME}_THREADS_TOKEN` і `{NAME}_THREADS_USER_ID`. Якщо змінні не задані — Threads пропускається (не падає з помилкою)

## GitHub Secrets (поточний стан)

```
ANTHROPIC_API_KEY, OPENAI_API_KEY              ← OK
LUNA_PAGE_ACCESS_TOKEN    ← ЗЛАМАНИЙ (має pages_read_engagement в scope)
ARCAS_PAGE_ACCESS_TOKEN   ← ЗЛАМАНИЙ
NUMI_PAGE_ACCESS_TOKEN    ← ЗЛАМАНИЙ
UMBRA_PAGE_ACCESS_TOKEN   ← ЗЛАМАНИЙ
LUMARA_PAGE_ACCESS_TOKEN  ← НОВИЙ System User токен (lumara-bot, pages_manage_posts only)
```

## Поточні помилки після останнього запуску

### Facebook — UMBRA/LUNA/ARCAS/NUMI (старі токени)
```
(#283) Requires pages_read_engagement permission to manage the object  [400]
```
Старі токени мають `pages_read_engagement` в scope (незатверджений) — блокує всі запити.

### Facebook — LUMARA (новий System User токен)
```
(#200) If posting to a page, requires...  [403]
```
Можлива причина: LUMARA_PAGE_ID в secrets не відповідає сторінці, призначеній lumara-bot.
АБО: System User token потребує додаткової перевірки.

### Instagram — всі акаунти
```
instagram_content_publish відсутній в Meta App  [400 #10]
```

### Threads — всі акаунти
```
Invalid OAuth access token - Cannot parse access token  [400 #190]
```
Page Access Tokens НЕ підходять для Threads API — потрібні окремі Threads User Tokens.

## Архітектура акаунтів (з'ясовано)

- **Facebook акаунт Luna** — ЗАБЛОКОВАНИЙ назавжди
- **Facebook акаунт Volodymyr Shemchuk** — активний, має доступ до всіх 5 сторінок
- **Meta App "Lumara Bot"** (ID: `959923643254072`) — доступний через Volodymyr Shemchuk в Chrome
- **System User** `lumara-bot` (ID: `61572041038347`) — створений в портфоліо ЛУМАРА

### Бізнес-портфоліо:
| Портфоліо | Сторінки | System User |
|-----------|----------|-------------|
| ЛУМАРА | LUMARA (+ ?) | lumara-bot ✅ |
| ARCAS і Таролог Lumara | 2 сторінки | потрібно створити |
| Луна | 4 сторінки | кнопка неактивна (заблокований акаунт) |
| umbra.lumara | 2 сторінки | потрібно створити |

## Наступні кроки

### Крок 1: Виправити LUMARA Facebook (найшвидший)
1. В Chrome (як Volodymyr Shemchuk) → [business.facebook.com/settings](https://business.facebook.com/settings) → ЛУМАРА
2. Зліва → Облікові записи → Сторінки → знайди LUMARA Academy → скопіюй її ID
3. Порівняй з поточним секретом: `gh secret list` (показує час оновлення)
4. Якщо потрібно: `gh secret set LUMARA_PAGE_ID --body "ПРАВИЛЬНИЙ_ID"`
5. Переконайся що lumara-bot має доступ до цієї сторінки: System Users → lumara-bot → Призначені активи

### Крок 2: System Users для інших портфоліо
Для ARCAS і Таролог Lumara:
- business.facebook.com/settings → вибери портфоліо → Користувачі системи → Додати
- Ім'я: `arcas-bot`, роль Admin
- Призначити активи: сторінки ARCAS і Lumara
- Створити токен → App: Lumara Bot → `pages_manage_posts`
- `gh secret set ARCAS_PAGE_ACCESS_TOKEN --body "ТОКЕН"`

Для umbra.lumara — аналогічно.

Для Луна — кнопка неактивна. Альтернатива: додати Volodymyr Shemchuk як власника портфоліо Луна, або перенести сторінки LUNA/NUMI в портфоліо ЛУМАРА.

### Крок 3: Instagram Content Publishing
В [App Dashboard](https://developers.facebook.com/apps/959923643254072/use-cases/):
1. Use cases → Add use case → "Content Publishing"
2. Додати `instagram_content_publish` + `instagram_basic` → "Ready for testing"
3. Генерувати нові токени з цим permission

### Крок 4: Threads (окрема задача)
Threads потребує окремого OAuth flow. В `meta_publisher.py` потрібно:
- Додати окремі змінні `{NAME}_THREADS_TOKEN` і `{NAME}_THREADS_USER_ID`
- Threads OAuth: `https://threads.net/oauth/authorize?scope=threads_basic,threads_content_publish`

## Тестування

```bash
# Ручний запуск
gh workflow run daily-umbra.yml

# Перегляд логів
gh run list --limit 3
gh run view RUN_ID --log 2>&1 | grep -E "✅|❌|Facebook|Instagram|Threads|помилк"
```
