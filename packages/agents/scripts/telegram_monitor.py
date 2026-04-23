#!/usr/bin/env python3
"""
Telegram моніторинг тематичних груп — активний пошук клієнтів
LUMARA Academy · Запускається кожні 15 хвилин (cron)

Обов'язкові змінні середовища:
  TELEGRAM_BOT_TOKEN       — токен Telegram бота
  ANTHROPIC_API_KEY        — ключ Anthropic API (для генерації відповідей)
  SUPABASE_URL             — URL Supabase проєкту
  SUPABASE_SERVICE_ROLE_KEY— Service Role Key для запису в БД

Опційні:
  TELEGRAM_MONITORED_GROUPS— JSON-список group_id через кому (за замовч. всі групи де є бот)
  TELEGRAM_MAX_PER_HOUR    — макс. відповідей на годину (default 5)
  TELEGRAM_STATE_FILE      — шлях до файлу стану (default ./telegram_monitor_state.json)
"""

import os
import sys
import json
import time
import random
import re
import httpx
import anthropic
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

# ── Конфігурація тригерних фраз ────────────────────────────────────────────────

TRIGGER_PHRASES = {
    'uk': [
        r'хочу дізнатись свій знак',
        r'що означає моє число',
        r'порадьте астролога',
        r'таро розклад',
        r'нумерологія дата народження',
        r'хочу консультацію',
        r'яка моя карта',
        r'що мені чекати',
        r'хочу прогноз',
    ],
    'ru': [
        r'хочу узнать свой знак',
        r'что означает моё число',
        r'посоветуйте астролога',
        r'расклад таро',
        r'нумерология дата рождения',
        r'хочу консультацию',
    ],
    'en': [
        r"what's my sign",
        r'tarot reading',
        r'numerology reading',
        r'astrology consultation',
        r'what does my number mean',
        r'looking for astrologer',
        r'spiritual guidance',
    ],
    'de': [
        r'was ist mein sternzeichen',
        r'tarot legung','numerologie',
        r'astrologie beratung',
        r'spirituelle führung',
    ],
}

# Маппінг теми → агент (якщо не вдається визначити — UMBRA за замовч.)
AGENT_BY_TOPIC_KEYWORDS = {
    'LUNA': ['знак', 'астролог', 'прогноз', 'натальна', 'транзит', 'гороскоп', 'місяць', 'планета', 'сонце'],
    'ARCAS': ['таро', 'карта', 'розклад', 'аркана', 'оракул', 'мажор', 'мінор'],
    'NUMI': ['нумеролог', 'число', 'дата народження', 'матриця долі', 'life path', 'психоматриця'],
    'UMBRA': ['психолог', 'стосунки', 'саморозвиток', 'тінь', 'архетип', 'емоції', 'травма', 'медитація', 'духовність'],
}

AGENT_CTA = {
    'LUNA': {
        'uk': 'Хочеш детальніший аналіз саме для тебе?\nПерші 15 повідомлень безкоштовно 🌙',
        'ru': 'Хочешь детальный анализ именно для тебя?\nПервые 15 сообщений бесплатно 🌙',
        'en': 'Want a detailed analysis just for you?\nFirst 15 messages are free 🌙',
        'de': 'Möchtest du eine detaillierte Analyse nur für dich?\nDie ersten 15 Nachrichten sind kostenlos 🌙',
    },
    'ARCAS': {
        'uk': 'Хочеш персональний розклад карт?\nПерші 15 повідомлень безкоштовно 🃏',
        'ru': 'Хочешь персональный расклад карт?\nПервые 15 сообщений бесплатно 🃏',
        'en': 'Want a personal card reading?\nFirst 15 messages are free 🃏',
        'de': 'Möchtest du eine persönliche Kartenlegung?\nDie ersten 15 Nachrichten sind kostenlos 🃏',
    },
    'NUMI': {
        'uk': 'Хочеш розрахунок своїх чисел долі?\nПерші 15 повідомлень безкоштовно 🔢',
        'ru': 'Хочешь расчёт своих чисел судьбы?\nПервые 15 сообщений бесплатно 🔢',
        'en': 'Want your destiny numbers calculated?\nFirst 15 messages are free 🔢',
        'de': 'Möchtest du deine Schicksalszahlen berechnen?\nDie ersten 15 Nachrichten sind kostenlos 🔢',
    },
    'UMBRA': {
        'uk': 'Хочеш розібратись у своєму внутрішньому стані?\nПерші 15 повідомлень безкоштовно 🌑',
        'ru': 'Хочешь разобраться в своём внутреннем состоянии?\nПервые 15 сообщений бесплатно 🌑',
        'en': 'Want to understand your inner state?\nFirst 15 messages are free 🌑',
        'de': 'Möchtest du deinen inneren Zustand verstehen?\nDie ersten 15 Nachrichten sind kostenlos 🌑',
    },
}

