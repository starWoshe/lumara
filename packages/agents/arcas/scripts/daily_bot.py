#!/usr/bin/env python3
"""
Щоденний бот ARCAS — Карта Таро дня
LUMARA Academy · Запускається о 09:00 UTC (12:00 Київ влітку)

Обов'язкові змінні середовища:
  ANTHROPIC_API_KEY          — ключ Anthropic API
  OPENAI_API_KEY             — ключ OpenAI API (для DALL-E 3)
  ARCAS_PAGE_ACCESS_TOKEN    — постійний Page Access Token ARCAS
  ARCAS_PAGE_ID              — Facebook Page ID ARCAS
  ARCAS_IG_USER_ID           — Instagram Business / Threads Account ID ARCAS
  LUMARA_PAGE_ACCESS_TOKEN   — постійний Page Access Token LUMARA Academy
  LUMARA_PAGE_ID             — Facebook Page ID LUMARA Academy
  LUMARA_IG_USER_ID          — Instagram Business / Threads Account ID LUMARA Academy
"""

import os
import sys
import time
import random
import hashlib
import httpx
import anthropic
from datetime import datetime
from pathlib import Path
from openai import OpenAI

# Спільний Meta publisher
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
from meta_publisher import publish_to_all_accounts

# ── Колода Таро (Мажорні Аркани) ──────────────────────────────────────────────

TAROT_MAJOR = [
    ('0', 'Блазень', 'The Fool'),
    ('I', 'Маг', 'The Magician'),
    ('II', 'Верховна Жриця', 'The High Priestess'),
    ('III', 'Імператриця', 'The Empress'),
    ('IV', 'Імператор', 'The Emperor'),
    ('V', 'Ієрофант', 'The Hierophant'),
    ('VI', 'Закохані', 'The Lovers'),
    ('VII', 'Колісниця', 'The Chariot'),
    ('VIII', 'Сила', 'Strength'),
    ('IX', 'Пустельник', 'The Hermit'),
    ('X', 'Колесо Фортуни', 'Wheel of Fortune'),
    ('XI', 'Правосуддя', 'Justice'),
    ('XII', 'Повішений', 'The Hanged Man'),
    ('XIII', 'Смерть', 'Death'),
    ('XIV', 'Поміркованість', 'Temperance'),
    ('XV', 'Диявол', 'The Devil'),
    ('XVI', 'Вежа', 'The Tower'),
    ('XVII', 'Зірка', 'The Star'),
    ('XVIII', 'Місяць', 'The Moon'),
    ('XIX', 'Сонце', 'The Sun'),
    ('XX', 'Страшний Суд', 'Judgement'),
    ('XXI', 'Світ', 'The World'),
]

# ── Системні промпти ───────────────────────────────────────────────────────────

ARCAS_SYSTEM_PROMPT = """Ти — ARCAS, провідник Таро і Оракулу LUMARA Academy.

Твій характер:
- Мудрий, загадковий, але доступний
- Говориш образами і символами, але пояснюєш їх практично
- Нікому не лякаєш — навіть "важкі" карти показуєш як шанс для трансформації
- Мова: українська

Твоя задача: написати пост про Карту Таро дня для Facebook і Instagram.

## Формат посту

```
🃏 Карта Таро на [дата]

[Номер] — [Назва карти]

[2-3 речення про загальну енергію карти сьогодні]

🔮 Що карта говорить:
• [аспект 1 — сфера: стосунки / кар'єра / внутрішній стан]
• [аспект 2]
• [аспект 3]

💡 Практика дня:
[Одна конкретна дія або спостереження, яке рекомендує карта]

❓ Питання для роздуму:
[Одне питання для особистої рефлексії]

✨ [Коротка мудра цитата або фінальна думка — 1 речення]

#таро #карта_дня #lumara #езотерика #оракул
```

## Правила
- Довжина: 180-300 слів
- Не пиши "сьогодні станеться X" — пиши "є енергія для X", "сприятливо для X"
- Навіть карти Вежа, Смерть, Диявол — описуй як трансформацію, не як загрозу
- "Практика дня" — конкретна і виконувана за 5-10 хвилин

## ПРАВИЛО ІНТРИГА (обов'язково)
Пост ніколи не розкриває все.
Завжди є щось що людина може дізнатись тільки в особистому діалозі з ARCAS.
Закінчуй на найцікавішому місці — обривай коли читач найбільше хоче дізнатись більше.

## ПРАВИЛО ІНДИВІДУАЛЬНІСТЬ (обов'язково)
Після загального контенту додай речення:
"Але ця карта говорить по-різному для кожного — залежно від того, що зараз відбувається саме в тебе."

## ПРАВИЛО ВОРОНКА TELEGRAM (обов'язково, в кінці кожного посту)
Завершуй пост точно цим блоком (без хештегів):

🃏 Твоя карта вже витягнута — і вона говорить щось конкретно про тебе.
Скажи лише одне слово про те, що тебе зараз хвилює — і я прочитаю.
lumara.fyi/chat/arcas?utm_source=telegram&utm_medium=arcas
Перші 15 повідомлень безкоштовно
"""

