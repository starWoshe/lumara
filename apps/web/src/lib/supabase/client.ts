'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const setCookie = (name: string, value: string, options?: object) => {
    let cookieStr = `${name}=${encodeURIComponent(value)}`
    const isAuthCookie = name.includes('-auth-') || name.includes('code-verifier')
    if (options) {
      const opts = options as Record<string, any>
      if (opts.maxAge) cookieStr += `; Max-Age=${opts.maxAge}`
      if (opts.expires) cookieStr += `; Expires=${opts.expires.toUTCString?.() || opts.expires}`
      cookieStr += `; Path=/`
      if (opts.domain) cookieStr += `; Domain=${opts.domain}`
      if (isAuthCookie || opts.secure) cookieStr += `; Secure`
      if (isAuthCookie) cookieStr += `; SameSite=None`
      else if (opts.sameSite) cookieStr += `; SameSite=${opts.sameSite}`
    } else if (isAuthCookie) {
      cookieStr += `; Path=/; Secure; SameSite=None`
    }
    document.cookie = cookieStr
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        path: '/',
        sameSite: 'none',
        secure: true,
        maxAge: 60 * 60 * 24 * 365 * 1000,
      },
      cookies: {
        getAll() {
          return document.cookie.split('; ').filter(Boolean).map((cookie) => {
            const [name, ...rest] = cookie.split('=')
            return { name, value: decodeURIComponent(rest.join('=')) }
          })
        },
        get(name: string) {
          const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
          return match ? decodeURIComponent(match[2]) : undefined
        },
        set(name: string, value: string, options?: object) {
          setCookie(name, value, options)
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookie(name, value, options)
          })
        },
        remove(name: string, options?: object) {
          setCookie(name, '', { ...(options || {}), maxAge: 0 })
        },
      },
    }
  )
}
