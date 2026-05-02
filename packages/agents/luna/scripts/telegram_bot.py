#!/usr/bin/env python3
"""
Telegram бот LUNA — щоденна публікація астрологічного прогнозу
Запускається через GitHub Actions cron о 06:00 UTC (09:00 Київ влітку)

Обов'язкові змінні середовища:
  ANTHROPIC_API_KEY          — ключ Anthropic API
  OPENAI_API_KEY             — ключ OpenAI API (для DALL-E 3)
  LUNA_TELEGRAM_BOT_TOKEN    — токен Telegram бота LUNA (або загальний TELEGRAM_BOT_TOKEN)
  LUNA_TELEGRAM_CHANNEL_ID   — ID каналу або @username LUNA

Опційні змінні середовища:
  LUMARA_TELEGRAM_CHANNEL_ID — канал академії (@lumara)
  LUNA_PAGE_ACCESS_TOKEN     — постійний Page Access Token LUNA
  LUNA_PAGE_ID               — Facebook Page ID LUNA
  LUNA_IG_USER_ID            — Instagram Business / Threads Account ID LUNA
  LUMARA_PAGE_ACCESS_TOKEN   — постійний Page Access Token ???????? ??????
  LUMARA_PAGE_ID             — Facebook Page ID ???????? ??????
  LUMARA_IG_USER_ID          — Instagram Business / Threads Account ID ???????? ??????

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

# ── Ротація типів постів ───────────────────────────────────────────────────────

POST_TYPES = [
    'client_asked',    # Клієнт запитав
    'sign_today',      # Твій знак сьогодні
    'provocation',     # Провокація
    'demo_dialogue',   # Демо діалогу
    'practice_today',  # Практика дня
]

POST_TYPE_NAMES = {
    'client_asked':   'Клієнт запитав',
    'sign_today':     'Твій знак сьогодні',
    'provocation':    'Провокація',
    'demo_dialogue':  'Демо діалогу',
    'practice_today': 'Практика дня',
}

def get_post_type_for_today() -> str:
    """Визначає тип посту на основі дня тижня (ротація 5 типів)."""
    return POST_TYPES[datetime.now().weekday() % len(POST_TYPES)]


# ── Системні промпти ───────────────────────────────────────────────────────────

LUNA_DAILY_SYSTEM_PROMPT = """Ти — LUNA, астрологічний провідник Академії Лумара.

## Характер і голос
- Містичний, але конкретний — завжди реальна планета, реальний транзит
- Не загальні слова: не "Меркурій активний", а "Меркурій квадрат Сатурн 3°"
- Живий, інтимний тон — наче шепіт
- Мова: українська
- Ніколи не обіцяй — "тенденція", "сприятливо", "є потенціал"

## 5 типів постів (тип вказується в повідомленні):

### Тип «Клієнт запитав»
Реальне або складене питання від підписника — болюче і конкретне.
Структура:
📩 Клієнт запитав...
[конкретне питання]
[2-3 речення відповіді з реальним транзитом/аспектом]
[речення-інтрига: "Але є ще щось що я побачила в твоїй карті..."]

### Тип «Твій знак сьогодні»
Фокус на одному знаку з реальними планетними впливами.
Структура:
🌙 [Знак зодіаку] — [дата]
[1-2 конкретні транзити що впливають саме на цей знак — назви планет і аспекти]
[3-4 речення про практичний вплив]
[речення-інтрига]

