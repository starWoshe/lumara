import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'woshem68@gmail.com'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  // Створюємо redirect response одразу — куки ставимо прямо на нього
  const response = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    console.error('[callback] exchangeCodeForSession error:', exchangeError)
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user?.email) {
    return NextResponse.redirect(`${origin}/login?error=user_not_found`)
  }

  console.log('[callback] user:', user.email, user.id)

  // Синхронізація з таблицею users через REST API (service key обходить RLS)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    Authorization: `Bearer ${SERVICE_KEY}`,
    Prefer: 'return=representation',
  }

  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null
  const image =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null
  const isAdmin = user.email === ADMIN_EMAIL
  const role = isAdmin ? 'ADMIN' : 'USER'
  const userId = user.id // завжди використовуємо Supabase Auth UUID

  // Шукаємо по email — обробляємо старі записи з randomUUID
  const existingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(user.email)}&select=id`,
    { headers }
  )
  const existing = await existingRes.json()

  if (existing && existing.length > 0) {
    const existingId = existing[0].id
    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${existingId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name, image, role }),
    })
  } else {
    await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: userId, email: user.email, name, image, role }),
    })
  }

  const profilesRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=id`,
    { headers }
  )
  const profiles = await profilesRes.json()
  if (!profiles || profiles.length === 0) {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_id: userId, language: 'uk', timezone: 'Europe/Kiev' }),
    })
  }

  await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      user_id: userId,
      action: 'SIGN_IN',
      metadata: { provider: 'google' },
    }),
  })

  return response
}
