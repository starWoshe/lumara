#!/usr/bin/env python3
"""
Telegram бот LUNA — щоденна публікація астрологічного прогнозу
Запускається через GitHub Actions cron о 07:00 UTC (09:00 Київ)

Обов'язкові змінні середовища:
  ANTHROPIC_API_KEY          — ключ Anthropic API
  OPENAI_API_KEY             — ключ OpenAI API (для DALL-E 3)
  TELEGRAM_BOT_TOKEN         — токен Telegram бота
  TELEGRAM_CHANNEL_ID        — ID першого каналу або @username

Опційні змінні середовища:
  TELEGRAM_CHANNEL_ID_2      — ID другого каналу або @username
  BUFFER_ACCESS_TOKEN        — токен Buffer API
  BUFFER_PROFILE_IDS         — ID профілів через кому (Instagram, Facebook тощо)
  INSTAGRAM_USER_ID          — ID Instagram Business акаунту (прямий Meta API)
  INSTAGRAM_ACCESS_TOKEN     — довгостроковий токен Instagram Graph API

Артефакти:
  Зображення і текст для Instagram зберігаються локально в папку ./instagram-content/
  GitHub Actions автоматично завантажує їх як артефакт після кожного запуску.
"""

import os
import sys
import json
import io
import time
import httpx
import anthropic
from datetime import datetime
from pathlib import Path
from openai import OpenAI

# Імпортуємо функції з astro_calendar.py
sys.path.insert(0, os.path.dirname(__file__))
from astro_calendar import build_calendar, format_daily_context

INSTAGRAM_GRAPH_API = 'https://graph.facebook.com/v19.0'

# Системний промпт LUNA для щоденного посту (Telegram)
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
"""

# Системний промпт для адаптації тексту під Instagram
INSTAGRAM_ADAPT_SYSTEM = """Ти адаптуєш астрологічний пост для Instagram.

## Завдання
Перепиши наданий Telegram-пост у форматі для Instagram.

