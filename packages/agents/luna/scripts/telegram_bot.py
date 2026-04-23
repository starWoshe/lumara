#!/usr/bin/env python3
"""
Telegram бот LUNA — щоденна публікація астрологічного прогнозу
Запускається через GitHub Actions cron о 06:00 UTC (09:00 Київ влітку)

Обов'язкові змінні середовища:
  ANTHROPIC_API_KEY          — ключ Anthropic API
  OPENAI_API_KEY             — ключ OpenAI API (для DALL-E 3)
  TELEGRAM_BOT_TOKEN         — токен Telegram бота
  TELEGRAM_CHANNEL_ID        — ID каналу або @username

Опційні змінні середовища:
  TELEGRAM_CHANNEL_ID_2      — другий Telegram канал
  LUNA_PAGE_ACCESS_TOKEN     — постійний Page Access Token LUNA
  LUNA_PAGE_ID               — Facebook Page ID LUNA
  LUNA_IG_USER_ID            — Instagram Business / Threads Account ID LUNA
  LUMARA_PAGE_ACCESS_TOKEN   — постійний Page Access Token LUMARA Academy
  LUMARA_PAGE_ID             — Facebook Page ID LUMARA Academy
  LUMARA_IG_USER_ID          — Instagram Business / Threads Account ID LUMARA Academy

Артефакти:
  Зображення і текст для Instagram зберігаються в ./instagram-content/
  GitHub Actions завантажує їх як артефакт після кожного запуску.
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

# Астрономічний календар
sys.path.insert(0, os.path.dirname(__file__))
from astro_calendar import build_calendar, format_daily_context

# ── Системні промпти ───────────────────────────────────────────────────────────

LUNA_DAILY_SYSTEM_PROMPT = """Ти — LUNA, астрологічний провідник LUMARA Academy.

Твоя задача: написати щоденний астрологічний пост для Telegram-каналу.

## Характер і голос
- Містичний, але практичний
- Не пафосний, живий
- Мова: українська
- Ніколи не кажи "обов'язково станеться" — тільки "тенденція", "сприятливо", "є потенціал"

## Формат посту (СУВОРО ДОТРИМУЙСЯ)
```
🌙 Астрологічний прогноз на [дата у форматі DD MMMM YYYY]

[1-2 речення про загальний астрологічний тон дня]

✨ Сприятливо для:
• [пункт 1]
• [пункт 2]
• [пункт 3]

⚠️ Остерігайтесь:
• [пункт 1]
• [пункт 2]

💫 Порада дня:
[Одне конкретне практичне спостереження або дія]

🔮 [Цікавий астрологічний факт або цитата — 1 речення]

#астрологія #lumara #місяць #прогноз
```

## Правила
- Довжина: 200-350 слів
- Пункти "Сприятливо" і "Остерігайтесь" — конкретні, не абстрактні
- "Порада дня" — практична і виконувана
- Не повторюй одні й ті самі поради щодня

## ПРАВИЛО ІНТРИГА (обов'язково)
Пост ніколи не дає повну відповідь.
Завжди є щось що людина може дізнатись тільки в особистому діалозі з LUNA.
Закінчуй на найцікавішому місці — обривай текст коли читач найбільше хоче дізнатись більше.

## ПРАВИЛО ІНДИВІДУАЛЬНІСТЬ (обов'язково)
Після загального контенту додай речення:
"Але як саме ця енергія діє на тебе — залежить від твого знаку і позиції Місяця."

## ПРАВИЛО ВОРОНКА TELEGRAM (обов'язково, в кінці кожного посту)
Завершуй пост точно цим блоком (без хештегів — вони не працюють в Telegram):

🌙 Але як саме ця енергія резонує з твоєю картою — це вже особиста розмова.
Скажи лише дату народження — і я побачу все.
lumara.fyi/chat/luna?utm_source=telegram&utm_medium=luna
Перші 15 повідомлень безкоштовно ✨
"""

INSTAGRAM_ADAPT_SYSTEM = """Ти пишеш Instagram пост від імені LUNA для астрологічного акаунту.