AGENT_URL = {
    'LUNA': 'https://lumara.fyi/chat/luna?utm_source=telegram&utm_medium=group_monitor',
    'ARCAS': 'https://lumara.fyi/chat/arcas?utm_source=telegram&utm_medium=group_monitor',
    'NUMI': 'https://lumara.fyi/chat/numi?utm_source=telegram&utm_medium=group_monitor',
    'UMBRA': 'https://lumara.fyi/chat/umbra?utm_source=telegram&utm_medium=group_monitor',
}

AGENT_SYSTEM_PROMPT = {
    'LUNA': """Ти — LUNA, астрологічний провідник LUMARA Academy.
Відповідай коротко (3-5 речень), конкретно і м'яко.
Дай корисну астрологічну думку — без загальних фраз.
Мова відповіді = мова запиту користувача.""",
    'ARCAS': """Ти — ARCAS, провідник Таро LUMARA Academy.
Відповідай коротко (3-5 речень), прямо і з глибиною.
Дай корисну думку через призму карт — без загальних фраз.
Мова відповіді = мова запиту користувача.""",
    'NUMI': """Ти — NUMI, нумеролог LUMARA Academy.
Відповідай коротко (3-5 речень), точно і спокійно.
Дай корисну нумерологічну думку — без загальних фраз.
Мова відповіді = мова запиту користувача.""",
    'UMBRA': """Ти — UMBRA, езо-психолог LUMARA Academy.
Відповідай коротко (3-5 речень), глибоко і без містики.
Дай корисну психологічну думку — без загальних фраз.
Мова відповіді = мова запиту користувача.""",
}

# ── Утиліти ────────────────────────────────────────────────────────────────────

def log(msg: str):
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    print(f'[{ts}] {msg}', flush=True)


def load_state(path: str) -> dict:
    try:
        return json.loads(Path(path).read_text(encoding='utf-8'))
    except Exception:
        return {'offset': 0, 'last_group_id': None, 'last_response_at': {}}


def save_state(path: str, state: dict):
    Path(path).write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding='utf-8')


def detect_language(text: str) -> str:
    """Визначає мову повідомлення за тригерними фразами або простою евристикою."""
    t = text.lower()
    scores = {}
    for lang, patterns in TRIGGER_PHRASES.items():
        scores[lang] = sum(1 for p in patterns if re.search(p, t))
    # Якщо тригерів немає — евристика за алфавітом
    if max(scores.values(), default=0) == 0:
        if re.search(r'[а-яіїєґ]', t):
            # Розрізнення uk/ru
            uk_markers = ['є', 'ї', 'ґ', 'і']
            ru_markers = ['ы', 'ъ', 'ё', 'э']
            uk_score = sum(t.count(m) for m in uk_markers)
            ru_score = sum(t.count(m) for m in ru_markers)
            return 'uk' if uk_score >= ru_score else 'ru'
        elif re.search(r'[äöüß]', t):
            return 'de'
        else:
            return 'en'
    return max(scores, key=scores.get)


def detect_agent(text: str) -> str:
    """Визначає найбільш відповідного агента за текстом."""
    t = text.lower()
    scores = {}
    for agent, keywords in AGENT_BY_TOPIC_KEYWORDS.items():
        scores[agent] = sum(1 for kw in keywords if kw in t)
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else 'UMBRA'


def get_recent_responses_from_db(supabase_url: str, supabase_key: str, hours: int = 1) -> list:
    """Отримує відповіді з БД за останні N годин."""
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    try:
        r = httpx.get(
            f'{supabase_url}/rest/v1/outreach_responses',
            headers={'apikey': supabase_key, 'Authorization': f'Bearer {supabase_key}'},
            params={'platform': 'eq.TELEGRAM_GROUP', 'created_at': f'gte.{since}', 'select': '*'},
            timeout=30,
        )
        r.raise_for_status()
        return r.json()
    except Exception as e:
        log(f'⚠️ Помилка читання з БД: {e}')
        return []