## Правила адаптації
- Зроби текст більш особистим і емоційним ("ти відчуваєш...", "сьогодні твій день щоб...")
- Перші 2 рядки — чіпляючий hook (людина бачить тільки їх до натискання "ще")
- Використовуй більше емодзі (природно, не надмірно)
- Видали Telegram-хештеги (#lumara #астрологія тощо)
- Наприкінці додай 20-25 Instagram хештегів:
  #астрологія #гороскоп #місяць #зірки #космос #духовність #езотерика #прогноз
  #astrology #horoscope #moon #stars #spiritual #zodiac #universe #mystic
  #lumara #lumaraacademy #астрологіяукраїна #гороскопнасьогодні
  #натальнакарта #транзити #місячнийкалендар #зодіак
- Довжина тексту БЕЗ хештегів: до 2000 символів (ліміт Instagram — 2200 разом з хештегами)
- Мова: українська

Відповідай ТІЛЬКИ готовим Instagram-текстом, без пояснень.
"""

IMAGE_PROMPT_SYSTEM = """Ти генеруєш короткий англійський промпт для DALL-E 3.
Стиль зображення: містична астрологічна ілюстрація, темний фон з зоряним небом, фіолетово-синя палітра, золоті акценти, ethereal glow, digital art.
Відповідай ТІЛЬКИ промптом — без пояснень, без лапок."""


def generate_daily_post(astro_context: str) -> str:
    """Генерує щоденний пост через Claude API."""
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])

    message = client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=1000,
        system=LUNA_DAILY_SYSTEM_PROMPT,
        messages=[{
            'role': 'user',
            'content': f'На основі цих астрологічних даних напиши щоденний пост:\n\n{astro_context}',
        }],
    )
    return message.content[0].text


def generate_instagram_post(telegram_post: str) -> str:
    """Адаптує Telegram-пост для Instagram через Claude API."""
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])

    message = client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=1000,
        system=INSTAGRAM_ADAPT_SYSTEM,
        messages=[{
            'role': 'user',
            'content': f'Адаптуй цей пост для Instagram:\n\n{telegram_post}',
        }],
    )
    return message.content[0].text


def generate_image_prompt(astro_context: str) -> str:
    """Генерує промпт для зображення через Claude."""
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])

    message = client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=200,
        system=IMAGE_PROMPT_SYSTEM,
        messages=[{
            'role': 'user',
            'content': f'Створи промпт для зображення на основі цих астрологічних даних:\n\n{astro_context}',
        }],
    )
    return message.content[0].text.strip()


def generate_image(image_prompt: str) -> tuple[str, bytes]:
    """Генерує зображення через DALL-E 3. Повертає (URL, байти зображення)."""
    client = OpenAI(api_key=os.environ['OPENAI_API_KEY'])

    response = client.images.generate(
        model='dall-e-3',
        prompt=image_prompt,
        size='1024x1024',
        quality='standard',
        n=1,
    )
    image_url = response.data[0].url

    # Завантажуємо байти для Drive/Instagram
    img_response = httpx.get(image_url, timeout=60)
    img_response.raise_for_status()

    return image_url, img_response.content


# ── Instagram Graph API ────────────────────────────────────────────────────────

def instagram_create_media_container(image_url: str, caption: str, user_id: str, access_token: str) -> str:
    """Крок 1: створює медіа-контейнер, повертає creation_id."""
    url = f'{INSTAGRAM_GRAPH_API}/{user_id}/media'
    params = {
        'image_url': image_url,
        'caption': caption[:2200],  # ліміт Instagram
        'access_token': access_token,
    }
    response = httpx.post(url, params=params, timeout=60)

    if not response.is_success:
        print(f'Instagram API помилка (create): {response.text}')
    response.raise_for_status()

    return response.json()['id']


def instagram_publish_media(creation_id: str, user_id: str, access_token: str) -> str:
    """Крок 2: публікує медіа-контейнер. Повертає ID опублікованого поста."""
    url = f'{INSTAGRAM_GRAPH_API}/{user_id}/media_publish'
    params = {
        'creation_id': creation_id,
        'access_token': access_token,
    }
    response = httpx.post(url, params=params, timeout=60)

    if not response.is_success:
        print(f'Instagram API помилка (publish): {response.text}')
    response.raise_for_status()

    return response.json()['id']


def post_to_instagram(image_url: str, caption: str) -> str:
    """Публікує фото в Instagram. Повертає ID поста."""
    user_id = os.environ['INSTAGRAM_USER_ID']
    access_token = os.environ['INSTAGRAM_ACCESS_TOKEN']

    # Крок 1: створити контейнер
    creation_id = instagram_create_media_container(image_url, caption, user_id, access_token)
    print(f'  ↳ Контейнер створено: {creation_id}')

    # Instagram рекомендує невелику паузу між create і publish
    time.sleep(3)

    # Крок 2: опублікувати
    post_id = instagram_publish_media(creation_id, user_id, access_token)
    return post_id


# ── Buffer API ────────────────────────────────────────────────────────────────

def post_to_buffer(image_url: str, caption: str) -> list[str]:
    """Публікує пост у всі підключені Buffer профілі. Повертає список ID оновлень."""
    access_token = os.environ['BUFFER_ACCESS_TOKEN']
    profile_ids  = [p.strip() for p in os.environ['BUFFER_PROFILE_IDS'].split(',') if p.strip()]

    # Buffer API приймає form-encoded, profile_ids передаємо як масив
    data = {
        'access_token': access_token,
        'text': caption[:2200],
        'media[photo]': image_url,
        'now': 'true',  # публікуємо одразу, не ставимо в чергу
    }
    for i, pid in enumerate(profile_ids):
        data[f'profile_ids[{i}]'] = pid

    response = httpx.post(
        'https://api.bufferapp.com/1/updates/create.json',
        data=data,
        timeout=30,
    )
    if not response.is_success:
        print(f'Buffer API помилка: {response.text}')
    response.raise_for_status()

    result = response.json()
    # API повертає або список updates, або один об'єкт
    updates = result.get('updates', [result])
    return [u.get('id', '') for u in updates]


# ── Локальне збереження для GitHub Artifacts ──────────────────────────────────

def save_instagram_content(image_bytes: bytes, instagram_text: str, date_str: str):
    """Зберігає зображення і текст локально — GitHub Actions завантажить як артефакт."""
    output_dir = Path('instagram-content')
    output_dir.mkdir(exist_ok=True)

    image_path = output_dir / f'LUNA_Instagram_{date_str}.png'
    text_path  = output_dir / f'LUNA_Instagram_{date_str}.txt'

    image_path.write_bytes(image_bytes)
    text_path.write_text(instagram_text, encoding='utf-8')

    print(f'  🖼️  {image_path}')
    print(f'  📝 {text_path}')


# ── Telegram ───────────────────────────────────────────────────────────────────

def send_photo_to_telegram(image_url: str, bot_token: str, channel_id: str) -> dict:
    """Відправляє фото у Telegram канал."""
    url = f'https://api.telegram.org/bot{bot_token}/sendPhoto'
    response = httpx.post(url, json={'chat_id': channel_id, 'photo': image_url}, timeout=60)
    if not response.is_success:
        print(f'Telegram API відповідь: {response.text}')
    response.raise_for_status()
    return response.json()


def send_text_to_telegram(text: str, bot_token: str, channel_id: str) -> dict:
    """Відправляє текст у Telegram канал."""
    url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
    response = httpx.post(url, json={'chat_id': channel_id, 'text': text, 'disable_web_page_preview': True}, timeout=30)
    if not response.is_success:
        print(f'Telegram API відповідь: {response.text}')
    response.raise_for_status()
    return response.json()


def publish_to_telegram_channel(image_url: str, post_text: str, bot_token: str, channel_id: str, label: str):
    """Публікує фото і текст в один Telegram канал."""
    print(f'📤 Відправка в {label} ({channel_id})...')
    photo_result = send_photo_to_telegram(image_url, bot_token, channel_id)
    text_result = send_text_to_telegram(post_text, bot_token, channel_id)

    if photo_result.get('ok') and text_result.get('ok'):
        print(f'✅ {label} — опубліковано!')
    else:
        print(f'❌ {label} — помилка Telegram')


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    # Перевірка обов'язкових змінних середовища
    required_env = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHANNEL_ID']
    missing = [v for v in required_env if not os.environ.get(v)]
    if missing:
        print(f'❌ Відсутні змінні середовища: {", ".join(missing)}')
        sys.exit(1)

    # Визначаємо які канали/платформи активні
    bot_token      = os.environ['TELEGRAM_BOT_TOKEN']
    channel_id     = os.environ['TELEGRAM_CHANNEL_ID']
    channel_id_2   = os.environ.get('TELEGRAM_CHANNEL_ID_2', '').strip()
    buffer_enabled    = bool(os.environ.get('BUFFER_ACCESS_TOKEN') and os.environ.get('BUFFER_PROFILE_IDS'))
    instagram_enabled = bool(os.environ.get('INSTAGRAM_USER_ID') and os.environ.get('INSTAGRAM_ACCESS_TOKEN'))
    date_str = datetime.now().strftime('%Y-%m-%d')

    print(f'📋 Активні канали:')
    print(f'  Telegram канал 1  : ✅')
    print(f'  Telegram канал 2  : {"✅" if channel_id_2 else "⏭️  не налаштовано"}')
    print(f'  Buffer            : {"✅ " + os.environ.get("BUFFER_PROFILE_IDS", "") if buffer_enabled else "⏭️  не налаштовано"}')
    print(f'  Instagram (Meta)  : {"✅" if instagram_enabled else "⏭️  не налаштовано"}')
    print(f'  GitHub Artifacts  : ✅ (instagram-content/)')
    print()

    # 1. Астрономічний контекст
    print('🔭 Обчислення астрономічного календаря...')
    calendar = build_calendar(30)
    astro_context = format_daily_context(calendar)
    print(astro_context)
    print()

    # 2. Генерація Telegram-посту
    print('🤖 Генерація тексту посту (Telegram)...')
    post_text = generate_daily_post(astro_context)
    print('─' * 50)
    print(post_text)
    print('─' * 50)
    print()

    # 3. Адаптація для Instagram/Buffer — завжди (зберігаємо як артефакт)
    instagram_text = None
    if True:
        print('📸 Адаптація тексту для Instagram...')
        instagram_text = generate_instagram_post(post_text)
        print('─' * 50)
        print(instagram_text)
        print('─' * 50)
        print()

    # 4. Генерація зображення
    print('🎨 Генерація промпту для зображення...')
    image_prompt = generate_image_prompt(astro_context)
    print(f'Промпт: {image_prompt}')
    print()

    print('🖼️ Генерація зображення через DALL-E 3...')
    image_url, image_bytes = generate_image(image_prompt)
    print(f'URL зображення: {image_url[:60]}...')
    print()

    # 5. Публікація в Telegram (канал 1)
    publish_to_telegram_channel(image_url, post_text, bot_token, channel_id, 'Канал 1')

    # 6. Публікація в Telegram (канал 2, якщо вказано)
    if channel_id_2:
        publish_to_telegram_channel(image_url, post_text, bot_token, channel_id_2, 'Канал 2')

    # 7. Публікація через Buffer (Instagram, Facebook тощо)
    if buffer_enabled:
        print('🟦 Публікація через Buffer...')
        try:
            update_ids = post_to_buffer(image_url, instagram_text)
            print(f'✅ Buffer — опубліковано! IDs: {", ".join(update_ids)}')
        except Exception as e:
            print(f'❌ Buffer — помилка: {e}')
    print()

    # 8. Публікація в Instagram напряму через Meta API (якщо налаштовано)
    if instagram_enabled:
        print('📷 Публікація в Instagram...')
        try:
            post_id = post_to_instagram(image_url, instagram_text)
            print(f'✅ Instagram — опубліковано! ID: {post_id}')
        except Exception as e:
            print(f'❌ Instagram — помилка: {e}')
            # Не зупиняємо скрипт через помилку Instagram
    print()

    # 9. Збереження локально для GitHub Artifacts
    print('💾 Збереження Instagram контенту (GitHub Artifacts)...')
    save_instagram_content(image_bytes, instagram_text, date_str)
    print('✅ Файли збережено — доступні у вкладці Artifacts після завершення job')


if __name__ == '__main__':
    main()
