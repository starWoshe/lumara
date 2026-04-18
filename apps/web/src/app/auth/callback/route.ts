import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'woshem68@gmail.com'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/dashboard'
  // Безпека: тільки відносні шляхи
  const next = nextParam.startsWith('/') ? nextParam : '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  // Vercel: x-forwarded-host містить реальний публічний домен (lumara.fyi)
  const rawHost = request.headers.get('x-forwarded-host')
  const forwardedHost = rawHost ? rawHost.split(',')[0].trim() : null
  const redirectBase = forwardedHost ? `https://${forwardedHost}` : origin

  const cookieStore = cookies()
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options) } catch { /* server component context */ }
            pendingCookies.push({ name, value, options })
          })
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    console.error('[callback] exchangeCodeForSession error:', exchangeError)
    return NextResponse.redirect(`${redirectBase}/login?error=exchange_failed`)
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user?.email) {
    return NextResponse.redirect(`${redirectBase}/login?error=user_not_found`)
  }

  console.log('[callback] user:', user.email, 'cookies to set:', pendingCookies.map(c => c.name))

  // DB sync (некритичне — не блокує сесію)
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation',
    }
    const name =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ?? null
    const image =
      (user.user_metadata?.avatar_url as string | undefined) ??
      (user.user_metadata?.picture as string | undefined) ?? null
    const role = user.email === ADMIN_EMAIL ? 'ADMIN' : 'USER'
    const userId = user.id

    const existingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(user.email)}&select=id`,
      { headers }
    )
    const existing = await existingRes.json()

    if (Array.isArray(existing) && existing.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${existing[0].id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ name, image, role }),
      })
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST', headers,
        body: JSON.stringify({ id: userId, email: user.email, name, image, role }),
      })
    }

    const profilesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=id`, { headers }
    )
    const profiles = await profilesRes.json()
    if (!Array.isArray(profiles) || profiles.length === 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST', headers,
        body: JSON.stringify({ user_id: userId, language: 'uk', timezone: 'Europe/Kiev' }),
      })
    }
  } catch (err) {
    console.error('[callback] DB sync error (non-critical):', err)
  }

  const destination = `${redirectBase}${next}`

  // КЛЮЧОВИЙ ФІХ: повертаємо 200 HTML з JS-редиректом замість 302.
  // Vercel Edge / деякі браузери стрипують Set-Cookie з 302 redirect response.
  // З 200 OK браузер СПОЧАТКУ зберігає Set-Cookie, ПОТІМ виконує JS redirect.
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<script>window.location.replace(${JSON.stringify(destination)})</script>
</head><body></body></html>`

  const response = new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })

  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, {
      ...(options as object),
      path: (options as Record<string, unknown>).path as string ?? '/',
      sameSite: ((options as Record<string, unknown>).sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: (options as Record<string, unknown>).httpOnly !== false,
    })
  })

  return response
}