def save_response_to_db(
    supabase_url: str,
    supabase_key: str,
    agent_type: str,
    language: str,
    group_handle: Optional[str],
    external_thread_id: Optional[str],
    trigger_phrase: Optional[str],
    response_text: str,
    target_url: str,
    user_handle: Optional[str],
):
    """Зберігає відповідь в Supabase."""
    payload = {
        'platform': 'TELEGRAM_GROUP',
        'agent_type': agent_type,
        'language': language.upper(),
        'group_handle': group_handle,
        'external_thread_id': external_thread_id,
        'trigger_phrase': trigger_phrase,
        'response_text': response_text,
        'target_url': target_url,
        'user_handle': user_handle,
    }
    try:
        r = httpx.post(
            f'{supabase_url}/rest/v1/outreach_responses',
            headers={
                'apikey': supabase_key,
                'Authorization': f'Bearer {supabase_key}',
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
            },
            json=payload,
            timeout=30,
        )
        r.raise_for_status()
        log('  💾 Збережено в БД')
    except Exception as e:
        log(f'  ⚠️ Помилка збереження в БД: {e}')


def check_rate_limits(
    recent_responses: list,
    agent_type: str,
    group_id: str,
    max_per_hour: int,
    state: dict,
) -> tuple[bool, str]:
    """Перевіряє rate limits. Повертає (ok, reason)."""
    now_ts = time.time()
    hour_ago = now_ts - 3600

    # Кількість відповідей цього мага за годину
    agent_hour_count = sum(
        1 for r in recent_responses
        if r.get('agent_type') == agent_type
        and datetime.fromisoformat(r['created_at'].replace('Z', '+00:00')).timestamp() > hour_ago
    )
    if agent_hour_count >= max_per_hour:
        return False, f'ліміт {max_per_hour}/год для {agent_type}'

    # Не відповідати двічі підряд в одній групі
    if state.get('last_group_id') == group_id:
        return False, 'вже відповідали в цій групі останньою'

    # Пауза між відповідями (10-20 хв) — перевіряємо останню відповідь будь-якого мага
    last_at = state.get('last_response_at', {}).get(agent_type, 0)
    min_gap = 600  # 10 хвилин
    if now_ts - last_at < min_gap:
        return False, f'пауза між відповідями {int((min_gap - (now_ts - last_at))/60)}хв залишилось'

    return True, ''


def generate_response(agent_type: str, user_message: str, language: str) -> str:
    """Генерує відповідь через Claude."""
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
    system = AGENT_SYSTEM_PROMPT[agent_type]
    prompt = f"""Користувач написав у групі:
\"\"\"{user_message}\"\"\"\n\nНапиши корисну відповідь мовою '{language}' (uk=українська, ru=російська, en=англійська, de=німецька).
Відповідь має бути конкретною, короткою (3-5 речень), без реклами."""
    try:
        msg = client.messages.create(
            model='claude-sonnet-4-6',
            max_tokens=400,
            system=system,
            messages=[{'role': 'user', 'content': prompt}],
        )
        return msg.content[0].text.strip()
    except Exception as e:
        log(f'  ⚠️ Помилка Claude: {e}')
        return ''


def find_trigger(text: str) -> tuple[Optional[str], Optional[str]]:
    """Шукає тригерну фразу. Повертає (language, matched_phrase)."""
    t = text.lower()
    for lang, patterns in TRIGGER_PHRASES.items():
        for p in patterns:
            if re.search(p, t):
                return lang, p
    return None, None


# ── Telegram API ───────────────────────────────────────────────────────────────