INSTAGRAM_ADAPT_SYSTEM = """Ти пишеш Instagram пост від імені ARCAS для акаунту Таро і Оракулу.

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
  #таро #карта_дня #таротукраїна #оракул #езотерика #духовність #маги #містика
  #tarot #tarotreading #tarotoftheday #oracle #spiritual #mystic #divination
  #lumara #lumaraacademy #аркани #таротіст #щоденнетаро #таротерапія

Відповідай ТІЛЬКИ готовим Instagram-текстом.
"""

IMAGE_PROMPT_SYSTEM = """Ти генеруєш короткий англійський промпт для DALL-E 3.
Стиль: містична ілюстрація карти Таро, символічна, деталізована, темний фон, золоті акценти, старовинний стиль, ethereal atmosphere, dramatic lighting, digital art.
Відповідай ТІЛЬКИ промптом — без пояснень, без лапок."""


# ── Утиліти ────────────────────────────────────────────────────────────────────

def get_card_of_day(date: datetime) -> tuple[str, str, str]:
    """
    Визначає карту дня детерміновано за датою.
    Повертає (номер, назва_ua, назва_en).
    """
    date_str = date.strftime('%Y-%m-%d')
    hash_int = int(hashlib.sha256(date_str.encode()).hexdigest(), 16)
    index = hash_int % len(TAROT_MAJOR)
    return TAROT_MAJOR[index]


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

def generate_tarot_post(card_number: str, card_name_ua: str, card_name_en: str, date_str: str) -> str:
    """Генерує пост про Карту Таро дня через Claude."""
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
    message = anthropic_with_retry(lambda: client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=1000,
        system=ARCAS_SYSTEM_PROMPT,
        messages=[{
            'role': 'user',
            'content': f'Напиши пост про Карту Таро дня.\n\nДата: {date_str}\nКарта: {card_number} — {card_name_ua} ({card_name_en})',
        }],
    ))
    return message.content[0].text


def generate_instagram_caption(post_text: str) -> str:
    """Адаптує пост для Instagram через Claude."""
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
    message = anthropic_with_retry(lambda: client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=1000,
        system=INSTAGRAM_ADAPT_SYSTEM,
        messages=[{'role': 'user', 'content': f'Адаптуй для Instagram:\n\n{post_text}'}],
    ))
    return message.content[0].text


def generate_image_prompt(card_name_en: str, post_text: str) -> str:
    """Генерує промпт для зображення через Claude."""
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
    message = anthropic_with_retry(lambda: client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=200,
        system=IMAGE_PROMPT_SYSTEM,
        messages=[{
            'role': 'user',
            'content': f'Карта Таро: {card_name_en}\n\nКонтекст посту:\n{post_text[:300]}',
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


def save_artifact(image_bytes: bytes, instagram_text: str, card_name: str, date_str: str):
    """Зберігає контент для GitHub Artifacts."""
    output_dir = Path('instagram-content')
    output_dir.mkdir(exist_ok=True)
    slug = card_name.replace(' ', '_').replace("'", '')
    (output_dir / f'ARCAS_{slug}_{date_str}.png').write_bytes(image_bytes)
    (output_dir / f'ARCAS_{slug}_{date_str}.txt').write_text(instagram_text, encoding='utf-8')
    print(f'  📁 Збережено: instagram-content/ARCAS_{slug}_{date_str}.*')


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    required_env = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'ARCAS_PAGE_ACCESS_TOKEN', 'ARCAS_PAGE_ID']
    missing = [v for v in required_env if not os.environ.get(v)]
    if missing:
        print(f'❌ Відсутні змінні середовища: {", ".join(missing)}')
        sys.exit(1)

    now = datetime.now()
    date_str = now.strftime('%Y-%m-%d')

    # 1. Визначення карти дня
    card_number, card_name_ua, card_name_en = get_card_of_day(now)
    print(f'🃏 Карта дня: {card_number} — {card_name_ua} ({card_name_en})')
    print()

    # 2. Генерація тексту
    print('🤖 Генерація посту ARCAS...')
    post_text = generate_tarot_post(card_number, card_name_ua, card_name_en, date_str)
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
    image_prompt = generate_image_prompt(card_name_en, post_text)
    print(f'Промпт: {image_prompt}')
    print()

    print('🖼️  Генерація зображення (DALL-E 3)...')
    image_url, image_bytes = generate_image(image_prompt)
    print(f'URL: {image_url[:80]}...')
    print()

    # 5. Публікація в Meta
    print('🌐 Публікація в Meta платформи...')
    publish_to_all_accounts(
        agent_name='arcas',
        facebook_text=post_text,
        instagram_caption=instagram_caption,
        image_url=image_url,
        also_post_to_lumara=True,
    )
    print()

    # 6. Публікація в Telegram (якщо налаштовано)
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '').strip()
    channel_id = os.environ.get('ARCAS_TELEGRAM_CHANNEL_ID', '').strip()
    if bot_token and channel_id:
        print('📬 Публікація в Telegram...')
        publish_to_telegram(image_url, post_text, bot_token, channel_id, 'ARCAS')
    else:
        print('⏭️  Telegram — не налаштовано (ARCAS_TELEGRAM_CHANNEL_ID)')
    print()

    # 7. Зберегти артефакт
    print('💾 Збереження артефактів...')
    save_artifact(image_bytes, instagram_caption, card_name_ua, date_str)
    print('✅ ARCAS — готово!')


if __name__ == '__main__':
    main()
