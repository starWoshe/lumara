#!/usr/bin/env python3
"""
Telethon UserBot для магів LUMARA Academy.
Архітектура підтримує LUNA, ARCAS, NUMI, UMBRA — активується через ACTIVE_USERBOTS env.

Режими:
  warmup — тільки читання + реакції (5-7/день), пауза 30-120 хв
  active — відповіді з AI (1-2/день), пауза 40 хв - 4 год

Env:
  USERBOT_ENABLED=true|false
  ACTIVE_USERBOTS=luna,arcas,numi,umbra
  {MAGE}_API_ID, {MAGE}_API_HASH
  {MAGE}_USERBOT_MODE=warmup|active
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
  ANTHROPIC_API_KEY (для active режиму)
"""

import os
import sys
import time
import random
import asyncio
import signal
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from pathlib import Path

# Виправлення кодування для Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import FloodWaitError
import httpx
import anthropic

# Завантажуємо .env.local з кореня проєкту
env_path = Path(__file__).resolve().parent.parent.parent / '.env.local'
if env_path.exists():
    load_dotenv(dotenv_path=env_path, override=True)
else:
    load_dotenv(override=True)

# ── Конфігурація ──────────────────────────────────────────────────────────────

MAX_RUNTIME_MIN = 40

# Унікальна конфігурація для кожного мага — зменшує ризик паттерну для Telegram
MAGE_CONFIGS = {
    'LUNA': {
        'reaction_emojis': ['🌙', '✨', '💖', '🌕', '💫'],
        'min_reaction_pause_min': 25,
        'max_reaction_pause_min': 110,
        'min_message_pause_min': 35,
        'max_message_pause_min': 200,
        'max_reactions_per_day': 6,
        'max_messages_per_day': 2,
        'topic_keywords': [
            'астролог', 'гороскоп', 'знак', 'натальна', 'транзит', 'місяць', 'місячний',
            'цикл', 'повний місяць', 'новий місяць', 'планета', 'ретроград',
            'стосунки', 'кохання', 'партнер', 'чоловік', 'розлучення', 'сім\'я',
            'жіноча', 'криза', 'призначення', 'місія', 'покликання', 'доля',
        ],
    },
    'ARCAS': {
        'reaction_emojis': ['🔮', '🃏', '✨', '🌟', '💜'],
        'min_reaction_pause_min': 32,
        'max_reaction_pause_min': 125,
        'min_message_pause_min': 42,
        'max_message_pause_min': 220,
        'max_reactions_per_day': 5,
        'max_messages_per_day': 2,
        'topic_keywords': [
            'таро', 'карта', 'розклад', 'аркана', 'оракул', 'мажор', 'мінор',
            'руна', 'гадання', 'прогноз', 'долі', 'подія', 'вибір', 'рішення',
            'енергія', 'чакра', 'ритуал', 'захист', 'очищення', 'енергетика',
        ],
    },
    'NUMI': {
        'reaction_emojis': ['🔢', '✨', '💫', '📿', '🧿'],
        'min_reaction_pause_min': 28,
        'max_reaction_pause_min': 115,
        'min_message_pause_min': 38,
        'max_message_pause_min': 210,
        'max_reactions_per_day': 7,
        'max_messages_per_day': 1,
        'topic_keywords': [
            'нумеролог', 'число', 'дата народження', 'матриця долі', 'life path',
            'психоматриця', 'число долі', 'код долі', 'піфагор', 'вібрація',
            'сумісність', 'період', 'цикл', 'рік', 'місяць', 'день',
        ],
    },
    'UMBRA': {
        'reaction_emojis': ['🌑', '🖤', '✨', '🦋', '🌘'],
        'min_reaction_pause_min': 35,
        'max_reaction_pause_min': 130,
        'min_message_pause_min': 45,
        'max_message_pause_min': 240,
        'max_reactions_per_day': 5,
        'max_messages_per_day': 2,
        'topic_keywords': [
            'психолог', 'стосунки', 'емоції', 'тінь', 'архетип', 'саморозвиток',
            'травма', 'кодpendентність', 'внутрішній', 'дитина', 'підсвідоме',
            'медитація', 'практика', 'особистісний', 'ріст', 'трансформація',
        ],
    },
    'ACADEMY': {
        'reaction_emojis': ['🔮', '✨', '🌟', '💫', '🕯️'],
        'min_reaction_pause_min': 30,
        'max_reaction_pause_min': 120,
        'min_message_pause_min': 40,
        'max_message_pause_min': 210,
        'max_reactions_per_day': 6,
        'max_messages_per_day': 2,
        'topic_keywords': [
            'астролог', 'гороскоп', 'натальна', 'транзит', 'місяць',
            'таро', 'карта', 'розклад', 'аркана', 'оракул',
            'нумеролог', 'число', 'матриця долі', 'life path', 'вібрація',
            'психолог', 'стосунки', 'емоції', 'тінь', 'архетип', 'саморозвиток',
            'медитація', 'практика', 'енергія', 'чакра', 'ритуал', 'захист',
            'езотерика', 'духовність', 'карма', 'інтуїція', 'покликання',
        ],
    },
}

