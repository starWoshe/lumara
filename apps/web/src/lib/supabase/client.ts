'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return document.cookie.split('; ').filter(Boolean).map((cookie) => {
            const [name, ...rest] = cookie.split('=')
            return { name, value: decodeURIComponent(rest.join('=')) }
          })
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            let cookieStr = `${name}=${encodeURIComponent(value)}`
            if (options) {
              const opts = options as Record<string, any>
              if (opts.maxAge) cookieStr += `; Max-Age=${opts.maxAge}`
              if (opts.expires) cookieStr += `; Expires=${opts.expires.toUTCString?.() || opts.expires}`
              if (opts.path) cookieStr += `; Path=${opts.path}`
              if (opts.domain) cookieStr += `; Domain=${opts.domain}`
              if (opts.secure) cookieStr += `; Secure`
              if (opts.sameSite) cookieStr += `; SameSite=${opts.sameSite}`
              if (opts.httpOnly) cookieStr += `; HttpOnly`
            }
            document.cookie = cookieStr
          })
        },
      },
    }
  )
}