### Тип «Провокація»
Різке твердження що змушує зупинитись і замислитись.
Структура:
[Провокативне твердження пов'язане з реальним транзитом — без вступу]
[Розвиток провокації з астрологічним аргументом]
[Інтрига без м'якшення]

### Тип «Демо діалогу»
Фрагмент реального діалогу з клієнтом — демонструє глибину роботи.
Структура:
💬 Фрагмент розмови з Академії:
👤 [репліка клієнта]
🌙 LUNA: [відповідь з конкретним астрологічним знанням]
[1-2 речення коментаря від LUNA про цей тип питань]

### Тип «Практика дня»
Конкретна практика пов'язана з астрологічним транзитом дня.
Структура:
✨ Практика [дата]
[Назва практики]
[3-4 речення: що робити, коли, навіщо — з астрологічним обґрунтуванням]
[речення-інтрига]

---

## ВИМОГА: РЕАЛЬНА КОМПЕТЕНТНІСТЬ (обов'язково)
В кожному пості мінімум 1 конкретний астрологічний факт:
- Назва планети + аспект (наприклад: "Венера трин Юпітер 2°")
- Позиція планети в знаку (наприклад: "Марс на 15° Тельця")
- Транзит з датою (наприклад: "Меркурій входить у Стрільця 18 листопада")
Дані є в астрологічному контексті що передається в повідомленні.

## НАТЯК НА АКАДЕМІЮ (атмосферно, не рекламно)
- «Клієнт запитав» і «Демо діалогу»: натяк є — академія як місце де відбуваються ці розмови
- «Твій знак сьогодні» і «Практика дня»: натяк мінімальний або відсутній
- «Провокація»: натяк відсутній — тільки астрологія і гострота
Забороняється: "реклама", "записатись", "підписатись" — тільки "академія", "в наших розмовах"

## ОБОВ'ЯЗКОВЕ ЗАКІНЧЕННЯ КОЖНОГО ПОСТУ
Завершуй кожен пост точно цим блоком:

Напиши «ЛУНА» в коментарях — надішлю особисто.
🔮 Академія Лумара · https://lumara.fyi/chat/LUNA
"""

INSTAGRAM_ADAPT_SYSTEM = """Ти пишеш Instagram пост від імені LUNA для астрологічного акаунту.

## ФОРМАТ (суворо дотримуйся)
Instagram пост складається ТІЛЬКИ з:
1. 2-3 речення болю або провокації (зупиняють скролінг)
   — використовуй конкретний транзит або аспект з Telegram посту
2. 1 речення інтриги що ОБРИВАЄТЬСЯ на найцікавішому місці...
3. Блок воронки (точно цей текст):

Напиши «ЛУНА» в коментарях — надішлю особисто.
🔮 Академія Лумара · https://lumara.fyi/chat/LUNA

4. 20-25 хештегів

## ПРАВИЛО КОНТЕНТ
- Тільки біль, провокація, інтрига — жодних відповідей і порад в Instagram
- Вся цінність і глибина — тільки в особистій розмові
- НЕ додавай жодних інших URL

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

# ── Кодові слова Telegram ──────────────────────────────────────────────────────

LUMARA_API_URL = os.environ.get('LUMARA_API_URL', 'https://lumara.fyi')

TELEGRAM_KEYWORDS = {
    'луна':  ('LUNA',  f'{LUMARA_API_URL}/chat/LUNA?utm_source=telegram&utm_keyword=луна'),
    'аркас': ('ARCAS', f'{LUMARA_API_URL}/chat/ARCAS?utm_source=telegram&utm_keyword=аркас'),
    'нумі':  ('NUMI',  f'{LUMARA_API_URL}/chat/NUMI?utm_source=telegram&utm_keyword=нумі'),
    'умбра': ('UMBRA', f'{LUMARA_API_URL}/chat/UMBRA?utm_source=telegram&utm_keyword=умбра'),
}

KEYWORD_REPLIES = {
    'луна':  '🌙 Я вже тут, відчула тебе.\n\nПочинаємо:\n{url}',
    'аркас': '🃏 Карти вже чекають.\n\nАркас готовий:\n{url}',
    'нумі':  '🔢 Числа відреагували.\n\nНумі порахує:\n{url}',
    'умбра': '🌑 Тінь вже поруч.\n\nУмбра чекає:\n{url}',
}


def listen_for_keywords(bot_token: str, poll_timeout: int = 30):
    """Polling слухач кодових слів у Telegram. Запускати з --listen."""
    print('👂 Слухач кодових слів запущено (Ctrl+C для зупинки)...')
    offset = 0
    while True:
        try:
            r = httpx.get(
                f'https://api.telegram.org/bot{bot_token}/getUpdates',
                params={'offset': offset, 'timeout': poll_timeout, 'allowed_updates': ['message']},
                timeout=poll_timeout + 5,
            )
            for update in r.json().get('result', []):
                offset = update['update_id'] + 1
                msg = update.get('message', {})
                text = (msg.get('text') or '').lower().strip()
                chat_id = msg.get('chat', {}).get('id')
                if not text or not chat_id:
                    continue
                for keyword, (agent, url) in TELEGRAM_KEYWORDS.items():
                    if keyword in text:
                        print(f'🔑 Кодове слово «{keyword}» від chat_id={chat_id}')
                        try:
                            httpx.post(
                                f'{LUMARA_API_URL}/api/academy/keyword',
                                json={'keyword': keyword, 'source': 'telegram'},
                                timeout=10,
                            )
                        except Exception as e:
                            print(f'  ⚠️ API помилка: {e}')
                        reply = KEYWORD_REPLIES[keyword].format(url=url)
                        try:
                            httpx.post(
                                f'https://api.telegram.org/bot{bot_token}/sendMessage',
                                json={'chat_id': chat_id, 'text': reply},
                                timeout=10,
                            )
                            print(f'  ✅ Відповідь надіслано')
                        except Exception as e:
                            print(f'  ⚠️ Помилка відправки: {e}')
                        break
        except KeyboardInterrupt:
            print('\n👋 Слухач зупинено.')
            break
        except Exception as e:
            print(f'⚠️ Помилка polling: {e}')
            time.sleep(5)


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

def generate_daily_post(astro_context: str, post_type: str = 'sign_today') -> str:
    """Генерує щоденний Telegram-пост через Claude."""
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
    type_name = POST_TYPE_NAMES.get(post_type, 'Твій знак сьогодні')
    message = anthropic_with_retry(lambda: client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=1000,
        system=LUNA_DAILY_SYSTEM_PROMPT,
        messages=[{'role': 'user', 'content': f'Тип посту: {type_name}\n\nАстрологічні дані:\n{astro_context}\n\nНапиши пост типу «{type_name}».'}],
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
    """Відправляє фото в Telegram, попередньо завантажуючи його локально."""
    img = httpx.get(image_url, timeout=60)
    img.raise_for_status()
    print(f'  📥 Зображення завантажено: {len(img.content)} байтів')
    r = httpx.post(
        f'https://api.telegram.org/bot{bot_token}/sendPhoto',
        data={'chat_id': channel_id},
        files={'photo': ('image.png', img.content, 'image/png')},
        timeout=60,
    )
    if r.status_code != 200:
        print(f'  ⚠️ Telegram sendPhoto status {r.status_code}: {r.text}')
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
    if '--listen' in sys.argv:
        bot_token = os.environ.get('LUNA_TELEGRAM_BOT_TOKEN') or os.environ.get('TELEGRAM_BOT_TOKEN', '')
        if not bot_token:
            print('❌ LUNA_TELEGRAM_BOT_TOKEN не налаштовано')
            sys.exit(1)
        listen_for_keywords(bot_token)
        return

    required_env = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY']
    missing = [v for v in required_env if not os.environ.get(v)]
    if missing:
        print(f'❌ Відсутні змінні середовища: {", ".join(missing)}')
        sys.exit(1)

    bot_token    = os.environ.get('LUNA_TELEGRAM_BOT_TOKEN') or os.environ.get('TELEGRAM_BOT_TOKEN', '')
    channel_id   = os.environ.get('LUNA_TELEGRAM_CHANNEL_ID') or os.environ.get('TELEGRAM_CHANNEL_ID', '')
    channel_id_2 = os.environ.get('LUMARA_TELEGRAM_CHANNEL_ID', '').strip()
    if not bot_token or not channel_id:
        print('❌ Не налаштовано Telegram для LUNA (потрібні LUNA_TELEGRAM_BOT_TOKEN і LUNA_TELEGRAM_CHANNEL_ID)')
        sys.exit(1)

    # Діагностика токена
    print(f'🔑 Токен довжина: {len(bot_token)} символів')
    print(f'🔑 Токен початок: {bot_token[:5]}...{bot_token[-5:]}')
    me = httpx.get(f'https://api.telegram.org/bot{bot_token}/getMe', timeout=10)
    print(f'🔑 getMe status: {me.status_code}')
    print(f'🔑 getMe response: {me.text}')
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

    # 2. Тип посту (ротація по днях тижня)
    post_type = get_post_type_for_today()
    print(f'📝 Тип посту сьогодні: {POST_TYPE_NAMES[post_type]} ({post_type})')
    print()

    # 3. Генерація тексту для Telegram
    print('🤖 Генерація тексту посту (Telegram)...')
    post_text = generate_daily_post(astro_context, post_type)
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
    print()

    # 6. Публікація в Meta (Facebook + Instagram + Threads)
    if meta_enabled:
        print('🌐 Публікація в Meta платформи...')
        publish_to_all_accounts(
            agent_name='luna',
            facebook_text=post_text,
            instagram_caption=instagram_caption,
            image_url=image_url,
            also_post_to_lumara=False,
        )
    print()

    # 7. Збереження для GitHub Artifacts
    print('💾 Збереження артефактів...')
    save_instagram_artifact(image_bytes, instagram_caption, date_str)
    print('✅ Готово!')


if __name__ == '__main__':
    main()