SYSTEM_PROMPTS = {
    'LUNA': (
        'Ти — LUNA, астрологічний провідник LUMARA Academy. '
        'Відповідай коротко (2-4 речення), тепло і емпатично. '
        'Теми: астрологія, місячні цикли, стосунки, жіночі кризи, призначення. '
        'Ніколи не рекламуй прямо. Максимум: "напиши мені в особисті якщо хочеш розібратись детальніше". '
        'Мова: українська або мова запиту.'
    ),
    'ARCAS': (
        'Ти — ARCAS, провідник Таро LUMARA Academy. '
        'Відповідай коротко (2-4 речення), глибоко і з теплом. '
        'Теми: таро, розклади, внутрішній пошук, рішення через карти. '
        'Ніколи не рекламуй прямо. Максимум: "напиши мені в особисті якщо хочеш розібратись детальніше". '
        'Мова: українська або мова запиту.'
    ),
    'NUMI': (
        'Ти — NUMI, нумеролог LUMARA Academy. '
        'Відповідай коротко (2-4 речення), точно і спокійно. '
        'Теми: нумерологія, матриця долі, числа життя, самопізнання. '
        'Ніколи не рекламуй прямо. Максимум: "напиши мені в особисті якщо хочеш розібратись детальніше". '
        'Мова: українська або мова запиту.'
    ),
    'UMBRA': (
        'Ти — UMBRA, езо-психолог LUMARA Academy. '
        'Відповідай коротко (2-4 речення), глибоко і без містики. '
        'Теми: психологія, стосунки, архетипи, тінь, саморозвиток. '
        'Ніколи не рекламуй прямо. Максимум: "напиши мені в особисті якщо хочеш розібратись детальніше". '
        'Мова: українська або мова запиту.'
    ),
    'ACADEMY': (
        'Ти — LUMARA Academy, езотерична академія нового покоління. '
        'Відповідай коротко (2-4 речення), тепло і підтримуючи. '
        'Теми: астрологія, таро, нумерологія, езо-психологія, саморозвиток, духовність. '
        'Ніколи не рекламуй прямо. Максимум: "заходь на lumara.fyi якщо хочеш глибше". '
        'Мова: українська або мова запиту.'
    ),
}


def log(mage: str, msg: str):
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    print(f'[{ts}] [{mage}] {msg}', flush=True)


# ── Supabase Store ────────────────────────────────────────────────────────────

