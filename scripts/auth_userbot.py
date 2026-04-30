#!/usr/bin/env python3
"""
Скрипт першої авторизації UserBot через Telethon.
Зберігає сесію в Supabase — після першого запуску більше не потрібна авторизація.

Usage:
  python scripts/auth_userbot.py --mage luna
"""

import os
import sys
import argparse
from pathlib import Path

# Виправлення кодування для Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.sessions import StringSession
import httpx

# Завантажуємо .env.local з кореня проєкту
env_path = Path(__file__).resolve().parent.parent / '.env.local'
if env_path.exists():
    load_dotenv(dotenv_path=env_path, override=True)
else:
    # Fallback на звичайний .env
    load_dotenv(override=True)


def get_supabase_url_key():
    url = (os.environ.get('SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')).rstrip('/')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
    if not url or not key:
        print('❌ Відсутні змінні середовища: SUPABASE_URL або SUPABASE_SERVICE_ROLE_KEY')
        sys.exit(1)
    return url, key


def save_session(mage: str, session_string: str):
    url, key = get_supabase_url_key()
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
    }
    try:
        r = httpx.post(
            f'{url}/rest/v1/userbot_sessions',
            headers=headers,
            json={'mage': mage.upper(), 'session_string': session_string},
            timeout=30,
        )
        r.raise_for_status()
        print(f'💾 Сесію збережено в Supabase для {mage}')
    except Exception as e:
        print(f'❌ Помилка збереження сесії: {e}')
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='Авторизація Telethon UserBot для LUMARA Academy')
    parser.add_argument(
        '--mage',
        required=True,
        choices=['luna', 'arcas', 'numi', 'umbra'],
        help='Ім\'я мага для авторизації',
    )
    args = parser.parse_args()

    mage = args.mage.upper()
    api_id = os.environ.get(f'{mage}_API_ID')
    api_hash = os.environ.get(f'{mage}_API_HASH')

    if not api_id or not api_hash:
        print(f'❌ Відсутні змінні середовища: {mage}_API_ID та/або {mage}_API_HASH')
        sys.exit(1)

    print(f'🔮 Авторизація {mage}...')
    print('📱 Введи номер телефону коли запитає:')

    client = TelegramClient(StringSession(), int(api_id), api_hash)

    async def auth():
        await client.start()
        session_string = client.session.save()
        save_session(mage, session_string)
        print(f'✅ Авторизація {mage} успішна!')
        print('   Наступні запуски бота не вимагатимуть вводу коду.')

    with client:
        client.loop.run_until_complete(auth())


if __name__ == '__main__':
    main()
