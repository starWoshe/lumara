#!/usr/bin/env python3
"""
Щоденний бот NUMI — Нумерологія дня
???????? ?????? · Запускається о 05:00 UTC (08:00 Київ влітку)

Обов'язкові змінні середовища:
  ANTHROPIC_API_KEY          — ключ Anthropic API
  OPENAI_API_KEY             — ключ OpenAI API (для DALL-E 3)
  NUMI_PAGE_ACCESS_TOKEN     — постійний Page Access Token NUMI
  NUMI_PAGE_ID               — Facebook Page ID NUMI

Опційні:
  NUMI_IG_USER_ID            — Instagram Business Account ID NUMI
  # Threads використовує той самий NUMI_IG_USER_ID
  LUMARA_PAGE_ACCESS_TOKEN   — постійний Page Access Token ???????? ??????
  LUMARA_PAGE_ID             — Facebook Page ID ???????? ??????
  LUMARA_IG_USER_ID          — Instagram Business / Threads Account ID ???????? ??????
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

# ── Нумерологія ────────────────────────────────────────────────────────────────

NUMBER_MEANINGS = {
    1: ('Початок і лідерство', 'Одиниця — число першопочатку, незалежності і особистої сили.'),
    2: ('Партнерство і баланс', 'Двійка — число співпраці, дипломатії та гармонії у стосунках.'),
    3: ('Творчість і вираження', 'Трійка — число самовираження, творчості та радості від спілкування.'),
    4: ('Стабільність і праця', 'Четвірка — число надійності, наполегливої праці та побудови основи.'),
    5: ('Свобода і зміни', "П'ятірка — число пригод, свободи та трансформацій через досвід."),
    6: ('Гармонія і турбота', 'Шістка — число відповідальності, любові та домашнього затишку.'),
    7: ('Мудрість і пошук', 'Сімка — число духовного пошуку, аналізу та внутрішньої мудрості.'),
    8: ('Сила і достаток', 'Вісімка — число матеріальної сили, бізнесу та karma balance.'),
    9: ('Завершення і мудрість', "Дев'ятка — число завершення циклів, альтруїзму та духовної зрілості."),
    11: ('Інтуїція і натхнення', 'Одинадцять — Майстер-число: підвищена інтуїція, духовне пробудження.'),
    22: ('Майстер-будівник', 'Двадцять два — Майстер-число: здатність втілювати великі мрії у реальність.'),
    33: ('Майстер-наставник', 'Тридцять три — Майстер-число: вища форма служіння та духовного навчання.'),
}

# ── Ротація типів постів ───────────────────────────────────────────────────────

POST_TYPES = [
    'client_asked',    # Клієнт запитав
    'number_today',    # Число дня
    'provocation',     # Провокація
    'demo_dialogue',   # Демо діалогу
    'practice_today',  # Практика дня
]

POST_TYPE_NAMES = {
    'client_asked':   'Клієнт запитав',
    'number_today':   'Число дня',
    'provocation':    'Провокація',
    'demo_dialogue':  'Демо діалогу',
    'practice_today': 'Практика дня',
}

def get_post_type_for_today() -> str:
    """Визначає тип посту на основі дня тижня (ротація 5 типів)."""
    return POST_TYPES[datetime.now().weekday() % len(POST_TYPES)]


# ── Системні промпти ───────────────────────────────────────────────────────────

NUMI_SYSTEM_PROMPT = """Ти — NUMI, нумерологічний провідник Академії Лумара.

Твій характер:
- Точний і структурований — як математика, але з глибиною
- Знаходиш числовий порядок у хаосі буднів
- Даєш конкретні поради, не абстрактні
- Мова: українська

## 5 типів постів (тип вказується в повідомленні):

### Тип «Клієнт запитав»
Реальне або складене питання від підписника — конкретне, про ситуацію в житті.
Структура:
📩 Клієнт запитав...
[конкретне питання]
[2-3 речення відповіді NUMI з реальним числовим розрахунком і архетипом]
[речення-інтрига: "Але є ще один код в твоїй даті..."]