class SupabaseStore:
    def __init__(self, url: str, key: str):
        self.url = url.rstrip('/')
        self.key = key
        self.headers_base = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
        }
        self.headers_json = {
            **self.headers_base,
            'Content-Type': 'application/json',
        }

    def get_session(self, mage: str) -> Optional[str]:
        try:
            r = httpx.get(
                f'{self.url}/rest/v1/userbot_sessions?mage=eq.{mage}&select=session_string',
                headers=self.headers_base,
                timeout=30,
            )
            if r.status_code == 200:
                data = r.json()
                return data[0]['session_string'] if data else None
        except Exception as e:
            log(mage, f'⚠️ Помилка читання сесії: {e}')
        return None

    def save_session(self, mage: str, session_string: str):
        try:
            r = httpx.post(
                f'{self.url}/rest/v1/userbot_sessions',
                headers={
                    **self.headers_json,
                    'Prefer': 'resolution=merge-duplicates,return=minimal',
                },
                json={'mage': mage.upper(), 'session_string': session_string},
                timeout=30,
            )
            r.raise_for_status()
            log(mage, '💾 Сесію збережено в Supabase')
        except Exception as e:
            log(mage, f'⚠️ Помилка збереження сесії: {e}')

    def get_groups(self, mage: str) -> List[Dict]:
        try:
            r = httpx.get(
                f'{self.url}/rest/v1/monitored_groups?assigned_mage=eq.{mage}&is_active=eq.true&select=*',
                headers=self.headers_base,
                timeout=30,
            )
            r.raise_for_status()
            return r.json()
        except Exception as e:
            log(mage, f'⚠️ Помилка читання груп: {e}')
            return []

    def log_action(
        self,
        mage: str,
        action: str,
        group_username: Optional[str] = None,
        message_preview: Optional[str] = None,
        metadata: Optional[dict] = None,
    ):
        payload = {
            'mage': mage.upper(),
            'action': action,
            'group_username': group_username,
            'message_preview': (message_preview[:200] if message_preview else None),
            'metadata': metadata,
        }
        try:
            httpx.post(
                f'{self.url}/rest/v1/userbot_logs',
                headers={
                    **self.headers_json,
                    'Prefer': 'return=minimal',
                },
                json=payload,
                timeout=30,
            )
        except Exception:
            pass

    def count_actions_today(self, mage: str, action: str) -> int:
        today_start = (
            datetime.now(timezone.utc)
            .replace(hour=0, minute=0, second=0, microsecond=0)
            .strftime('%Y-%m-%dT%H:%M:%S')
        )
        try:
            r = httpx.get(
                f'{self.url}/rest/v1/userbot_logs?mage=eq.{mage}&action=eq.{action}&created_at=gte.{today_start}&select=id',
                headers=self.headers_base,
                timeout=30,
            )
            if r.status_code == 200:
                return len(r.json())
        except Exception as e:
            log(mage, f'⚠️ Помилка count_actions_today: {e}')
        return 0

    def is_mage_enabled(self, mage: str) -> bool:
        """Читає admin_settings: userbot_{mage}_enabled. За замовч. True."""
        key = f'userbot_{mage.lower()}_enabled'
        try:
            r = httpx.get(
                f'{self.url}/rest/v1/admin_settings?key=eq.{key}&select=value',
                headers=self.headers_base,
                timeout=30,
            )
            if r.status_code == 200:
                data = r.json()
                if data:
                    return data[0]['value'] == 'true'
        except Exception:
            pass
        return True


# ── Rate Limiter ──────────────────────────────────────────────────────────────

class RateLimiter:
    def __init__(self, store: SupabaseStore, mage: str, mode: str, config: dict):
        self.store = store
        self.mage = mage.upper()
        self.mode = mode
        self.config = config

    def can_react(self) -> bool:
        if self.mode != 'warmup':
            return False
        count = self.store.count_actions_today(self.mage, 'REACTION')
        return count < self.config['max_reactions_per_day']

    def can_message(self) -> bool:
        if self.mode != 'active':
            return False
        count = self.store.count_actions_today(self.mage, 'MESSAGE')
        return count < self.config['max_messages_per_day']


# ── Mage UserBot ──────────────────────────────────────────────────────────────

