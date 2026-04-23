#!/usr/bin/env python3
"""
Моніторинг коментарів Instagram — автовідповіді від магів
LUMARA Academy · Запускається кожні 10 хвилин (cron)

Обов'язкові змінні середовища:
  ANTHROPIC_API_KEY        — ключ Anthropic API
  SUPABASE_URL             — URL Supabase проєкту
  SUPABASE_SERVICE_ROLE_KEY— Service Role Key для запису в БД
  IG_ACCESS_TOKEN          — User Access Token з instagram_basic + instagram_manage_comments

Акаунти для моніторингу (хоча б один):
  LUNA_IG_USER_ID, ARCAS_IG_USER_ID, NUMI_IG_USER_ID, UMBRA_IG_USER_ID

Опційні:
  INSTAGRAM_MAX_PER_DAY    — макс. відповідей на день від акаунту (default 20)
  INSTAGRAM_STATE_FILE     — шлях до файлу стану (default ./instagram_monitor_state.json)
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

GRAPH_API = 'https://graph.facebook.com/v19.0'

# ── Конфігурація агентів ───────────────────────────────────────────────────────

AGENTS = ['LUNA', 'ARCAS', 'NUMI', 'UMBRA']

AGENT_SYSTEM_PROMPT = {
    'LUNA': """Ти — LUNA, астрологічний провідник LUMARA Academy.
Відповідай на коментар Instagram коротко (1-3 речення), тепло і містично.
Дай персональну астрологічну думку — без загальних фраз.
Мова відповіді = мова коментаря користувача.""",
    'ARCAS': """Ти — ARCAS, провідник Таро LUMARA Academy.
Відповідай на коментар Instagram коротко (1-3 речення), прямо і глибоко.
Дай персональну думку через призму карт — без загальних фраз.
Мова відповіді = мова коментаря користувача.""",
    'NUMI': """Ти — NUMI, нумеролог LUMARA Academy.
Відповідай на коментар Instagram коротко (1-3 речення), точно і спокійно.
Дай персональну нумерологічну думку — без загальних фраз.
Мова відповіді = мова коментаря користувача.""",
    'UMBRA': """Ти — UMBRA, езо-психолог LUMARA Academy.
Відповідай на коментар Instagram коротко (1-3 речення), глибоко і без містики.
Дай персональну психологічну думку — без загальних фраз.
Мова відповіді = мова коментаря користувача.""",
}

CTA_BY_LANG = {
    'uk': 'Хочеш більше — посилання в біо 👆',
    'ru': 'Хочешь больше — ссылка в био 👆',
    'en': 'Want more — link in bio 👆',
    'de': 'Mehr dazu — Link in Bio 👆',
}

DEFAULT_CTA = 'Want more — link in bio 👆'

# ── Утиліти ────────────────────────────────────────────────────────────────────

def log(msg: str):
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    print(f'[{ts}] {msg}', flush=True)


def load_state(path: str) -> dict:
    try:
        return json.loads(Path(path).read_text(encoding='utf-8'))
    except Exception:
        return {'processed_comment_ids': [], 'last_response_at': {}}


def save_state(path: str, state: dict):
    Path(path).write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding='utf-8')


def detect_language(text: str) -> str:
    t = text.lower()
    if re.search(r'[іїєґ]', t):
        return 'uk'
    if re.search(r'[ыъёэ]', t):
        return 'ru'
    if re.search(r'[äöüß]', t):
        return 'de'
    # Проста евристика для англійської
    common_en = ['the', 'and', 'you', 'what', 'my', 'for', 'is', 'are', 'love', 'thank']
    if any(w in t for w in common_en):
        return 'en'
    return 'uk'  # fallback


def generate_response(agent_type: str, comment_text: str, language: str, commenter_name: str) -> str:
    """Генерує відповідь через Claude."""
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
    system = AGENT_SYSTEM_PROMPT[agent_type]
    cta = CTA_BY_LANG.get(language, DEFAULT_CTA)
    prompt = f"""Користувач {commenter_name} залишив коментар в Instagram:
\"\"\"{comment_text}\"\"\"\n\nНапиши коротку (1-3 речення), персональну відповідь мовою '{language}'.
В кінці додай тільки цей CTA (без змін):
{cta}