### Тип «Число дня»
Нумерологічне число дня з реальним розрахунком.
Структура:
🔢 Нумерологія [дата]
Число дня: [число] — [назва архетипу]
[2-3 речення про вібрацію цього числа — конкретно, без абстракцій]
[3 аспекти впливу (стосунки / кар'єра / внутрішній стан)]
[речення-інтрига]

### Тип «Провокація»
Різке числове твердження що змушує зупинитись.
Структура:
[Провокативне твердження пов'язане з реальним числовим фактом — без вступу]
[Розвиток провокації з числовим аргументом]
[Інтрига без пом'якшення]

### Тип «Демо діалогу»
Фрагмент реального діалогу з клієнтом — демонструє глибину роботи.
Структура:
💬 Фрагмент розмови з Академії:
👤 [репліка клієнта]
🔢 NUMI: [відповідь з конкретним числовим розрахунком]
[1-2 речення коментаря від NUMI]

### Тип «Практика дня»
Конкретна практика пов'язана з числом або вібрацією дня.
Структура:
✨ Практика [дата]
[Назва практики і число що її надихнуло]
[3-4 речення: що робити, коли, навіщо — з числовим обґрунтуванням]
[речення-інтрига]

---

## ВИМОГА: РЕАЛЬНА КОМПЕТЕНТНІСТЬ (обов'язково)
В кожному пості мінімум 1 конкретний числовий факт:
- Нумерологічне число дня з розрахунком (наприклад: "2+5+0+4+2+0+2+6 = 21 → 3")
- Архетип числа з конкретним поясненням (наприклад: "3 — Творець: вираження, спілкування, радість")
- Майстер-числа 11, 22, 33 — підкреслювати їх особливість окремо

## НАТЯК НА АКАДЕМІЮ (атмосферно, не рекламно)
- «Клієнт запитав» і «Демо діалогу»: натяк є — академія як місце цих розрахунків
- «Число дня» і «Практика дня»: натяк мінімальний
- «Провокація»: натяк відсутній
Забороняється: "реклама", "записатись" — тільки "академія", "в наших розрахунках"

## ОБОВ'ЯЗКОВЕ ЗАКІНЧЕННЯ КОЖНОГО ПОСТУ
Завершуй кожен пост точно цим блоком:

Напиши «НУМІ» в коментарях — надішлю особисто.
🔮 Академія Лумара · https://lumara.fyi/chat/NUMI
"""

INSTAGRAM_ADAPT_SYSTEM = """Ти пишеш Instagram пост від імені NUMI для нумерологічного акаунту.

## ФОРМАТ (суворо дотримуйся)
Instagram пост складається ТІЛЬКИ з:
1. 2-3 речення болю або провокації (зупиняють скролінг)
   — використовуй конкретне число або архетип з Telegram посту
2. 1 речення інтриги що ОБРИВАЄТЬСЯ на найцікавішому місці...
3. Блок воронки (точно цей текст):

Напиши «НУМІ» в коментарях — надішлю особисто.
🔮 Академія Лумара · https://lumara.fyi/chat/NUMI

4. 20-25 хештегів

## ПРАВИЛО КОНТЕНТ
- Тільки біль, провокація, інтрига — жодних відповідей і порад в Instagram
- Вся цінність і глибина — тільки в особистій розмові
- НЕ додавай жодних інших URL

## Хештеги (після блоку воронки)
  #нумерологія #число_дня #нумерологіяукраїна #цифри #вібрація #духовність #езотерика
  #numerology #numbers #dailynumerology #spiritual #mystic #vibration #universe
  #lumara #lumaraacademy #числодня #нумерологічнийпрогноз #містика #енергіядня

Відповідай ТІЛЬКИ готовим Instagram-текстом.
"""

IMAGE_PROMPT_SYSTEM = """Ти генеруєш короткий англійський промпт для DALL-E 3.
Стиль: містична нумерологічна ілюстрація, велике світяче число в центрі, темний фон, геометричні патерни, сакральна геометрія, золоті або срібні акценти, cosmic atmosphere, digital art.
Відповідай ТІЛЬКИ промптом — без пояснень, без лапок."""


# ── Нумерологічний розрахунок ──────────────────────────────────────────────────

def calculate_day_number(date: datetime) -> int:
    """
    Нумерологічне число дня.
    Формула: сума всіх цифр дати (DD + MM + YYYY), зводимо до 1-9 або 11, 22, 33.
    """
    digits = date.strftime('%d%m%Y')  # наприклад '11042026'
    total = sum(int(d) for d in digits)

    # Зводимо до однозначного (зберігаємо Майстер-числа)
    while total > 9 and total not in (11, 22, 33):
        total = sum(int(d) for d in str(total))

    return total


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


# ── Генерація контенту ─────────────────────────────────────────────────────────

def generate_numi_post(day_number: int, date_str: str, post_type: str = 'number_today') -> str:
    """Генерує нумерологічний пост через Claude."""
    archetype, description = NUMBER_MEANINGS.get(day_number, ('Особливе число', ''))
    type_name = POST_TYPE_NAMES.get(post_type, 'Число дня')
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
    message = anthropic_with_retry(lambda: client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=900,
        system=NUMI_SYSTEM_PROMPT,
        messages=[{
            'role': 'user',
            'content': (
                f'Тип посту: {type_name}\n\n'
                f'Дата: {date_str}\n'
                f'Число дня: {day_number}\n'
                f'Архетип: {archetype}\n'
                f'Базовий опис: {description}\n\n'
                f'Напиши пост типу «{type_name}».'
            ),
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


def generate_image_prompt(day_number: int, post_text: str) -> str:
    """Генерує промпт для зображення через Claude."""
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
    message = anthropic_with_retry(lambda: client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=200,
        system=IMAGE_PROMPT_SYSTEM,
        messages=[{
            'role': 'user',
            'content': f'Число дня: {day_number}\n\nКонтекст:\n{post_text[:300]}',
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


def save_artifact(image_bytes: bytes, instagram_text: str, day_number: int, date_str: str):
    """Зберігає контент для GitHub Artifacts."""
    output_dir = Path('instagram-content')
    output_dir.mkdir(exist_ok=True)
    (output_dir / f'NUMI_{day_number}_{date_str}.png').write_bytes(image_bytes)
    (output_dir / f'NUMI_{day_number}_{date_str}.txt').write_text(instagram_text, encoding='utf-8')
    print(f'  📁 Збережено: instagram-content/NUMI_{day_number}_{date_str}.*')


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    print('🔍 ENV DIAGNOSTICS (daily_bot.py):')
    for k in sorted(os.environ.keys()):
        if any(x in k for x in ['ANTHROPIC', 'OPENAI', 'NUMI', 'LUMARA', 'IG_', 'TELEGRAM']):
            val = os.environ[k]
            print(f'  {k}: present (length {len(val)}, truthy={bool(val)})')
    print('---')

    required_env = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'NUMI_PAGE_ACCESS_TOKEN', 'NUMI_PAGE_ID']
    missing = [v for v in required_env if not os.environ.get(v)]
    if missing:
        print(f'❌ Відсутні змінні середовища: {", ".join(missing)}')
        sys.exit(1)

    now = datetime.now()
    date_str = now.strftime('%Y-%m-%d')

    # 1. Розрахунок числа дня
    day_number = calculate_day_number(now)
    archetype, _ = NUMBER_MEANINGS.get(day_number, ('Особливе число', ''))
    print(f'🔢 Число дня: {day_number} — {archetype}')
    print()

    # 1b. Тип посту (ротація по днях тижня)
    post_type = get_post_type_for_today()
    print(f'📝 Тип посту сьогодні: {POST_TYPE_NAMES[post_type]} ({post_type})')
    print()

    # 2. Генерація тексту
    print('🤖 Генерація посту NUMI...')
    post_text = generate_numi_post(day_number, date_str, post_type)
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
    image_prompt = generate_image_prompt(day_number, post_text)
    print(f'Промпт: {image_prompt}')
    print()

    print('🖼️  Генерація зображення (DALL-E 3)...')
    image_url, image_bytes = generate_image(image_prompt)
    print(f'URL: {image_url[:80]}...')
    print()

    # 5. Публікація в Meta
    print('🌐 Публікація в Meta платформи...')
    publish_to_all_accounts(
        agent_name='numi',
        facebook_text=post_text,
        instagram_caption=instagram_caption,
        image_url=image_url,
        also_post_to_lumara=False,
    )
    print()

    # 6. Публікація в Telegram (якщо налаштовано)
    bot_token = os.environ.get('NUMI_TELEGRAM_BOT_TOKEN', '').strip() or os.environ.get('TELEGRAM_BOT_TOKEN', '').strip()
    channel_id = os.environ.get('NUMI_TELEGRAM_CHANNEL_ID', '').strip() or os.environ.get('TELEGRAM_CHANNEL_ID', '').strip()
    if bot_token and channel_id:
        print('📬 Публікація в Telegram...')
        publish_to_telegram(image_url, post_text, bot_token, channel_id, 'NUMI')
    else:
        print('⏭️  Telegram — не налаштовано (NUMI_TELEGRAM_CHANNEL_ID')
    print()

    # 7. Артефакти
    print('💾 Збереження артефактів...')
    save_artifact(image_bytes, instagram_caption, day_number, date_str)
    print('✅ NUMI — готово!')


if __name__ == '__main__':
    main()
