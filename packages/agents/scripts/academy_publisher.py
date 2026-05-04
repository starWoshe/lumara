#!/usr/bin/env python3
"""
academy_publisher.py — Публікації Академії Лумара у вихідні
🔮 Академія · Запускається по суботах (cron)

Логіка:
  1. Читає активні плітки з Supabase (academy_gossip WHERE active=true)
  2. Claude генерує атмосферний пост від імені Академії (голос місця, не мага)
  3. Публікує в Instagram і Facebook від імені сторінки Академії
  4. Додає перший коментар: "🔮 Академія Лумара · @lumara\nМаги тут: lumara.fyi"

Обов'язкові змінні середовища:
  ANTHROPIC_API_KEY
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  ACADEMY_PAGE_ACCESS_TOKEN   — Page Access Token сторінки Академії
  ACADEMY_FB_PAGE_ID          — Facebook Page ID Академії

Опційні:
  ACADEMY_IG_USER_ID          — Instagram Business Account ID Академії
  IG_ACCESS_TOKEN             — спільний User Access Token (instagram_content_publish)
  ACADEMY_COVER_IMAGE_URL     — URL фонового зображення для Instagram поста
"""

import os
import sys
import time
import httpx
import anthropic
from datetime import datetime, timezone

GRAPH_API = 'https://graph.facebook.com/v19.0'

ACADEMY_FIRST_COMMENT = "🔮 Академія Лумара · @lumara\nМаги тут: lumara.fyi"

ACADEMY_SYSTEM_PROMPT = """Ти — голос Академії Лумара. Не маг, не людина — голос самого місця.

Правила:
- Вибери ОДНУ пліткуяк основу
- Не переказуй її прямо — натякни атмосферою
- 3-5 речень максимум
- Без імен магів прямо — тільки "хтось з наших", "один з них"
- Закінчити відкритим питанням або тишею
- Тон: стародавня бібліотека яка спостерігає

Заборонено:
- Пряма реклама
- Посилання в тексті поста
- Слова: магія, езотерика, астрологія, таро"""


def log(msg: str):
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    print(f'[{ts}] {msg}', flush=True)


def fetch_active_gossip(supabase_url: str, supabase_key: str) -> list:
    """Читає активні плітки з Supabase."""
    try:
        r = httpx.get(
            f'{supabase_url}/rest/v1/academy_gossip',
            headers={
                'apikey': supabase_key,
                'Authorization': f'Bearer {supabase_key}',
            },
            params={'active': 'eq.true', 'select': 'id,text', 'order': 'sort_order.asc'},
            timeout=30,
        )
        r.raise_for_status()
        items = r.json()
        return [item['text'] for item in items if item.get('text')]
    except Exception as e:
        log(f'⚠️ Помилка читання плітків: {e}')
        return []


def generate_academy_post(gossip_list: list) -> str:
    """Генерує пост від імені Академії через Claude."""
    if gossip_list:
        gossip_formatted = '\n'.join([f'- {g}' for g in gossip_list])
    else:
        gossip_formatted = '- Академія мовчить сьогодні...'

    prompt = (
        f'Активні плітки зараз:\n{gossip_formatted}\n\n'
        'Створи пост для Instagram/Facebook від імені Академії.\n'
        'Мова: українська.'
    )

    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
    try:
        msg = client.messages.create(
            model='claude-sonnet-4-6',
            max_tokens=400,
            system=ACADEMY_SYSTEM_PROMPT,
            messages=[{'role': 'user', 'content': prompt}],
        )
        return msg.content[0].text.strip()
    except Exception as e:
        log(f'❌ Помилка генерації поста: {e}')
        raise


def post_to_facebook(page_id: str, page_token: str, text: str) -> str:
    """Публікує текстовий пост на Facebook Page."""
    r = httpx.post(
        f'{GRAPH_API}/{page_id}/feed',
        params={'message': text[:63206], 'access_token': page_token},
        timeout=60,
    )
    if not r.is_success:
        log(f'  Facebook помилка: {r.status_code} {r.text[:300]}')
    r.raise_for_status()
    return r.json().get('id', '')


def post_first_comment(object_id: str, access_token: str, text: str, platform: str):
    """Додає перший коментар під постом."""
    try:
        r = httpx.post(
            f'{GRAPH_API}/{object_id}/comments',
            params={'access_token': access_token, 'message': text[:2200]},
            timeout=30,
        )
        if r.is_success:
            log(f'  ✅ Перший коментар під {platform} постом')
        else:
            log(f'  ⚠️ Коментар {platform} помилка: {r.status_code} {r.text[:200]}')
    except Exception as e:
        log(f'  ⚠️ Помилка коментаря {platform}: {e}')


def post_to_instagram(ig_user_id: str, ig_access_token: str, image_url: str, caption: str) -> str:
    """Публікує фото в Instagram. Потребує ACADEMY_COVER_IMAGE_URL."""
    r = httpx.post(
        f'{GRAPH_API}/{ig_user_id}/media',
        params={'image_url': image_url, 'caption': caption[:2200], 'access_token': ig_access_token},
        timeout=60,
    )
    if not r.is_success:
        err = r.text[:300]
        if '(#10)' in err or 'instagram_content_publish' in err.lower():
            raise PermissionError(f'Instagram: відсутній дозвіл instagram_content_publish. {err}')
        log(f'  Instagram create помилка: {r.status_code} {err}')
        r.raise_for_status()
    container_id = r.json()['id']

    time.sleep(10)

    r2 = httpx.post(
        f'{GRAPH_API}/{ig_user_id}/media_publish',
        params={'creation_id': container_id, 'access_token': ig_access_token},
        timeout=60,
    )
    if not r2.is_success:
        log(f'  Instagram publish помилка: {r2.status_code} {r2.text[:300]}')
    r2.raise_for_status()
    return r2.json()['id']


