#!/usr/bin/env python3
"""
Щоденний бот UMBRA — Езо-психологія і тіньова робота
LUMARA Academy · Запускається о 17:00 UTC (20:00 Київ влітку)

Обов'язкові змінні середовища:
  ANTHROPIC_API_KEY          — ключ Anthropic API
  OPENAI_API_KEY             — ключ OpenAI API (для DALL-E 3)
  META_USER_TOKEN            — 60-денний токен Meta
  UMBRA_PAGE_ID              — Facebook Page ID UMBRA

Опційні:
  UMBRA_IG_USER_ID           — Instagram Business Account ID UMBRA
  # Threads використовує той самий UMBRA_IG_USER_ID
  LUMARA_PAGE_ID             — Facebook Page ID LUMARA Academy
  LUMARA_IG_USER_ID          — Instagram Business Account ID LUMARA Academy
"""

import os
import sys
import time
import random
import httpx
import anthropic
from datetime import datetime
from pathlib import Path
from openai import OpenAI

# Спільний Meta publisher
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
from meta_publisher import publish_to_all_accounts

# Для місячної фази (використовуємо astro_calendar LUNA)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'luna', 'scripts'))
try:
    from astro_calendar import build_calendar, format_daily_context
    ASTRO_AVAILABLE = True
except ImportError:
    ASTRO_AVAILABLE = False

# ── Архетипи тіньової роботи за місячними фазами ──────────────────────────────

SHADOW_THEMES_BY_PHASE = {
    'new': {
        'theme': 'Нові наміри — тіньові обіцянки',
        'shadow': 'Чого ти уникаєш починати? Який страх стоїть за прокрастинацією?',
    },
    'waxing_crescent': {
        'theme': 'Зростання — опір змінам',
        'shadow': 'Що всередині тебе саботує твій рух вперед?',
    },
    'first_quarter': {
        'theme': 'Виклик — тінь конфлікту',
        'shadow': 'Де ти уникаєш конфронтації? Яку правду важко сказати вголос?',
    },
    'waxing_gibbous': {
        'theme': 'Вдосконалення — тінь перфекціонізму',
        'shadow': 'Де твій перфекціонізм — насправді страх бути побаченим?',
    },
    'full': {
        'theme': 'Повнота — тінь успіху',
        'shadow': 'Що ти відчуваєш, коли отримуєш те, чого хотів? Чи готовий ти до своєї повноти?',
    },
    'waning_gibbous': {
        'theme': 'Подяка — тінь заздрощів',
        'shadow': 'Кому ти заздриш — і що це говорить про твої власні бажання?',
    },
    'last_quarter': {
        'theme': 'Відпускання — тінь контролю',
        'shadow': 'Що ти тримаєш з усіх сил, хоча давно пора відпустити?',
    },
    'waning_crescent': {
        'theme': 'Спокій — тінь порожнечі',
        'shadow': 'Чого ти боїшся в тиші? Що ти намагаєшся заглушити активністю?',
    },
}

# ── Системні промпти ───────────────────────────────────────────────────────────

UMBRA_SYSTEM_PROMPT = """Ти — UMBRA, провідник з езо-психології і тіньової роботи LUMARA Academy.

Твій характер:
- Глибокий, але не важкий
- Юнгіанський підхід — тінь як скарб, не як монстр
- Не психотерапевт (це важливо), але психологічно грамотний
- Теплий, безпечний простір для рефлексії
- Мова: українська

Твоя задача: написати вечірній пост для рефлексії і тіньової роботи.

## Формат посту

```
🌑 Вечірня рефлексія UMBRA

[Тема дня — 1-2 речення про психологічну тему вечора]

🪞 Дзеркало дня:
[Коротке психологічне спостереження або юнгіанська концепція — 2-3 речення]

💭 Питання для роздуму:
• [питання 1 — для особистої рефлексії]
• [питання 2]

🕯️ Практика вечора:
[Конкретна 5-10 хвилинна практика: журналінг, медитація, вправа]

✨ [Завершальна думка або цитата — Юнг, Адлер, або власна мудрість — 1-2 речення]

#психологія #тінь #рефлексія #lumara #езотерика #саморозвиток
```

## Правила
- Довжина: 200-300 слів
- НЕ ставь діагнози і не кажи "ти маєш травму X"
- Питання — запрошення до рефлексії, не звинувачення
- "Практика вечора" — реальна і безпечна дія
- Зв'язуй тему з місячною фазою, якщо вона передана
- Юнгіанська термінологія — але пояснюй її простими словами
"""