class MageUserBot:
    def __init__(self, mage: str, mode: str, store: SupabaseStore):
        self.mage = mage.upper()
        self.mode = mode
        self.store = store
        self.config = MAGE_CONFIGS.get(self.mage, MAGE_CONFIGS['LUNA'])
        self.api_id = int(os.environ.get(f'{self.mage}_API_ID', '0') or '0')
        self.api_hash = os.environ.get(f'{self.mage}_API_HASH', '')
        self.client: Optional[TelegramClient] = None
        self.running = True
        self.start_time = time.time()

    def _timeout_reached(self) -> bool:
        elapsed_min = (time.time() - self.start_time) / 60
        return elapsed_min >= MAX_RUNTIME_MIN

    async def init_client(self):
        log(self.mage, f'🚀 Старт UserBot. Режим: {self.mode}, API_ID: {str(self.api_id)[:3]}***')
        session_str = self.store.get_session(self.mage)
        if session_str:
            log(self.mage, '🔑 Використовуємо збережену сесію з Supabase')
        else:
            log(self.mage, '🔑 Нова сесія (потрібна авторизація через код)')
        session = StringSession(session_str) if session_str else StringSession()
        self.client = TelegramClient(session, self.api_id, self.api_hash)
        await self.client.start()
        if not session_str:
            new_session = self.client.session.save()
            self.store.save_session(self.mage, new_session)
            log(self.mage, '🔐 Нова сесія збережена в Supabase')
        log(self.mage, '✅ Авторизовано в Telegram')

    async def run_warmup(self):
        limiter = RateLimiter(self.store, self.mage, self.mode, self.config)
        groups = self.store.get_groups(self.mage)
        log(self.mage, f'📋 Знайдено {len(groups)} активних груп для моніторингу')
        if not groups:
            log(self.mage, '⚠️ Немає активних груп для моніторингу')
            return

        random.shuffle(groups)
        reactions_done = 0
        errors_count = 0
        groups_visited = 0

        for group in groups:
            if not self.running or self._timeout_reached():
                log(self.mage, '⏹️ Таймаут або зупинка')
                break
            if not limiter.can_react():
                log(self.mage, '🔒 Досягнуто ліміт реакцій на сьогодні')
                break

            username = group.get('group_username')
            if not username:
                log(self.mage, f'⏭️ Пропущено групу без username: {group}')
                continue

            try:
                log(self.mage, f'🔍 Переходимо в @{username}...')
                entity = await self.client.get_entity(username)
                messages = await self.client.get_messages(entity, limit=15)
                groups_visited += 1
                log(self.mage, f'📖 Прочитано {len(messages)} повідомлень в @{username}')

                if not messages:
                    log(self.mage, f'⏭️ Немає повідомлень в @{username}, пропускаємо')
                    continue

                # Вибираємо випадкове повідомлення для реакції
                msg = random.choice(messages)
                emoji = random.choice(self.config['reaction_emojis'])
                preview = (msg.text or '')[:100]

                log(self.mage, f'👀 Обрано повідомлення ("{preview[:40]}...") для реакції {emoji}')
                await msg.react(emoji)
                reactions_done += 1
                self.store.log_action(
                    self.mage, 'REACTION', username, preview, {'emoji': emoji}
                )
                log(self.mage, f'❤️ Реакція {emoji} в @{username} — ✅ УСПІХ')

                # Оновлюємо last_visited
                self._update_group_last_visited(username)

                pause_sec = random.randint(self.config['min_reaction_pause_min'], self.config['max_reaction_pause_min']) * 60
                log(self.mage, f'⏳ Пауза {pause_sec // 60} хв перед наступною дією...')
                await asyncio.sleep(pause_sec)

            except FloodWaitError as e:
                wait = int(e.seconds * 1.2)
                log(self.mage, f'🌊 FloodWait: чекаємо {wait} сек...')
                self.store.log_action(
                    self.mage, 'ERROR', username, None, {'flood_wait_sec': wait}
                )
                errors_count += 1
                await asyncio.sleep(wait)
            except Exception as e:
                log(self.mage, f'⚠️ Помилка в групі @{username}: {e}')
                self.store.log_action(
                    self.mage, 'ERROR', username, None, {'error': str(e)}
                )
                errors_count += 1

        log(self.mage, f'🏁 Warmup завершено. Звіт: груп відвідано {groups_visited}, реакцій {reactions_done}, помилок {errors_count}')

    async def run_active(self):
        limiter = RateLimiter(self.store, self.mage, self.mode, self.config)
        groups = self.store.get_groups(self.mage)
        if not groups:
            log(self.mage, '⚠️ Немає активних груп для моніторингу')
            return

        anthropic_key = os.environ.get('ANTHROPIC_API_KEY')
        if not anthropic_key:
            log(self.mage, '❌ Відсутній ANTHROPIC_API_KEY для active режиму')
            return

        ai_client = anthropic.Anthropic(api_key=anthropic_key)
        messages_done = 0
        random.shuffle(groups)

        for group in groups:
            if not self.running or self._timeout_reached():
                log(self.mage, '⏹️ Таймаут або зупинка')
                break
            if not limiter.can_message():
                log(self.mage, '🔒 Досягнуто ліміт повідомлень на сьогодні')
                break

            username = group.get('group_username')
            if not username:
                continue

            try:
                entity = await self.client.get_entity(username)
                messages = await self.client.get_messages(entity, limit=20)
                if not messages:
                    continue

                # Збираємо контекст
                context_lines = []
                for m in messages:
                    if m.text:
                        sender = 'Користувач'
                        if m.sender and hasattr(m.sender, 'first_name') and m.sender.first_name:
                            sender = m.sender.first_name
                        context_lines.append(f'{sender}: {m.text}')
                context_text = '\n'.join(context_lines[-15:])

                if not self._is_relevant_topic(context_text):
                    log(self.mage, f'📭 Тема не релевантна в @{username}, пропускаємо')
                    continue

                reply = self._generate_reply(ai_client, context_text)
                if not reply:
                    log(self.mage, f'🤖 AI не згенерував відповідь для @{username}')
                    continue

                await self.client.send_message(entity, reply)
                messages_done += 1
                self.store.log_action(self.mage, 'MESSAGE', username, reply[:200])
                log(self.mage, f'💬 Відповідь надіслано в @{username}')

                self._update_group_last_visited(username)

                pause_sec = random.randint(self.config['min_message_pause_min'], self.config['max_message_pause_min']) * 60
                log(self.mage, f'⏳ Пауза {pause_sec // 60} хв перед наступною дією...')
                await asyncio.sleep(pause_sec)

            except FloodWaitError as e:
                wait = int(e.seconds * 1.2)
                log(self.mage, f'🌊 FloodWait: чекаємо {wait} сек...')
                self.store.log_action(
                    self.mage, 'ERROR', username, None, {'flood_wait_sec': wait}
                )
                await asyncio.sleep(wait)
            except Exception as e:
                log(self.mage, f'⚠️ Помилка в групі @{username}: {e}')
                self.store.log_action(
                    self.mage, 'ERROR', username, None, {'error': str(e)}
                )

        log(self.mage, f'🏁 Active завершено. Повідомлень сьогодні: {messages_done}')

    def _is_relevant_topic(self, text: str) -> bool:
        t = text.lower()
        return any(kw in t for kw in self.config['topic_keywords'])

    def _generate_reply(self, ai_client: anthropic.Anthropic, context: str) -> Optional[str]:
        system = SYSTEM_PROMPTS.get(self.mage, SYSTEM_PROMPTS['LUNA'])
        prompt = (
            f'Останні повідомлення у групі:\n{context}\n\n'
            'Напиши коротку підтримуючу відповідь (максимум 2-4 речення) українською. '
            'Якщо тема не стосується астрології, стосунків, саморозвитку або езотерики — '
            'поверни порожній рядок. Не використовуй хештеги. Будь теплою і емпатичною.'
        )
        try:
            msg = ai_client.messages.create(
                model='claude-sonnet-4-6',
                max_tokens=300,
                system=system,
                messages=[{'role': 'user', 'content': prompt}],
            )
            text = msg.content[0].text.strip()
            if not text or text.lower() in ('порожньо', '(порожньо)', 'none', ''):
                return None
            return text
        except Exception as e:
            log(self.mage, f'⚠️ Помилка генерації AI: {e}')
            return None

    def _update_group_last_visited(self, username: str):
        # Оновлення last_visited через Supabase REST
        try:
            httpx.patch(
                f'{self.store.url}/rest/v1/monitored_groups?group_username=eq.{username}',
                headers={
                    **self.store.headers_json,
                    'Prefer': 'return=minimal',
                },
                json={'last_visited': datetime.now(timezone.utc).isoformat()},
                timeout=30,
            )
        except Exception:
            pass

    async def run(self):
        try:
            await self.init_client()
            if self.mode == 'warmup':
                await self.run_warmup()
            elif self.mode == 'active':
                await self.run_active()
            else:
                log(self.mage, f'❓ Невідомий режим: {self.mode}')
        except Exception as e:
            log(self.mage, f'💥 Критична помилка: {e}')
            self.store.log_action(self.mage, 'ERROR', None, None, {'fatal': str(e)})
        finally:
            if self.client:
                await self.client.disconnect()
                log(self.mage, '👋 Відключено від Telegram')


