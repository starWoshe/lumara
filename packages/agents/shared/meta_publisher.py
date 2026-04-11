#!/usr/bin/env python3
"""
meta_publisher.py — Спільний модуль публікації в Meta платформи
LUMARA Academy · Використовується всіма агентами (LUNA, ARCAS, NUMI, UMBRA)

Підтримує:
  - Facebook Pages (текст + фото)
  - Instagram Business (фото + підпис)
  - Threads (текст, опційно фото)

Вхід: один 60-денний User Access Token → отримуємо Page Token для кожної сторінки.

Змінні середовища (обов'язково для кожного агента, що використовує Meta):
  META_USER_TOKEN          — 60-денний токен користувача Meta

Для кожного акаунту:
  {NAME}_PAGE_ID           — ID Facebook Page (LUMARA, LUNA, ARCAS, NUMI, UMBRA)
  {NAME}_IG_USER_ID        — ID Instagram Business Account
  {NAME}_THREADS_USER_ID   — ID Threads User (опційно)
"""

import os
import time
import httpx
from dataclasses import dataclass, field
from typing import Optional

GRAPH_API = 'https://graph.facebook.com/v19.0'


@dataclass
class MetaAccount:
    """Описує один акаунт Meta для публікації."""
    name: str                              # 'luna', 'arcas', 'lumara' тощо
    page_id: str                           # Facebook Page ID
    ig_user_id: Optional[str] = None      # Instagram Business Account ID
    threads_user_id: Optional[str] = None  # Threads User ID (опційно)


def load_account(name: str) -> Optional['MetaAccount']:
    """
    Завантажує MetaAccount з env змінних за іменем агента.
    Наприклад, load_account('luna') читає LUNA_PAGE_ID, LUNA_IG_USER_ID тощо.
    Повертає None якщо PAGE_ID не вказано.
    """
    prefix = name.upper()
    page_id = os.environ.get(f'{prefix}_PAGE_ID', '').strip()
    if not page_id:
        return None
    return MetaAccount(
        name=name,
        page_id=page_id,
        ig_user_id=os.environ.get(f'{prefix}_IG_USER_ID', '').strip() or None,
        threads_user_id=os.environ.get(f'{prefix}_THREADS_USER_ID', '').strip() or None,
    )