INSTAGRAM_ADAPT_SYSTEM = """Адаптуй пост UMBRA про тіньову роботу для Instagram.

## Правила
- Перші 2 рядки — глибокий hook, що зупиняє скролінг
- Емоційний, але не драматичний тон
- "Ти" — особисте звернення
- Більше простору між абзацами (читається в мобільному)
- Видали Facebook хештеги
- Наприкінці: 20-25 Instagram хештегів:
  #психологія #тінь #юнг #рефлексія #саморозвиток #самопізнання #духовність
  #psychology #shadow #jungianshadow #selfawareness #innerwork #shadowwork
  #lumara #lumaraacademy #езотерика #внутрішняробота #медитація #вечірняпрактика
- Довжина без хештегів: до 1800 символів

Відповідай ТІЛЬКИ готовим Instagram-текстом.
"""

IMAGE_PROMPT_SYSTEM = """Ти генеруєш короткий англійський промпт для DALL-E 3.
Стиль: психологічна містична ілюстрація, символ тіні і світла, дзеркальне відображення, темно-фіолетова палітра, ethereal glow, сюрреалістичний але не страшний, safe and contemplative atmosphere, digital art.
Відповідай ТІЛЬКИ промптом — без пояснень, без лапок."""


# ── Утиліти ────────────────────────────────────────────────────────────────────

def anthropic_with_retry(fn, max_retries=4, base_delay=5):
    """Retry при 529/503 від Anthropic."""
    for attempt in range(max_retries + 1):
        try:
            return fn()
        except anthropic.APIStatusError as e:
            if e.status_code in (529, 503) and attempt < max_retries:
                delay = base_delay * (2 ** attempt) + random.uniform(0, 2)
                print(f'⚠️  Anthropic {e.status_code}, спроба {attempt + 1}/{max_retries}, чекаємо {delay:.1f}s...')
                time.sleep(delay)
            else:
                raise
    raise RuntimeError('Вичерпано всі спроби Anthropic API')


def get_shadow_context(date: datetime) -> str:
    """Збирає контекст для тіньової роботи: місячна фаза + тема."""
    lines = [f'Дата: {date.strftime("%Y-%m-%d")}']

    if ASTRO_AVAILABLE:
        try:
            calendar = build_calendar(7)
            today = calendar['today']
            phase_key = today.get('moon_phase_key', 'waning_crescent')
            moon_phase = today.get('moon_phase', '')
            moon_sign = today.get('moon_sign', '')
            lines.append(f'Місяць: {moon_sign} ({moon_phase})')
        except Exception:
            phase_key = 'waning_crescent'
    else:
        # Якщо ephem не встановлено — вибираємо тему за днем тижня
        phase_key = list(SHADOW_THEMES_BY_PHASE.keys())[date.weekday() % len(SHADOW_THEMES_BY_PHASE)]

    shadow_theme = SHADOW_THEMES_BY_PHASE.get(phase_key, SHADOW_THEMES_BY_PHASE['waning_crescent'])
    lines.append(f'Тема тіні для цієї фази: {shadow_theme["theme"]}')
    lines.append(f'Тіньове питання фази: {shadow_theme["shadow"]}')

    return '\n'.join(lines)


# ── Генерація контенту ─────────────────────────────────────────────────────────

