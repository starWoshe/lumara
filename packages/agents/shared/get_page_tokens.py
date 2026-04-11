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
  python get_page_tokens.py YOUR_60_DAY_USER_TOKEN
"""

import sys
import httpx

GRAPH_API = 'https://graph.facebook.com/v19.0'


def get_all_page_tokens(user_token: str) -> list[dict]:
    """Повертає всі Page Access Tokens до яких є доступ у цього User Token."""
    r = httpx.get(
        f'{GRAPH_API}/me/accounts',
        params={'access_token': user_token, 'fields': 'id,name,access_token,category'},
        timeout=30,
    )
    r.raise_for_status()
    return r.json().get('data', [])


def main():
    if len(sys.argv) < 2:
        print('Використання: python get_page_tokens.py YOUR_USER_TOKEN')
        sys.exit(1)

    user_token = sys.argv[1].strip()

    print('🔑 Отримую Page Access Tokens...\n')
    try:
        pages = get_all_page_tokens(user_token)
    except httpx.HTTPStatusError as e:
        print(f'❌ Помилка API: {e.response.status_code} {e.response.text}')
        sys.exit(1)

    if not pages:
        print('❌ Не знайдено жодної сторінки. Перевір права токену: pages_show_list, pages_manage_posts')
        sys.exit(1)

    print(f'Знайдено {len(pages)} сторінок:\n')
    print('─' * 70)

    for page in pages:
        name = page.get('name', 'Без назви')
        page_id = page.get('id', '')
        page_token = page.get('access_token', '')
        category = page.get('category', '')

        print(f'📄 {name} ({category})')
        print(f'   PAGE_ID    : {page_id}')
        print(f'   PAGE_TOKEN : {page_token}')
        print()

    print('─' * 70)
    print()
    print('📋 Команди для GitHub Secrets (встав у термінал):')
    print()

    # Маппінг назв сторінок на імена агентів (за ключовими словами)
    agent_map = {
        'luna': 'LUNA',
        'arcas': 'ARCAS',
        'numi': 'NUMI',
        'umbra': 'UMBRA',
        'lumara': 'LUMARA',
    }

    for page in pages:
        name = page.get('name', '').lower()
        page_id = page.get('id', '')
        page_token = page.get('access_token', '')

        # Визначаємо ім'я агента за назвою сторінки
        agent_prefix = None
        for key, prefix in agent_map.items():
            if key in name:
                agent_prefix = prefix
                break

        if agent_prefix:
            print(f'# {page.get("name")}')
            print(f'gh secret set {agent_prefix}_PAGE_ID --body "{page_id}"')
            print(f'gh secret set {agent_prefix}_PAGE_ACCESS_TOKEN --body "{page_token}"')
            print()
        else:
            print(f'# {page.get("name")} — не розпізнано, вкажи вручну:')
            print(f'# gh secret set ???_PAGE_ID --body "{page_id}"')
            print(f'# gh secret set ???_PAGE_ACCESS_TOKEN --body "{page_token}"')
            print()

    print('─' * 70)
    print('⚠️  УВАГА: Не зберігай цей вивід у файл — токени конфіденційні!')
    print('✅ Після збереження в GitHub Secrets можна оновити код на Page Access Tokens.')


if __name__ == '__main__':
    main()
