#!/usr/bin/env python3
"""
Telegram бот LUNA — щоденна публікація астрологічного прогнозу
Запускається через GitHub Actions cron о 07:00 UTC (09:00 Київ)

Потрібні змінні середовища:
  ANTHROPIC_API_KEY          — ключ Anthropic API
  OPENAI_API_KEY             — ключ OpenAI API (для DALL-E 3)
  TELEGRAM_BOT_TOKEN         — токен Telegram бота
  TELEGRAM_CHANNEL_ID        — ID першого каналу або @username
  TELEGRAM_CHANNEL_ID_2      — ID другого каналу або @username (опційно)
  GOOGLE_SERVICE_ACCOUNT_JSON — JSON сервісного акаунту Google (рядком)
  GOOGLE_DRIVE_FOLDER_ID     — ID папки в Google Drive для збереження контенту
"""

import os
import sys
import json
import io
import httpx
import anthropic
from datetime import datetime
from openai import OpenAI

# Google Drive імпорти
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

# Імпортуємо функції з astro_calendar.py
sys.path.insert(0, os.path.dirname(__file__))
from astro_calendar import build_calendar, format_daily_context

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
- Довжина: 150-300 слів + хештеги
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

    # Завантажуємо байти зображення для Google Drive
    img_response = httpx.get(image_url, timeout=60)
    img_response.raise_for_status()

    return image_url, img_response.content


def get_drive_service():
    """Створює клієнт Google Drive через сервісний акаунт."""
    credentials_json = os.environ['GOOGLE_SERVICE_ACCOUNT_JSON']
    credentials_info = json.loads(credentials_json)

    credentials = service_account.Credentials.from_service_account_info(
        credentials_info,
        scopes=['https://www.googleapis.com/auth/drive.file'],
    )
    return build('drive', 'v3', credentials=credentials)


def upload_to_drive(service, file_bytes: bytes, filename: str, mime_type: str, folder_id: str) -> str:
    """Завантажує файл у Google Drive, повертає посилання."""
    file_metadata = {
        'name': filename,
        'parents': [folder_id],
    }
    media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype=mime_type)

    file = service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id, webViewLink',
    ).execute()

    # Відкриваємо доступ "всім з посиланням" для зручного перегляду
    service.permissions().create(
        fileId=file['id'],
        body={'type': 'anyone', 'role': 'reader'},
    ).execute()

    return file.get('webViewLink', '')


def save_instagram_content_to_drive(image_bytes: bytes, instagram_text: str, date_str: str) -> dict:
    """Зберігає зображення і текст для Instagram у Google Drive."""
    folder_id = os.environ['GOOGLE_DRIVE_FOLDER_ID']
    service = get_drive_service()

    # Завантажуємо зображення
    image_filename = f'LUNA_Instagram_{date_str}.png'
    image_link = upload_to_drive(
        service,
        image_bytes,
        image_filename,
        'image/png',
        folder_id,
    )

    # Завантажуємо текст
    text_filename = f'LUNA_Instagram_{date_str}.txt'
    text_bytes = instagram_text.encode('utf-8')
    text_link = upload_to_drive(
        service,
        text_bytes,
        text_filename,
        'text/plain',
        folder_id,
    )

    return {'image_link': image_link, 'text_link': text_link}


def send_photo_to_telegram(image_url: str, bot_token: str, channel_id: str) -> dict:
    """Відправляє фото у Telegram канал."""
    url = f'https://api.telegram.org/bot{bot_token}/sendPhoto'
    payload = {'chat_id': channel_id, 'photo': image_url}

    response = httpx.post(url, json=payload, timeout=60)
    if not response.is_success:
        print(f'Telegram API відповідь: {response.text}')
    response.raise_for_status()
    return response.json()


def send_text_to_telegram(text: str, bot_token: str, channel_id: str) -> dict:
    """Відправляє текст у Telegram канал."""
    url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
    payload = {'chat_id': channel_id, 'text': text, 'disable_web_page_preview': True}

    response = httpx.post(url, json=payload, timeout=30)
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


def main():
    # Перевірка обов'язкових змінних середовища
    required_env = [
        'ANTHROPIC_API_KEY',
        'OPENAI_API_KEY',
        'TELEGRAM_BOT_TOKEN',
        'TELEGRAM_CHANNEL_ID',
    ]
    missing = [v for v in required_env if not os.environ.get(v)]
    if missing:
        print(f'❌ Відсутні змінні середовища: {", ".join(missing)}')
        sys.exit(1)

    # Google Drive — опційно (якщо не налаштовано, пропускаємо)
    drive_enabled = bool(
        os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON') and
        os.environ.get('GOOGLE_DRIVE_FOLDER_ID')
    )
    if not drive_enabled:
        print('ℹ️  Google Drive не налаштовано — Instagram контент не зберігатиметься')

    bot_token = os.environ['TELEGRAM_BOT_TOKEN']
    channel_id = os.environ['TELEGRAM_CHANNEL_ID']
    channel_id_2 = os.environ.get('TELEGRAM_CHANNEL_ID_2', '').strip()
    date_str = datetime.now().strftime('%Y-%m-%d')

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

    # 3. Адаптація для Instagram (тільки якщо Drive налаштовано)
    instagram_text = None
    if drive_enabled:
        print('📸 Адаптація тексту для Instagram...')
        instagram_text = generate_instagram_post(post_text)
        print('─' * 50)
        print(instagram_text)
        print('─' * 50)
        print()

    # 4. Генерація промпту і зображення
    print('🎨 Генерація промпту для зображення...')
    image_prompt = generate_image_prompt(astro_context)
    print(f'Промпт: {image_prompt}')
    print()

    print('🖼️ Генерація зображення через DALL-E 3...')
    image_url, image_bytes = generate_image(image_prompt)
    print(f'URL зображення: {image_url[:60]}...')
    print()

    # 5. Збереження Instagram контенту в Google Drive (якщо налаштовано)
    if drive_enabled:
        print('💾 Збереження Instagram контенту в Google Drive...')
        drive_links = save_instagram_content_to_drive(image_bytes, instagram_text, date_str)
        print(f'🖼️  Зображення: {drive_links["image_link"]}')
        print(f'📝 Текст:       {drive_links["text_link"]}')
        print()
    else:
        print('⏭️  Пропуск Google Drive (секрети не задано)')
        print()

    # 6. Публікація в перший Telegram канал
    publish_to_telegram_channel(image_url, post_text, bot_token, channel_id, 'Канал 1')

    # 7. Публікація в другий Telegram канал (якщо вказано)
    if channel_id_2:
        publish_to_telegram_channel(image_url, post_text, bot_token, channel_id_2, 'Канал 2')
    else:
        print('ℹ️  TELEGRAM_CHANNEL_ID_2 не вказано — пропускаємо другий канал')


if __name__ == '__main__':
    main()