Не використовуй хештеги. Відповідь має бути як реплай в Instagram."""
    try:
        msg = client.messages.create(
            model='claude-sonnet-4-6',
            max_tokens=250,
            system=system,
            messages=[{'role': 'user', 'content': prompt}],
        )
        return msg.content[0].text.strip()
    except Exception as e:
        log(f'  ⚠️ Помилка Claude: {e}')
        return ''


def get_recent_responses_from_db(supabase_url: str, supabase_key: str, platform: str, hours: int = 24) -> list:
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    try:
        r = httpx.get(
            f'{supabase_url}/rest/v1/outreach_responses',
            headers={'apikey': supabase_key, 'Authorization': f'Bearer {supabase_key}'},
            params={'platform': f'eq.{platform}', 'created_at': f'gte.{since}', 'select': '*'},
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
    external_post_id: Optional[str],
    external_thread_id: Optional[str],
    response_text: str,
    user_handle: Optional[str],
):
    payload = {
        'platform': 'INSTAGRAM_COMMENT',
        'agent_type': agent_type,
        'language': language.upper(),
        'external_post_id': external_post_id,
        'external_thread_id': external_thread_id,
        'response_text': response_text,
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


# ── Meta Graph API ─────────────────────────────────────────────────────────────

class InstagramMonitor:
    def __init__(self, access_token: str):
        self.token = access_token

    def _get(self, path: str, params: Optional[dict] = None) -> dict:
        p = {'access_token': self.token}
        if params:
            p.update(params)
        r = httpx.get(f'{GRAPH_API}{path}', params=p, timeout=30)
        r.raise_for_status()
        data = r.json()
        if 'error' in data:
            raise RuntimeError(f'Meta API error: {data["error"]}')
        return data

    def _post(self, path: str, params: Optional[dict] = None) -> dict:
        p = {'access_token': self.token}
        if params:
            p.update(params)
        r = httpx.post(f'{GRAPH_API}{path}', params=p, timeout=30)
        r.raise_for_status()
        data = r.json()
        if 'error' in data:
            raise RuntimeError(f'Meta API error: {data["error"]}')
        return data

    def get_media(self, ig_user_id: str, limit: int = 25) -> list:
        """Отримує останні пости акаунту."""
        data = self._get(f'/{ig_user_id}/media', {'fields': 'id,caption,permalink', 'limit': limit})
        return data.get('data', [])

    def get_comments(self, media_id: str, limit: int = 50) -> list:
        """Отримує коментарі під постом."""
        data = self._get(f'/{media_id}/comments', {'fields': 'id,text,username,timestamp', 'limit': limit})
        return data.get('data', [])

    def reply_to_comment(self, comment_id: str, message: str) -> dict:
        """Відповідає на коментар."""
        return self._post(f'/{comment_id}/replies', {'message': message[:2200]})


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    required = ['ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'IG_ACCESS_TOKEN']
    missing = [v for v in required if not os.environ.get(v)]
    if missing:
        log(f'❌ Відсутні змінні середовища: {", ".join(missing)}')
        sys.exit(1)

    supabase_url = os.environ['SUPABASE_URL'].rstrip('/')
    supabase_key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    access_token = os.environ['IG_ACCESS_TOKEN']
    max_per_day = int(os.environ.get('INSTAGRAM_MAX_PER_DAY', '20'))
    state_file = os.environ.get('INSTAGRAM_STATE_FILE', 'instagram_monitor_state.json')

    # Збір акаунтів для моніторингу
    accounts = []
    for agent in AGENTS:
        ig_id = os.environ.get(f'{agent}_IG_USER_ID', '').strip()
        if ig_id:
            accounts.append({'agent': agent, 'ig_user_id': ig_id})

    if not accounts:
        log('⚠️ Не налаштовано жодного IG_USER_ID для моніторингу')
        sys.exit(0)

    monitor = InstagramMonitor(access_token)
    state = load_state(state_file)
    processed_ids = set(state.get('processed_comment_ids', []))
    last_response_at = state.get('last_response_at', {})

    # Завантажуємо історію відповідей за останні 24 години для rate limiting
    recent_responses = get_recent_responses_from_db(supabase_url, supabase_key, 'INSTAGRAM_COMMENT', hours=24)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    total_processed = 0

    for acc in accounts:
        agent = acc['agent']
        ig_user_id = acc['ig_user_id']
        log(f'\n📸 [{agent}] Моніторинг Instagram акаунту {ig_user_id}...')

        # Rate limit: кількість відповідей цього агента за сьогодні
        agent_today_count = sum(
            1 for r in recent_responses
            if r.get('agent_type') == agent
            and datetime.fromisoformat(r['created_at'].replace('Z', '+00:00')) >= today_start
        )
        if agent_today_count >= max_per_day:
            log(f'  ⏸️ Денний ліміт {max_per_day} для {agent} досягнуто')
            continue

        # Пауза між відповідями (5-15 хв = 300-900 сек)
        now_ts = time.time()
        last_at = last_response_at.get(agent, 0)
        min_gap = 300  # 5 хвилин
        if now_ts - last_at < min_gap:
            log(f'  ⏸️ Пауза {int((min_gap - (now_ts - last_at))/60)}хв для {agent}')
            continue

        # Отримуємо пости
        try:
            posts = monitor.get_media(ig_user_id, limit=10)
        except Exception as e:
            log(f'  ❌ Помилка отримання постів: {e}')
            continue

        log(f'  📄 Знайдено {len(posts)} постів')

        for post in posts:
            media_id = post['id']
            try:
                comments = monitor.get_comments(media_id, limit=50)
            except Exception as e:
                log(f'    ❌ Помилка коментарів поста {media_id}: {e}')
                continue

            for comment in comments:
                comment_id = comment['id']
                if comment_id in processed_ids:
                    continue

                text = comment.get('text', '')
                username = comment.get('username', '')
                if not text or not username:
                    processed_ids.add(comment_id)
                    continue

                # Пропускаємо власні коментарі (від імені сторінки)
                # Немає надійного способу визначити це тут, але зазвичай username буде іншим

                log(f'  💬 Новий коментар від @{username}: {text[:60]}...')

                lang = detect_language(text)
                reply_text = generate_response(agent, text, lang, username)
                if not reply_text:
                    processed_ids.add(comment_id)
                    continue

                # Додати ім'я на початок
                cta = CTA_BY_LANG.get(lang, DEFAULT_CTA)
                full_reply = f"@{username}, {reply_text}\n\n{cta}"

                # Надсилання
                try:
                    delay = random.randint(5, 15)
                    log(f'    ⏳ Затримка {delay}с...')
                    time.sleep(delay)

                    monitor.reply_to_comment(comment_id, full_reply)
                    log(f'    ✅ Відповідь відправлена')
                    total_processed += 1

                    processed_ids.add(comment_id)
                    last_response_at[agent] = time.time()

                    save_response_to_db(
                        supabase_url, supabase_key,
                        agent_type=agent,
                        language=lang,
                        external_post_id=media_id,
                        external_thread_id=comment_id,
                        response_text=full_reply,
                        user_handle=username,
                    )

                    # Оновити recent_responses
                    recent_responses.append({
                        'agent_type': agent,
                        'created_at': datetime.now(timezone.utc).isoformat(),
                    })

                    # Перевірити денний ліміт знову
                    agent_today_count += 1
                    if agent_today_count >= max_per_day:
                        log(f'  ⏸️ Денний ліміт {max_per_day} для {agent} досягнуто')
                        break
                except Exception as e:
                    err_str = str(e)
                    if 'instagram_manage_comments' in err_str.lower() or '(#10)' in err_str:
                        log(f'    ❌ Немає дозволу instagram_manage_comments. Перевір права токена.')
                    else:
                        log(f'    ❌ Помилка відповіді: {e}')
                    processed_ids.add(comment_id)

            if agent_today_count >= max_per_day:
                break

    # Обрізаємо processed_ids до останніх 5000
    processed_ids = set(list(processed_ids)[-5000:])

    state['processed_comment_ids'] = list(processed_ids)
    state['last_response_at'] = last_response_at
    save_state(state_file, state)
    log(f'\n✅ Готово. Всього відповідей: {total_processed}')


if __name__ == '__main__':
    main()
