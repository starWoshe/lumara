import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/dashboard'
  const next = nextParam.startsWith('/') ? nextParam : '/dashboard'

  const forwardedHost = request.headers.get('x-forwarded-host')
  const origin = forwardedHost
    ? `https://${forwardedHost.split(',')[0].trim()}`
    : new URL(request.url).origin

  // Логуємо всі cookies що прийшли з запитом
  const allCookies = request.cookies.getAll()
  const cookieNames = allCookies.map(c => c.name)
  console.log('[auth/callback] incoming cookies:', cookieNames)
  console.log('[auth/callback] code present:', !!code, '| origin:', origin, '| next:', next)

  if (!code) {
    console.error('[auth/callback] missing code')
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const cookieStore = cookies()
  const captured: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((c) => captured.push(c))
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] EXCHANGE ERROR:', error.message, '| status:', error.status)
    console.error('[auth/callback] cookies at exchange time:', cookieStore.getAll().map(c => c.name))
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
  }

  console.log('[auth/callback] exchange SUCCESS, user:', data.session?.user?.email, '| captured cookies:', captured.map(c => c.name))

  const response = NextResponse.redirect(`${origin}${next}`)
  captured.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
  })
  return response
}
