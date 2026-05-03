#!/usr/bin/env python3
"""
Auth ACADEMY UserBot locally.
After successful auth, session auto-saves to Supabase.
"""

import os
import sys

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv

load_dotenv('.env.local', override=True)

required = ['ACADEMY_API_ID', 'ACADEMY_API_HASH', 'SUPABASE_SERVICE_ROLE_KEY']
missing = [v for v in required if not os.environ.get(v)]
if not os.environ.get('SUPABASE_URL') and not os.environ.get('NEXT_PUBLIC_SUPABASE_URL'):
    missing.append('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)')
if missing:
    print(f'MISSING ENV: {", ".join(missing)}')
    print('Add them to .env.local')
    sys.exit(1)

os.environ['ACTIVE_USERBOTS'] = 'academy'
os.environ['ACADEMY_USERBOT_MODE'] = 'warmup'
os.environ['USERBOT_ENABLED'] = 'true'
if not os.environ.get('SUPABASE_URL') and os.environ.get('NEXT_PUBLIC_SUPABASE_URL'):
    os.environ['SUPABASE_URL'] = os.environ['NEXT_PUBLIC_SUPABASE_URL']

print('========================================')
print('ACADEMY UserBot Authorization')
print('========================================')
print('Telethon will ask for phone number and SMS code.')
print('Make sure VPN is ON!')
print('')

sys.path.insert(0, 'packages/agents/scripts')
from userbot_luna import main

if __name__ == '__main__':
    main()
