'use client'

import { createBrowserClient } from '@supabase/ssr'

function getAllCookies() {
  return document.cookie
    .split('; ')
    .filter(Boolean)
    .map((cookie) => {
      const [name, ...rest] = cookie.split('=')
      return { name, value: rest.join('=') }
    })
}

function setAllCookies(
  cookiesToSet: {
    name: string
    value: string
    options?: any
  }[],
  headers?: Record<string, string>
) {
  cookiesToSet.forEach(({ name, value, options }) => {
    let str = `${name}=${value}`
    if (options) {
      if (options.path) str += `; Path=${options.path}`
      if (options.domain) str += `; Domain=${options.domain}`
      if (options.maxAge != null) str += `; Max-Age=${options.maxAge}`
      if (options.expires) {
        const date =
          typeof options.expires === 'string'
            ? new Date(options.expires)
            : options.expires
        str += `; Expires=${date.toUTCString()}`
      }
      if (options.httpOnly) str += `; HttpOnly`
      if (options.secure) str += `; Secure`
      if (options.sameSite === true) {
        str += `; SameSite=Strict`
      } else if (options.sameSite === false) {
        // omit SameSite attribute
      } else if (options.sameSite) {
        str += `; SameSite=${options.sameSite}`
      }
    }
    document.cookie = str
  })
}

// Supabase браузерний клієнт для Client Components
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieEncoding: 'raw',
      cookies: {
        encode: 'tokens-only',
        getAll: getAllCookies,
        setAll: setAllCookies,
      },
    }
  )
}
