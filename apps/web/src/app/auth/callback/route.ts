import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@lumara/database'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/chat/luna'
  const next = nextParam.startsWith('/') ? nextParam : '/dashboard'

  const forwardedHost = request.headers.get('x-forwarded-host')
  const origin = forwardedHost
    ? `https://${forwardedHost.split(',')[0].trim()}`
    : new URL(request.url).origin

  console.log('[auth/callback] code present:', !!code, '| origin:', origin)

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Офіційний патерн Supabase: записуємо в cookieStore напряму
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options)
            } catch {
              // В деяких контекстах Next.js кидає помилку — ігноруємо
            }
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] EXCHANGE ERROR:', error.message)
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
  }

  console.log('[auth/callback] exchange SUCCESS, user:', data.session?.user?.email)

  // Логуємо вхід у систему
  const supabaseUserId = data.session?.user?.id
  if (supabaseUserId) {
    db.user.findUnique({ where: { id: supabaseUserId } }).then((user) => {
      if (user) {
        db.activityLog.create({
          data: { userId: user.id, action: 'SIGN_IN' },
        }).catch(() => {})
      }
    }).catch(() => {})
  }

  return NextResponse.redirect(`${origin}${next}`)
}
