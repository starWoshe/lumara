#!/usr/bin/env python3
"""
meta_publisher.py — Спільний модуль публікації в Meta платформи
LUMARA Academy · Використовується всіма агентами (LUNA, ARCAS, NUMI, UMBRA)

Підтримує:
  - Facebook Pages (текст + фото)
  - Instagram Business (фото + підпис)
  - Threads (текст, опційно фото)

Важливо: Threads User ID = Instagram User ID (той самий Meta Graph API).

Змінні середовища для кожного акаунту:
  {NAME}_PAGE_ACCESS_TOKEN   — постійний Page Access Token (не закінчується)
  {NAME}_PAGE_ID             — ID Facebook Page (LUMARA, LUNA, ARCAS, NUMI, UMBRA)
  {NAME}_IG_USER_ID          — ID Instagram Business / Threads Account (один ID для обох)
"""

import os
import time
import httpx
from dataclasses import dataclass
from typing import Optional

GRAPH_API = 'https://graph.facebook.com/v19.0'


@dataclass
class MetaAccount:
    """Описує один акаунт Meta для публікації."""
    name: str                              # 'luna', 'arcas', 'lumara' тощо
    page_id: str                           # Facebook Page ID
    page_access_token: str                 # Постійний Page Access Token
    ig_user_id: Optional[str] = None      # Instagram Business / Threads Account ID


def load_account(name: str) -> Optional[MetaAccount]:
    """
    Завантажує MetaAccount з env змінних за іменем агента.
    Повертає None якщо PAGE_ID або PAGE_ACCESS_TOKEN не вказано.
    """
    prefix = name.upper()
    page_id = os.environ.get(f'{prefix}_PAGE_ID', '').strip()
    page_token = os.environ.get(f'{prefix}_PAGE_ACCESS_TOKEN', '').strip()
    if not page_id or not page_token:
        return None
    return MetaAccount(
        name=name,
        page_id=page_id,
        page_access_token=page_token,
        ig_user_id=os.environ.get(f'{prefix}_IG_USER_ID', '').strip() or None,
    )


# ── Facebook Page ──────────────────────────────────────────────────────────────

def post_to_facebook_page(
    page_id: str,
    page_token: str,
    message: str,
    image_url: Optional[str] = None,
) -> str:
    """Публікує пост на Facebook Page. З image_url → фото + підпис. Повертає ID поста."""
    if image_url:
        url = f'{GRAPH_API}/{page_id}/photos'
        params = {'url': image_url, 'caption': message[:63206], 'access_token': page_token}
        r = httpx.post(url, params=params, timeout=60)
        # Якщо /photos потребує pages_read_engagement (deprecated) — падаємо на текстовий пост
        if r.status_code == 403 and 'pages_read_engagement' in r.text:
            print(f'    Facebook [{page_id}]: /photos потребує pages_read_engagement, використовуємо /feed')
            url = f'{GRAPH_API}/{page_id}/feed'
            params = {'message': message[:63206], 'access_token': page_token}
            r = httpx.post(url, params=params, timeout=60)
    else:
        url = f'{GRAPH_API}/{page_id}/feed'
        params = {'message': message[:63206], 'access_token': page_token}
        r = httpx.post(url, params=params, timeout=60)

    if not r.is_success:
        print(f'    Facebook API [{page_id}] помилка: {r.status_code} {r.text[:200]}')
    r.raise_for_status()
    return r.json().get('id', '')


# ── Instagram Business ─────────────────────────────────────────────────────────

def post_to_instagram(ig_user_id: str, page_token: str, image_url: str, caption: str) -> str:
    """Публікує фото в Instagram. Повертає ID поста."""
    # Крок 1: створити контейнер
    r = httpx.post(
        f'{GRAPH_API}/{ig_user_id}/media',
        params={'image_url': image_url, 'caption': caption[:2200], 'access_token': page_token},
        timeout=60,
    )
    if not r.is_success:
        print(f'    Instagram create [{ig_user_id}] помилка: {r.status_code} {r.text[:200]}')
    r.raise_for_status()
    container_id = r.json()['id']

    time.sleep(3)  # Meta рекомендує паузу між create і publish

    # Крок 2: опублікувати
    r2 = httpx.post(
        f'{GRAPH_API}/{ig_user_id}/media_publish',
        params={'creation_id': container_id, 'access_token': page_token},
        timeout=60,
    )
    if not r2.is_success:
        print(f'    Instagram publish [{ig_user_id}] помилка: {r2.status_code} {r2.text[:200]}')
    r2.raise_for_status()
    return r2.json()['id']


