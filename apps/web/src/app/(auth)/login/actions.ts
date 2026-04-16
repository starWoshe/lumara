'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function loginWithGoogle(callbackUrl: string = '/dashboard') {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://lumara.fyi'
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/api/auth/oauth-callback?next=${encodeURIComponent(callbackUrl)}`,
    },
  })

  if (error) {
    throw new Error('OAuth error: ' + error.message)
  }

  if (!data.url) {
    throw new Error('No OAuth URL returned')
  }

  // НЕ робимо redirect() — повертаємо URL, щоб клієнт сам редіректив
  // Це гарантує, що Set-Cookie заголовки з code_verifier дійдуть до браузера
  return data.url
}