def get_page_access_token(page_id: str, user_token: str) -> str:
    """Отримує Page Access Token з User Access Token."""
    r = httpx.get(
        f'{GRAPH_API}/{page_id}',
        params={'fields': 'access_token', 'access_token': user_token},
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    if 'access_token' not in data:
        raise ValueError(f'Page Token не знайдено для {page_id}: {data}')
    return data['access_token']


# ── Facebook Page ──────────────────────────────────────────────────────────────

def post_to_facebook_page(
    page_id: str,
    page_token: str,
    message: str,
    image_url: Optional[str] = None,
) -> str:
    """
    Публікує пост на Facebook Page.
    З image_url → фото + підпис. Без → текстовий пост.
    Повертає ID поста.
    """
    if image_url:
        url = f'{GRAPH_API}/{page_id}/photos'
        params = {
            'url': image_url,
            'caption': message[:63206],
            'access_token': page_token,
        }
    else:
        url = f'{GRAPH_API}/{page_id}/feed'
        params = {
            'message': message[:63206],
            'access_token': page_token,
        }

    r = httpx.post(url, params=params, timeout=60)
    if not r.is_success:
        print(f'    Facebook API [{page_id}] помилка: {r.status_code} {r.text[:200]}')
    r.raise_for_status()
    return r.json().get('id', '')


# ── Instagram Business ─────────────────────────────────────────────────────────

def _instagram_create_container(ig_user_id: str, page_token: str, image_url: str, caption: str) -> str:
    """Крок 1: створює медіа-контейнер, повертає creation_id."""
    r = httpx.post(
        f'{GRAPH_API}/{ig_user_id}/media',
        params={
            'image_url': image_url,
            'caption': caption[:2200],
            'access_token': page_token,
        },
        timeout=60,
    )
    if not r.is_success:
        print(f'    Instagram create [{ig_user_id}] помилка: {r.status_code} {r.text[:200]}')
    r.raise_for_status()
    return r.json()['id']


def _instagram_publish_container(ig_user_id: str, page_token: str, container_id: str) -> str:
    """Крок 2: публікує контейнер, повертає ID поста."""
    r = httpx.post(
        f'{GRAPH_API}/{ig_user_id}/media_publish',
        params={
            'creation_id': container_id,
            'access_token': page_token,
        },
        timeout=60,
    )
    if not r.is_success:
        print(f'    Instagram publish [{ig_user_id}] помилка: {r.status_code} {r.text[:200]}')
    r.raise_for_status()
    return r.json()['id']


def post_to_instagram(ig_user_id: str, page_token: str, image_url: str, caption: str) -> str:
    """Публікує фото в Instagram. Повертає ID поста."""
    container_id = _instagram_create_container(ig_user_id, page_token, image_url, caption)
    time.sleep(3)  # Meta рекомендує паузу між create і publish
    return _instagram_publish_container(ig_user_id, page_token, container_id)


# ── Threads ────────────────────────────────────────────────────────────────────

def post_to_threads(
    threads_user_id: str,
    page_token: str,
    text: str,
    image_url: Optional[str] = None,
) -> str:
    """
    Публікує в Threads. Повертає ID поста.
    Threads потребує окремого схвалення Meta App — перевір налаштування додатку.
    """
    params: dict = {'access_token': page_token}
    if image_url:
        params.update({'media_type': 'IMAGE', 'image_url': image_url, 'text': text[:500]})
    else:
        params.update({'media_type': 'TEXT', 'text': text[:500]})

    # Крок 1: створити контейнер
    r = httpx.post(f'{GRAPH_API}/{threads_user_id}/threads', params=params, timeout=60)
    if not r.is_success:
        print(f'    Threads create [{threads_user_id}] помилка: {r.status_code} {r.text[:200]}')
    r.raise_for_status()
    container_id = r.json()['id']

    time.sleep(5)

    # Крок 2: опублікувати
    r2 = httpx.post(
        f'{GRAPH_API}/{threads_user_id}/threads_publish',
        params={'creation_id': container_id, 'access_token': page_token},
        timeout=60,
    )
    if not r2.is_success:
        print(f'    Threads publish [{threads_user_id}] помилка: {r2.status_code} {r2.text[:200]}')
    r2.raise_for_status()
    return r2.json()['id']


# ── Головна функція публікації ─────────────────────────────────────────────────

def publish_to_meta(
    account: MetaAccount,
    user_token: str,
    facebook_text: str,
    instagram_caption: str,
    image_url: Optional[str] = None,
    threads_text: Optional[str] = None,
    skip_facebook: bool = False,
    skip_instagram: bool = False,
    skip_threads: bool = False,
) -> dict:
    """
    Публікує контент в усі Meta платформи для одного акаунту.

    Args:
        account: MetaAccount з ID платформ
        user_token: 60-денний User Access Token
        facebook_text: текст для Facebook (може бути довший)
        instagram_caption: текст для Instagram (до 2200 символів з хештегами)
        image_url: публічний URL зображення (обов'язковий для Instagram)
        threads_text: текст для Threads (до 500 символів), якщо None — використовує facebook_text
        skip_*: пропустити конкретну платформу

    Returns:
        dict з результатами: {'facebook': post_id, 'instagram': post_id, 'threads': post_id}
        Значення може бути 'ERROR: ...' якщо публікація не вдалась.
    """
    results = {}
    print(f'\n📡 Публікація для акаунту [{account.name}]...')

    # Отримуємо Page Access Token
    try:
        page_token = get_page_access_token(account.page_id, user_token)
    except Exception as e:
        print(f'  ❌ Не вдалось отримати Page Token: {e}')
        return {'error': str(e)}

    # Facebook Page
    if not skip_facebook:
        try:
            post_id = post_to_facebook_page(account.page_id, page_token, facebook_text, image_url)
            results['facebook'] = post_id
            print(f'  ✅ Facebook: {post_id}')
        except Exception as e:
            results['facebook'] = f'ERROR: {e}'
            print(f'  ❌ Facebook: {e}')

    # Instagram (потребує зображення)
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

    # Threads
    if not skip_threads and account.threads_user_id:
        text_for_threads = threads_text or facebook_text[:500]
        try:
            post_id = post_to_threads(account.threads_user_id, page_token, text_for_threads, image_url)
            results['threads'] = post_id
            print(f'  ✅ Threads: {post_id}')
        except Exception as e:
            results['threads'] = f'ERROR: {e}'
            print(f'  ❌ Threads: {e}')

    return results


def publish_to_all_accounts(
    agent_name: str,
    user_token: str,
    facebook_text: str,
    instagram_caption: str,
    image_url: Optional[str] = None,
    threads_text: Optional[str] = None,
    also_post_to_lumara: bool = True,
) -> dict:
    """
    Зручна обгортка: публікує в акаунт агента + опційно в LUMARA Academy.

    Returns:
        dict: {account_name: {platform: post_id}}
    """
    all_results = {}

    # Акаунт самого агента (LUNA, ARCAS, NUMI, UMBRA)
    agent_account = load_account(agent_name)
    if agent_account:
        all_results[agent_name] = publish_to_meta(
            account=agent_account,
            user_token=user_token,
            facebook_text=facebook_text,
            instagram_caption=instagram_caption,
            image_url=image_url,
            threads_text=threads_text,
        )
    else:
        print(f'⚠️  Акаунт [{agent_name}] не налаштований (немає {agent_name.upper()}_PAGE_ID)')

    # Акаунт LUMARA Academy (якщо налаштований)
    if also_post_to_lumara:
        lumara_account = load_account('lumara')
        if lumara_account:
            all_results['lumara'] = publish_to_meta(
                account=lumara_account,
                user_token=user_token,
                facebook_text=facebook_text,
                instagram_caption=instagram_caption,
                image_url=image_url,
                threads_text=threads_text,
            )
        else:
            print('⚠️  Акаунт LUMARA не налаштований (немає LUMARA_PAGE_ID)')

    return all_results