class TelegramBot:
    def __init__(self, token: str):
        self.token = token
        self.base = f'https://api.telegram.org/bot{token}'

    def get_updates(self, offset: int, limit: int = 100) -> list:
        r = httpx.get(
            f'{self.base}/getUpdates',
            params={'offset': offset, 'limit': limit},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        if not data.get('ok'):
            raise RuntimeError(f'Telegram API error: {data}')
        return data.get('result', [])

    def send_message(self, chat_id: int, text: str, reply_to_message_id: Optional[int] = None) -> dict:
        payload = {
            'chat_id': chat_id,
            'text': text,
            'disable_web_page_preview': False,
        }
        if reply_to_message_id:
            payload['reply_to_message_id'] = reply_to_message_id
        r = httpx.post(f'{self.base}/sendMessage', json=payload, timeout=30)
        r.raise_for_status()
        return r.json()


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    required = ['TELEGRAM_BOT_TOKEN', 'ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
    missing = [v for v in required if not os.environ.get(v)]
    if missing:
        log(f'❌ Відсутні змінні середовища: {", ".join(missing)}')
        sys.exit(1)

    bot_token = os.environ['TELEGRAM_BOT_TOKEN']
    supabase_url = os.environ['SUPABASE_URL'].rstrip('/')
    supabase_key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    max_per_hour = int(os.environ.get('TELEGRAM_MAX_PER_HOUR', '5'))
    state_file = os.environ.get('TELEGRAM_STATE_FILE', 'telegram_monitor_state.json')
    monitored_groups_raw = os.environ.get('TELEGRAM_MONITORED_GROUPS', '').strip()
    monitored_groups = set()
    if monitored_groups_raw:
        try:
            monitored_groups = set(json.loads(monitored_groups_raw))
        except Exception:
            monitored_groups = set(map(int, monitored_groups_raw.split(',')))

    bot = TelegramBot(bot_token)
    state = load_state(state_file)
    offset = state.get('offset', 0)

    log('🔍 Отримання оновлень...')
    updates = bot.get_updates(offset)
    if not updates:
        log('⏭️ Немає нових оновлень')
        save_state(state_file, state)
        return

    log(f'📩 Отримано {len(updates)} оновлень')

    # Завантажуємо історію відповідей за останню годину для rate limiting
    recent_responses = get_recent_responses_from_db(supabase_url, supabase_key, hours=2)

    processed = 0
    for upd in updates:
        update_id = upd['update_id']
        if update_id >= offset:
            offset = update_id + 1

        msg = upd.get('message') or upd.get('channel_post')
        if not msg:
            continue

        chat = msg.get('chat', {})
        chat_type = chat.get('type', '')
        if chat_type not in ('group', 'supergroup'):
            continue

        chat_id = chat['id']
        if monitored_groups and chat_id not in monitored_groups:
            continue

        text = msg.get('text', '') or msg.get('caption', '')
        if not text:
            continue

        lang, trigger = find_trigger(text)
        if not lang:
            continue

        agent = detect_agent(text)
        group_handle = chat.get('username') or str(chat_id)
        user_handle = msg.get('from', {}).get('username')
        message_id = msg['message_id']

        log(f'🎯 Тригер в групі {group_handle}: "{trigger}" → {agent} ({lang})')

        ok, reason = check_rate_limits(recent_responses, agent, str(chat_id), max_per_hour, state)
        if not ok:
            log(f'  ⏸️ Пропущено: {reason}')
            continue

        # Генерація відповіді
        response_body = generate_response(agent, text, lang)
        if not response_body:
            continue

        cta = AGENT_CTA[agent].get(lang, AGENT_CTA[agent]['uk'])
        url = AGENT_URL[agent]
        full_response = f"{response_body}\n\n{cta}\n→ {url}"

        # Надсилання
        try:
            # Випадкова затримка перед відправкою (10-20 хв у завданні, але для cron це занадто
            # довго; робимо 10-60 секунд для безпеки)
            delay = random.randint(10, 60)
            log(f'  ⏳ Затримка {delay}с перед відправкою...')
            time.sleep(delay)

            bot.send_message(chat_id, full_response, reply_to_message_id=message_id)
            log(f'  ✅ Відправлено від {agent}')
            processed += 1

            # Оновлення state
            state['last_group_id'] = str(chat_id)
            state['last_response_at'] = state.get('last_response_at', {})
            state['last_response_at'][agent] = time.time()

            # Збереження в БД
            save_response_to_db(
                supabase_url, supabase_key,
                agent_type=agent,
                language=lang,
                group_handle=group_handle,
                external_thread_id=str(chat_id),
                trigger_phrase=trigger,
                response_text=full_response,
                target_url=url,
                user_handle=user_handle,
            )

            # Додати в recent_responses для подальших перевірок в цьому ж запуску
            recent_responses.append({
                'agent_type': agent,
                'created_at': datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            log(f'  ❌ Помилка відправки: {e}')

    state['offset'] = offset
    save_state(state_file, state)
    log(f'✅ Готово. Оброблено відповідей: {processed}')


if __name__ == '__main__':
    main()