# ── Main ──────────────────────────────────────────────────────────────────────

async def run_all(store: SupabaseStore):
    active_raw = os.environ.get('ACTIVE_USERBOTS', 'luna')
    active_mages = [m.strip().lower() for m in active_raw.split(',') if m.strip()]
    log('MAIN', f'📋 Активні маги: {active_mages}')

    tasks = []
    for mage in active_mages:
        if not store.is_mage_enabled(mage):
            log('MAIN', f'🔒 {mage.upper()} вимкнений в адмінці')
            continue
        mode = os.environ.get(f'{mage.upper()}_USERBOT_MODE', 'warmup')
        api_id = os.environ.get(f'{mage.upper()}_API_ID')
        api_hash = os.environ.get(f'{mage.upper()}_API_HASH')
        if not api_id or not api_hash:
            log('MAIN', f'⚠️ Пропущено {mage}: відсутній API_ID або API_HASH')
            continue
        bot = MageUserBot(mage, mode, store)
        tasks.append(bot.run())

    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
    else:
        log('MAIN', 'ℹ️ Немає активних магів для запуску')


def main():
    if os.environ.get('USERBOT_ENABLED', '').lower() != 'true':
        print('👋 USERBOT_ENABLED=false — бот вимкнений')
        sys.exit(0)

    supabase_url = os.environ.get('SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
    supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
    if not supabase_url or not supabase_key:
        print('❌ Відсутні SUPABASE_URL або SUPABASE_SERVICE_ROLE_KEY')
        sys.exit(1)

    store = SupabaseStore(supabase_url, supabase_key)
    asyncio.run(run_all(store))
    print('✅ Всі userbots завершено')


if __name__ == '__main__':
    main()
