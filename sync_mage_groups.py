#!/usr/bin/env python3
"""
Синхронізація груп магів з реальними діалогами Telegram.
Запускається локально або через GitHub Actions.

Використання:
  python sync_mage_groups.py --mage ACADEMY
  python sync_mage_groups.py --mage LUNA
  python sync_mage_groups.py --all
"""

import os
import sys
import argparse
from dotenv import load_dotenv

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv('.env.local', override=True)

from telethon import TelegramClient
from telethon.sessions import StringSession
import httpx

SUPABASE_URL = (os.environ.get('SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')).rstrip('/')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')

HEADERS_JSON = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
}

HEADERS_BASE = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
}


def get_session_from_supabase(mage: str) -> str | None:
    r = httpx.get(
        f'{SUPABASE_URL}/rest/v1/userbot_sessions?mage=eq.{mage}&select=session_string',
        headers=HEADERS_BASE,
        timeout=30,
    )
    if r.status_code == 200:
        data = r.json()
        return data[0]['session_string'] if data else None
    return None


def clear_groups_for_mage(mage: str):
    """Видаляє всі групи для мага перед синхронізацією."""
    r = httpx.delete(
        f'{SUPABASE_URL}/rest/v1/monitored_groups?assigned_mage=eq.{mage}',
        headers=HEADERS_BASE,
        timeout=30,
    )
    return r.status_code in (200, 204)


def add_group(mage: str, group_id: str, username: str, title: str):
    payload = {
        'assigned_mage': mage,
        'group_username': username or group_id,
        'group_title': title,
        'is_active': True,
    }
    r = httpx.post(
        f'{SUPABASE_URL}/rest/v1/monitored_groups',
        headers=HEADERS_JSON,
        json=payload,
        timeout=30,
    )
    return r.status_code in (201, 409)


async def sync_mage(mage: str):
    api_id = os.environ.get(f'{mage}_API_ID')
    api_hash = os.environ.get(f'{mage}_API_HASH')

    if not api_id or not api_hash:
        print(f'  Skipping {mage}: no API_ID/API_HASH')
        return

    session_str = get_session_from_supabase(mage)
    if not session_str:
        print(f'  Skipping {mage}: no session in Supabase. Run auth first.')
        return

    print(f'\n🔮 Syncing {mage}...')
    client = TelegramClient(StringSession(session_str), int(api_id), api_hash)
    await client.start()

    groups_found = []
    async for dialog in client.iter_dialogs():
        entity = dialog.entity
        if hasattr(entity, 'megagroup') or hasattr(entity, 'broadcast'):
            tid = f'-100{entity.id}'
            username = getattr(entity, 'username', None) or ''
            title = getattr(entity, 'title', '')
            groups_found.append({
                'id': tid,
                'username': username,
                'title': title,
            })

    await client.disconnect()

    if not groups_found:
        print(f'  No groups found for {mage}')
        return

    # Clear old groups and add new ones
    clear_groups_for_mage(mage)
    added = 0
    for g in groups_found:
        if add_group(mage, g['id'], g['username'], g['title']):
            added += 1
            print(f'  + {g["id"]} | @{g["username"]} | {g["title"]}')
        else:
            print(f'  ! Failed to add {g["id"]}')

    print(f'  Done: {added} groups synced for {mage}')


async def main():
    parser = argparse.ArgumentParser(description='Sync mage groups from Telegram dialogs')
    parser.add_argument('--mage', choices=['LUNA', 'ARCAS', 'NUMI', 'UMBRA', 'ACADEMY'], help='Sync specific mage')
    parser.add_argument('--all', action='store_true', help='Sync all mages that have sessions')
    args = parser.parse_args()

    mages = []
    if args.all:
        mages = ['LUNA', 'ARCAS', 'NUMI', 'UMBRA', 'ACADEMY']
    elif args.mage:
        mages = [args.mage]
    else:
        print('Usage: python sync_mage_groups.py --mage ACADEMY')
        print('       python sync_mage_groups.py --all')
        sys.exit(1)

    for mage in mages:
        await sync_mage(mage)

    print('\n✅ Sync complete!')


if __name__ == '__main__':
    import asyncio
    asyncio.run(main())