def main():
    required = ['ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
                'ACADEMY_PAGE_ACCESS_TOKEN', 'ACADEMY_FB_PAGE_ID']
    missing = [v for v in required if not os.environ.get(v)]
    if missing:
        log(f'❌ Відсутні змінні середовища: {", ".join(missing)}')
        log('\n📋 Інструкція для власника — додати в GitHub Secrets і Vercel:')
        log('  ACADEMY_PAGE_ACCESS_TOKEN  — Page Access Token сторінки Академії у Facebook')
        log('  ACADEMY_FB_PAGE_ID         — ID Facebook сторінки Академії')
        log('  ACADEMY_IG_USER_ID         — ID Instagram Business акаунту Академії (опційно)')
        log('  ACADEMY_COVER_IMAGE_URL    — URL фонового зображення для Instagram (опційно)')
        log('\nЯк отримати ACADEMY_PAGE_ACCESS_TOKEN:')
        log('  1. Відкрий https://developers.facebook.com/tools/explorer')
        log('  2. Обери додаток і сторінку Академії')
        log('  3. Запит: GET /me/accounts → знайди сторінку Академії → скопіюй access_token')
        log('  4. Конвертуй у довгостроковий через /oauth/access_token')
        sys.exit(1)

    supabase_url = os.environ['SUPABASE_URL'].rstrip('/')
    supabase_key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    page_token = os.environ['ACADEMY_PAGE_ACCESS_TOKEN']
    fb_page_id = os.environ['ACADEMY_FB_PAGE_ID']
    ig_user_id = os.environ.get('ACADEMY_IG_USER_ID', '').strip()
    ig_access_token = os.environ.get('IG_ACCESS_TOKEN', '').strip()
    cover_image_url = os.environ.get('ACADEMY_COVER_IMAGE_URL', '').strip()

    log('🔮 Академія Лумара — публікація посту у вихідні')
    log(f'📅 {datetime.now(timezone.utc).strftime("%A, %Y-%m-%d %H:%M UTC")}')

    # Читаємо активні плітки
    log('\n📖 Читаємо активні плітки...')
    gossip_list = fetch_active_gossip(supabase_url, supabase_key)
    if gossip_list:
        log(f'  Знайдено плітків: {len(gossip_list)}')
        for g in gossip_list:
            log(f'  · {g[:80]}...' if len(g) > 80 else f'  · {g}')
    else:
        log('  ⚠️ Плітки не знайдені — пост буде без конкретної основи')

    # Генеруємо пост
    log('\n✍️  Генеруємо пост через Claude...')
    post_text = generate_academy_post(gossip_list)
    log(f'\n📝 Текст поста:\n{post_text}\n')

    results = {}

    # Facebook
    log('📘 Публікація в Facebook...')
    try:
        fb_post_id = post_to_facebook(fb_page_id, page_token, post_text)
        results['facebook'] = fb_post_id
        log(f'  ✅ Facebook пост: {fb_post_id}')
        time.sleep(3)
        post_first_comment(fb_post_id, page_token, ACADEMY_FIRST_COMMENT, 'Facebook')
    except Exception as e:
        results['facebook'] = f'ERROR: {e}'
        log(f'  ❌ Facebook: {e}')

    # Instagram (тільки якщо є ACADEMY_IG_USER_ID + IG_ACCESS_TOKEN + COVER_IMAGE_URL)
    if ig_user_id and ig_access_token:
        if not cover_image_url:
            log('\n📸 Instagram: пропущено (немає ACADEMY_COVER_IMAGE_URL)')
            log('  Щоб публікувати в Instagram — встанови ACADEMY_COVER_IMAGE_URL у secrets')
        else:
            log('\n📸 Публікація в Instagram...')
            try:
                ig_post_id = post_to_instagram(ig_user_id, ig_access_token, cover_image_url, post_text)
                results['instagram'] = ig_post_id
                log(f'  ✅ Instagram пост: {ig_post_id}')
                time.sleep(3)
                post_first_comment(ig_post_id, ig_access_token, ACADEMY_FIRST_COMMENT, 'Instagram')
            except Exception as e:
                results['instagram'] = f'ERROR: {e}'
                log(f'  ❌ Instagram: {e}')
    else:
        log('\n📸 Instagram: пропущено (немає ACADEMY_IG_USER_ID або IG_ACCESS_TOKEN)')

    # Підсумок
    log('\n═══ Результат ═══')
    any_success = False
    for platform, result in results.items():
        if result.startswith('ERROR:'):
            log(f'  ❌ {platform}: {result}')
        else:
            log(f'  ✅ {platform}: {result}')
            any_success = True

    if not any_success and results:
        log('❌ Жодна публікація не вдалась')
        sys.exit(1)

    log('✅ Готово')


if __name__ == '__main__':
    main()
