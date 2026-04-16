'use client'

import { createBrowserClient } from '@supabase/ssr'

// Supabase клієнт для Client Components
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return document.cookie.split('; ').map((cookie) => {
            const [name, ...rest] = cookie.split('=')
            return { name, value: rest.join('=') }
          })
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = Object.entries(options || {})
              .map(([k, v]) => {
                if (k === 'maxAge') return `Max-Age=${v}`
                if (k === 'sameSite') return `SameSite=${v}`
                if (v === true) return k
                if (v === false || v === undefined || v === null) return null
                return `${k}=${v}`
              })
              .filter(Boolean)
              .join('; ')
            document.cookie = `${name}=${value}${opts ? `; ${opts}` : ''}`
          })
        },
      },
    }
  )
}