# ── Threads ────────────────────────────────────────────────────────────────────

def post_to_threads(
    ig_user_id: str,  # Threads User ID = Instagram User ID
    page_token: str,
    text: str,
    image_url: Optional[str] = None,
) -> str:
    """Публікує в Threads. Повертає ID поста."""
    params: dict = {'access_token': page_token}
    if image_url:
        params.update({'media_type': 'IMAGE', 'image_url': image_url, 'text': text[:500]})
    else:
        params.update({'media_type': 'TEXT', 'text': text[:500]})

    r = httpx.post(f'{GRAPH_API}/{ig_user_id}/threads', params=params, timeout=60)
    if not r.is_success:
        print(f'    Threads create [{ig_user_id}] помилка: {r.status_code} {r.text[:200]}')
    r.raise_for_status()
    container_id = r.json()['id']

    time.sleep(5)

    r2 = httpx.post(
        f'{GRAPH_API}/{ig_user_id}/threads_publish',
        params={'creation_id': container_id, 'access_token': page_token},
        timeout=60,
    )
    if not r2.is_success:
        print(f'    Threads publish [{ig_user_id}] помилка: {r2.status_code} {r2.text[:200]}')
    r2.raise_for_status()
    return r2.json()['id']


# ── Головна функція публікації ─────────────────────────────────────────────────

def publish_to_meta(
    account: MetaAccount,
    facebook_text: str,
    instagram_caption: str,
    image_url: Optional[str] = None,
    skip_facebook: bool = False,
    skip_instagram: bool = False,
    skip_threads: bool = False,
) -> dict:
    """
    Публікує контент в усі Meta платформи для одного акаунту.
    Використовує постійний Page Access Token напряму.
    """
    results = {}
    page_token = account.page_access_token
    print(f'\n📡 Публікація для акаунту [{account.name}]...')

    if not skip_facebook:
        try:
            post_id = post_to_facebook_page(account.page_id, page_token, facebook_text, image_url)
            results['facebook'] = post_id
            print(f'  ✅ Facebook: {post_id}')
        except Exception as e:
            results['facebook'] = f'ERROR: {e}'
            print(f'  ❌ Facebook: {e}')

    if not skip_instagram and account.ig_user_id:
        if not image_url:
            print('  ⏭️  Instagram: пропущено (немає зображення)')
        else:
            try:
                post_id = post_to_instagram(account.ig_user_id, page_token, image_url, instagram_caption)
                results['instagram'] = post_id
                print(f'  ✅ Instagram: {post_id}')
            except Exception as e:
                results['instagram'] = f'ERROR: {e}'
                print(f'  ❌ Instagram: {e}')

    if not skip_threads and account.ig_user_id:
        try:
            post_id = post_to_threads(account.ig_user_id, page_token, facebook_text[:500], image_url)
            results['threads'] = post_id
            print(f'  ✅ Threads: {post_id}')
        except Exception as e:
            results['threads'] = f'ERROR: {e}'
            print(f'  ❌ Threads: {e}')

    return results


def publish_to_all_accounts(
    agent_name: str,
    facebook_text: str,
    instagram_caption: str,
    image_url: Optional[str] = None,
    also_post_to_lumara: bool = True,
) -> dict:
    """Публікує в акаунт агента + опційно в LUMARA Academy."""
    all_results = {}

    agent_account = load_account(agent_name)
    if agent_account:
        all_results[agent_name] = publish_to_meta(
            account=agent_account,
            facebook_text=facebook_text,
            instagram_caption=instagram_caption,
            image_url=image_url,
        )
    else:
        print(f'⚠️  Акаунт [{agent_name}] не налаштований (немає {agent_name.upper()}_PAGE_ID або _PAGE_ACCESS_TOKEN)')

    if also_post_to_lumara:
        lumara_account = load_account('lumara')
        if lumara_account:
            all_results['lumara'] = publish_to_meta(
                account=lumara_account,
                facebook_text=facebook_text,
                instagram_caption=instagram_caption,
                image_url=image_url,
            )
        else:
            print('⚠️  Акаунт LUMARA не налаштований (немає LUMARA_PAGE_ID або _PAGE_ACCESS_TOKEN)')

    return all_results