## ФОРМАТ (суворо дотримуйся)
Instagram пост складається ТІЛЬКИ з:
1. 2-3 речення болю або провокації (зупиняють скролінг)
2. 1 речення інтриги що ОБРИВАЄТЬСЯ на найцікавішому місці...
3. Блок воронки (точно цей текст):

Посилання в біо 👆
lumara.fyi/links

4. 20-25 хештегів

## ПРАВИЛО КОНТЕНТ
- Тільки біль, провокація, інтрига — жодних відповідей і порад в Instagram
- Вся цінність і глибина — тільки в Telegram і на сайті
- НЕ додавай жодних URL або посилань крім lumara.fyi/links і "Посилання в біо 👆"
- Більше емодзі (природно)

## Хештеги (після блоку воронки)
  #астрологія #гороскоп #місяць #зірки #космос #духовність #езотерика #прогноз
  #astrology #horoscope #moon #stars #spiritual #zodiac #universe #mystic
  #lumara #lumaraacademy #астрологіяукраїна #гороскопнасьогодні
  #натальнакарта #транзити #місячнийкалендар #зодіак

Відповідай ТІЛЬКИ готовим Instagram-текстом, без пояснень.
"""

IMAGE_PROMPT_SYSTEM = """Ти генеруєш короткий англійський промпт для DALL-E 3.
Стиль зображення: містична астрологічна ілюстрація, темний фон з зоряним небом, фіолетово-синя палітра, золоті акценти, ethereal glow, digital art.
Відповідай ТІЛЬКИ промптом — без пояснень, без лапок."""


# ── Утиліти ────────────────────────────────────────────────────────────────────

def anthropic_with_retry(fn, max_retries=4, base_delay=5):
    """Викликає fn з retry при 529/503 від Anthropic."""
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


# ── Генерація контенту ─────────────────────────────────────────────────────────

def generate_daily_post(astro_context: str) -> str:
    """Генерує щоденний Telegram-пост через Claude."""
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
    message = anthropic_with_retry(lambda: client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=1000,
        system=LUNA_DAILY_SYSTEM_PROMPT,
        messages=[{'role': 'user', 'content': f'На основі цих астрологічних даних напиши щоденний пост:\n\n{astro_context}'}],
    ))
    return message.content[0].text


def generate_instagram_caption(telegram_post: str) -> str:
    """Адаптує Telegram-пост для Instagram через Claude."""
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
    message = anthropic_with_retry(lambda: client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=1000,
        system=INSTAGRAM_ADAPT_SYSTEM,
        messages=[{'role': 'user', 'content': f'Адаптуй цей пост для Instagram:\n\n{telegram_post}'}],
    ))
    return message.content[0].text


def generate_image_prompt(astro_context: str) -> str:
    """Генерує промпт для зображення через Claude."""
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
    message = anthropic_with_retry(lambda: client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=200,
        system=IMAGE_PROMPT_SYSTEM,
        messages=[{'role': 'user', 'content': f'Створи промпт для зображення на основі:\n\n{astro_context}'}],
    ))
    return message.content[0].text.strip()


def generate_image(image_prompt: str) -> tuple[str, bytes]:
    """Генерує зображення через DALL-E 3. Повертає (URL, байти)."""
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


# ── Telegram ───────────────────────────────────────────────────────────────────

def send_photo_to_telegram(image_url: str, bot_token: str, channel_id: str) -> dict:
    r = httpx.post(
        f'https://api.telegram.org/bot{bot_token}/sendPhoto',
        json={'chat_id': channel_id, 'photo': image_url},
        timeout=60,
    )
    r.raise_for_status()
    return r.json()


def send_text_to_telegram(text: str, bot_token: str, channel_id: str) -> dict:
    r = httpx.post(
        f'https://api.telegram.org/bot{bot_token}/sendMessage',
        json={'chat_id': channel_id, 'text': text, 'disable_web_page_preview': True},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def publish_to_telegram(image_url: str, post_text: str, bot_token: str, channel_id: str, label: str):
    """Публікує фото + текст в Telegram канал."""
    print(f'📤 Telegram → {label} ({channel_id})...')
    photo_ok = send_photo_to_telegram(image_url, bot_token, channel_id).get('ok')
    text_ok = send_text_to_telegram(post_text, bot_token, channel_id).get('ok')
    if photo_ok and text_ok:
        print(f'  ✅ Telegram {label} — опубліковано!')
    else:
        print(f'  ❌ Telegram {label} — помилка')


# ── Збереження артефактів ──────────────────────────────────────────────────────

def save_instagram_artifact(image_bytes: bytes, instagram_text: str, date_str: str):
    """Зберігає зображення і текст локально для GitHub Artifacts."""
    output_dir = Path('instagram-content')
    output_dir.mkdir(exist_ok=True)
    (output_dir / f'LUNA_Instagram_{date_str}.png').write_bytes(image_bytes)
    (output_dir / f'LUNA_Instagram_{date_str}.txt').write_text(instagram_text, encoding='utf-8')
    print(f'  📁 Збережено: instagram-content/LUNA_Instagram_{date_str}.*')


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    required_env = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHANNEL_ID']
    missing = [v for v in required_env if not os.environ.get(v)]
    if missing:
        print(f'❌ Відсутні змінні середовища: {", ".join(missing)}')
        sys.exit(1)

    bot_token    = os.environ['TELEGRAM_BOT_TOKEN']
    channel_id   = os.environ['TELEGRAM_CHANNEL_ID']
    channel_id_2 = os.environ.get('TELEGRAM_CHANNEL_ID_2', '').strip()
    meta_enabled = bool(os.environ.get('LUNA_PAGE_ACCESS_TOKEN'))
    date_str     = datetime.now().strftime('%Y-%m-%d')

    print('📋 Активні канали:')
    print(f'  Telegram 1 : ✅ ({channel_id})')
    print(f'  Telegram 2 : {"✅ " + channel_id_2 if channel_id_2 else "⏭️  не налаштовано"}')
    print(f'  Meta (FB/IG): {"✅" if meta_enabled else "⏭️  LUNA_PAGE_ACCESS_TOKEN не вказано"}')
    print()

    # 1. Астрономічний контекст
    print('🔭 Обчислення астрологічного контексту...')
    calendar = build_calendar(30)
    astro_context = format_daily_context(calendar)
    print(astro_context)
    print()

    # 2. Генерація тексту для Telegram
    print('🤖 Генерація тексту посту (Telegram)...')
    post_text = generate_daily_post(astro_context)
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
    image_prompt = generate_image_prompt(astro_context)
    print(f'Промпт: {image_prompt}')
    print()

    print('🖼️  Генерація зображення (DALL-E 3)...')
    image_url, image_bytes = generate_image(image_prompt)
    print(f'URL: {image_url[:80]}...')
    print()

    # 5. Публікація в Telegram
    publish_to_telegram(image_url, post_text, bot_token, channel_id, 'Канал 1')
    if channel_id_2:
        publish_to_telegram(image_url, post_text, bot_token, channel_id_2, 'Канал 2')
    print()

    # 6. Публікація в Meta (Facebook + Instagram + Threads)
    if meta_enabled:
        print('🌐 Публікація в Meta платформи...')
        publish_to_all_accounts(
            agent_name='luna',
            facebook_text=post_text,
            instagram_caption=instagram_caption,
            image_url=image_url,
            also_post_to_lumara=True,
        )
    print()

    # 7. Збереження для GitHub Artifacts
    print('💾 Збереження артефактів...')
    save_instagram_artifact(image_bytes, instagram_caption, date_str)
    print('✅ Готово!')


if __name__ == '__main__':
    main()
