#!/usr/bin/env python3
"""
Telegram бот LUNA — щоденна публікація астрологічного прогнозу
Запускається через GitHub Actions cron о 07:00 UTC (09:00 Київ)

Потрібні змінні середовища:
  ANTHROPIC_API_KEY     — ключ Anthropic API
  TELEGRAM_BOT_TOKEN    — токен Telegram бота
  TELEGRAM_CHANNEL_ID   — ID каналу або @username
"""

import os
import sys
import json
import httpx
import anthropic
from datetime import datetime, timedelta

# Імпортуємо функції з astro_calendar.py
sys.path.insert(0, os.path.dirname(__file__))
from astro_calendar import build_calendar, format_daily_context

# Системний промпт LUNA для щоденного посту
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


def generate_daily_post(astro_context: str) -> str:
    """Генерує щоденний пост через Claude API."""
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])

    user_message = f"""На основі цих астрологічних даних напиши щоденний пост для Telegram-каналу LUMARA:

{astro_context}

Створи пост згідно формату в системному промпті."""

    message = client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=1000,
        system=LUNA_DAILY_SYSTEM_PROMPT,
        messages=[{'role': 'user', 'content': user_message}],
    )

    return message.content[0].text


def send_to_telegram(text: str, bot_token: str, channel_id: str) -> dict:
    """Відправляє повідомлення в Telegram канал."""
    url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
    payload = {
        'chat_id': channel_id,
        'text': text,
        'disable_web_page_preview': True,
    }

    response = httpx.post(url, json=payload, timeout=30)
    if not response.is_success:
        print(f'Telegram API відповідь: {response.text}')
    response.raise_for_status()
    return response.json()


def main():
    # Перевірка змінних середовища
    required_env = ['ANTHROPIC_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHANNEL_ID']
    missing = [v for v in required_env if not os.environ.get(v)]
    if missing:
        print(f'❌ Відсутні змінні середовища: {", ".join(missing)}')
        sys.exit(1)

    bot_token = os.environ['TELEGRAM_BOT_TOKEN']
    channel_id = os.environ['TELEGRAM_CHANNEL_ID']

    print('🔭 Обчислення астрономічного календаря...')
    calendar = build_calendar(30)
    astro_context = format_daily_context(calendar)

    print('📍 Астрологічний контекст:')
    print(astro_context)
    print()

    print('🤖 Генерація посту через Claude API...')
    post_text = generate_daily_post(astro_context)

    print('📝 Згенерований пост:')
    print('─' * 50)
    print(post_text)
    print('─' * 50)
    print()

    print(f'📤 Відправка в Telegram канал {channel_id}...')
    result = send_to_telegram(post_text, bot_token, channel_id)

    if result.get('ok'):
        msg_id = result['result']['message_id']
        print(f'✅ Пост опубліковано! message_id: {msg_id}')
    else:
        print(f'❌ Помилка Telegram: {result}')
        sys.exit(1)


if __name__ == '__main__':
    main()
