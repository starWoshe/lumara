#!/usr/bin/env python3
"""
get_page_tokens.py — Отримати постійні Page Access Tokens з User Token

Запускай ОДИН РАЗ локально. Результати зберігай як GitHub Secrets.

Page Access Token, отриманий з довгострокового User Token (60+ днів),
є ПОСТІЙНИМ і не закінчується, допоки:
  - ти не змінив пароль Facebook
  - ти не відкликав дозволи у додатку

Використання:
  pip install httpx
  python get_page_tokens.py YOUR_USER_TOKEN

Відомі Page IDs:
  LUMARA : 1109487505571319
  LUNA   : 1095963640263286
  ARCAS  : 1059568480573429
  UMBRA  : 1115612691630367
  NUMI   : 1064105853456868
"""

import sys
import httpx

GRAPH_API = 'https://graph.facebook.com/v19.0'

# Відомі Page IDs для кожного агента
PAGE_IDS = {
    'LUMARA': '1109487505571319',
    'LUNA':   '1095963640263286',
    'ARCAS':  '1059568480573429',
    'UMBRA':  '1115612691630367',
    'NUMI':  '1064105853456868',
}


def get_page_token(page_id: str, user_token: str) -> dict:
    """Отримує Page Access Token для конкретної сторінки по її ID."""
    r = httpx.get(
        f'{GRAPH_API}/{page_id}',
        params={'fields': 'id,name,access_token', 'access_token': user_token},
        timeout=30,
    )
    if not r.is_success:
        return {'error': r.text[:200], 'id': page_id}
    return r.json()


def main():
    if len(sys.argv) < 2:
        print('Використання: python get_page_tokens.py YOUR_USER_TOKEN')
        sys.exit(1)

    user_token = sys.argv[1].strip()

    print('🔑 Отримую Page Access Tokens по ID сторінок...\n')
    print('─' * 70)

    results = []
    for agent_name, page_id in PAGE_IDS.items():
        data = get_page_token(page_id, user_token)

        if 'error' in data:
            print(f'❌ {agent_name} ({page_id}): {data["error"]}')
            print()
            continue

        name = data.get('name', 'Без назви')
        token = data.get('access_token', '')

        print(f'✅ {agent_name} — {name}')
        print(f'   PAGE_ID    : {page_id}')
        print(f'   PAGE_TOKEN : {token[:40]}...')
        print()
        results.append((agent_name, page_id, token))

    print('─' * 70)
    print()
    print('📋 Команди для GitHub Secrets (встав у термінал):')
    print()

    for agent_name, page_id, token in results:
        print(f'# {agent_name}')
        print(f'gh secret set {agent_name}_PAGE_ID --body "{page_id}"')
        print(f'gh secret set {agent_name}_PAGE_ACCESS_TOKEN --body "{token}"')
        print()

    print('─' * 70)
    print('⚠️  УВАГА: Не зберігай цей вивід у файл — токени конфіденційні!')


if __name__ == '__main__':
    main()