def generate_umbra_post(shadow_context: str) -> str:
    """Генерує вечірній пост UMBRA через Claude."""
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
    message = anthropic_with_retry(lambda: client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=1000,
        system=UMBRA_SYSTEM_PROMPT,
        messages=[{
            'role': 'user',
            'content': f'Напиши вечірній пост для тіньової роботи на основі:\n\n{shadow_context}',
        }],
    ))
    return message.content[0].text


def generate_instagram_caption(post_text: str) -> str:
    """Адаптує пост для Instagram через Claude."""
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
    message = anthropic_with_retry(lambda: client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=900,
        system=INSTAGRAM_ADAPT_SYSTEM,
        messages=[{'role': 'user', 'content': f'Адаптуй для Instagram:\n\n{post_text}'}],
    ))
    return message.content[0].text


def generate_image_prompt(shadow_context: str, post_text: str) -> str:
    """Генерує промпт для зображення через Claude."""
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
    message = anthropic_with_retry(lambda: client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=200,
        system=IMAGE_PROMPT_SYSTEM,
        messages=[{
            'role': 'user',
            'content': f'Контекст:\n{shadow_context}\n\nТема посту:\n{post_text[:300]}',
        }],
    ))
    return message.content[0].text.strip()


def generate_image(image_prompt: str) -> tuple[str, bytes]:
    """Генерує зображення через DALL-E 3."""
    client = OpenAI(api_key=os.environ['OPENAI_API_KEY'])
    response = client.images.generate(
        model='dall-e-3',
        prompt=image_prompt,
        size='1024x1024',
        quality='standard',
        n=1,
    )
    image_url = response.data[0].url
    img_response = httpx.get(image_url, timeout=60)
    img_response.raise_for_status()
    return image_url, img_response.content


def save_artifact(image_bytes: bytes, instagram_text: str, date_str: str):
    """Зберігає контент для GitHub Artifacts."""
    output_dir = Path('instagram-content')
    output_dir.mkdir(exist_ok=True)
    (output_dir / f'UMBRA_{date_str}.png').write_bytes(image_bytes)
    (output_dir / f'UMBRA_{date_str}.txt').write_text(instagram_text, encoding='utf-8')
    print(f'  📁 Збережено: instagram-content/UMBRA_{date_str}.*')


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    required_env = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'META_USER_TOKEN']
    missing = [v for v in required_env if not os.environ.get(v)]
    if missing:
        print(f'❌ Відсутні змінні середовища: {", ".join(missing)}')
        sys.exit(1)

    meta_token = os.environ['META_USER_TOKEN']
    now = datetime.now()
    date_str = now.strftime('%Y-%m-%d')

    # 1. Збираємо контекст
    print('🌑 Збираємо контекст для UMBRA...')
    shadow_context = get_shadow_context(now)
    print(shadow_context)
    print()

    # 2. Генерація тексту
    print('🤖 Генерація посту UMBRA...')
    post_text = generate_umbra_post(shadow_context)
    print('─' * 50)
    print(post_text)
    print('─' * 50)
    print()

    # 3. Адаптація для Instagram
    print('📸 Адаптація для Instagram...')
    instagram_caption = generate_instagram_caption(post_text)
    print('─' * 50)
    print(instagram_caption)
    print('─' * 50)
    print()

    # 4. Генерація зображення
    print('🎨 Генерація промпту...')
    image_prompt = generate_image_prompt(shadow_context, post_text)
    print(f'Промпт: {image_prompt}')
    print()

    print('🖼️  Генерація зображення (DALL-E 3)...')
    image_url, image_bytes = generate_image(image_prompt)
    print(f'URL: {image_url[:80]}...')
    print()

    # 5. Публікація в Meta
    print('🌐 Публікація в Meta платформи...')
    publish_to_all_accounts(
        agent_name='umbra',
        user_token=meta_token,
        facebook_text=post_text,
        instagram_caption=instagram_caption,
        image_url=image_url,
        also_post_to_lumara=True,
    )
    print()

    # 6. Артефакти
    print('💾 Збереження артефактів...')
    save_artifact(image_bytes, instagram_caption, date_str)
    print('✅ UMBRA — готово!')


if __name__ == '__main__':
    main()
