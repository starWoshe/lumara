#!/usr/bin/env python3
"""
Налаштування Telegram webhooks для LUNA, ARCAS, NUMI, UMBRA.
Генерує секретний токен та встановлює webhooks через Bot API.

Запуск:
  python scripts/setup-telegram-webhooks.py

Вимоги:
  - Python 3.8+
  - httpx (pip install httpx)
  - .env.local з токенами ботів у корені проєкту
"""

import os
import sys
import secrets
import urllib.parse
from pathlib import Path

# Виправлення кодування для Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Спробуємо завантажити .env.local
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / '.env.local'
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=True)
        print(f"✅ Завантажено .env.local")
    else:
        print(f"⚠️ .env.local не знайдено ({env_path})")
except ImportError:
    print("⚠️ python-dotenv не встановлено, змінні беремо з оточення")

import httpx

BASE_URL = "https://lumara.fyi"
MAGES = [
    ('luna', 'LUNA_TELEGRAM_BOT_TOKEN'),
    ('arcas', 'ARCAS_TELEGRAM_BOT_TOKEN'),
    ('numi', 'NUMI_TELEGRAM_BOT_TOKEN'),
    ('umbra', 'UMBRA_TELEGRAM_BOT_TOKEN'),
]


def generate_secret() -> str:
    """Генерує випадковий секретний токен (32 байти → base64 ≈ 44 символи)."""
    return secrets.token_urlsafe(32)


def set_webhook(bot_token: str, mage: str, secret_token: str) -> dict:
    """Встановлює webhook для бота."""
    url = f"https://api.telegram.org/bot{bot_token}/setWebhook"
    webhook_url = f"{BASE_URL}/api/telegram/webhook/{mage}"
    payload = {
        "url": webhook_url,
        "secret_token": secret_token,
        "max_connections": 40,
    }
    try:
        response = httpx.post(url, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        return {"ok": False, "error": f"HTTP {e.response.status_code}: {e.response.text}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def get_webhook_info(bot_token: str) -> dict:
    """Отримує інформацію про поточний webhook."""
    url = f"https://api.telegram.org/bot{bot_token}/getWebhookInfo"
    try:
        response = httpx.get(url, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}


def main():
    print("=" * 60)
    print("🔮 Налаштування Telegram webhooks для LUMARA")
    print("=" * 60)

    # Збираємо токени
    tokens = {}
    missing = []
    for mage, env_name in MAGES:
        token = os.environ.get(env_name)
        if token:
            tokens[mage] = token
        else:
            missing.append(env_name)

    if missing:
        print(f"\n❌ Відсутні змінні середовища: {', '.join(missing)}")
        print("   Додай їх у .env.local або встанови як змінні оточення.")
        sys.exit(1)

    # Перевіряємо чи вже є TELEGRAM_WEBHOOK_SECRET
    existing_secret = os.environ.get('TELEGRAM_WEBHOOK_SECRET')
    if existing_secret:
        print(f"\n⚠️ Знайдено TELEGRAM_WEBHOOK_SECRET у .env.local")
        print(f"   Використовую його для встановлення webhooks.")
        secret_token = existing_secret
    else:
        secret_token = generate_secret()
        print(f"\n🔐 Згенеровано новий секретний токен:")
        print(f"   {secret_token}")
        print(f"\n⚠️ Збережи цей токен і додай у Vercel як TELEGRAM_WEBHOOK_SECRET!")

    print(f"\n📡 Базовий URL: {BASE_URL}")
    print(f"\n{'─' * 60}")

    # Встановлюємо webhooks
    all_ok = True
    for mage, env_name in MAGES:
        print(f"\n🌟 {mage.upper()}")
        token_preview = tokens[mage][:10] + "..." + tokens[mage][-5:]
        print(f"   Токен: {token_preview}")

        result = set_webhook(tokens[mage], mage, secret_token)
        if result.get("ok"):
            print(f"   ✅ Webhook встановлено: {BASE_URL}/api/telegram/webhook/{mage}")
        else:
            print(f"   ❌ Помилка: {result.get('error', result.get('description', 'Unknown'))}")
            all_ok = False

    print(f"\n{'─' * 60}")
    print("\n📋 Перевірка поточних webhooks:")

    for mage, env_name in MAGES:
        info = get_webhook_info(tokens[mage])
        if info.get("ok"):
            result = info.get("result", {})
            current_url = result.get("url", "—")
            pending = result.get("pending_update_count", 0)
            print(f"   {mage.upper()}: {current_url} (pending: {pending})")
        else:
            print(f"   {mage.upper()}: помилка отримання інформації")

    print(f"\n{'=' * 60}")

    if not existing_secret:
        print("\n⚠️  ВАЖЛИВО: Додай TELEGRAM_WEBHOOK_SECRET у Vercel!")
        print("   1. Vercel Dashboard → Project → Settings → Environment Variables")
        print(f"   2. Name: TELEGRAM_WEBHOOK_SECRET")
        print(f"   3. Value: {secret_token}")
        print("   4. Save → Redeploy")
    else:
        print("\n✅ TELEGRAM_WEBHOOK_SECRET вже налаштовано у .env.local")
        print("   Переконайся, що він також є у Vercel Production Environment Variables!")

    print("\n📖 Щоб оновити .env.local, додай рядок:")
    print(f'   TELEGRAM_WEBHOOK_SECRET={secret_token}')

    if all_ok:
        print("\n🎉 Готово! Всі webhooks налаштовані.")
    else:
        print("\n⚠️ Деякі webhooks не встановлено. Перевір помилки вище.")
        sys.exit(1)


if __name__ == "__main__":
    main()
