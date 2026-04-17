import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Supabase клієнт для Server Components та API Routes
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieEncoding: 'raw',
      cookies: {
        encode: 'tokens-only',
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet, headers) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ігноруємо помилки в Server Components (тільки для читання)
          }
        },
      },
    }
  )
}
