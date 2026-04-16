import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'woshem68@gmail.com'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
  }

  const cookieStore = await cookies()
  const cookiesToSet: { name: string; value: string; options?: any }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookies: { name: string; value: string; options?: object }[]) {
          cookiesToSet.push(...cookies)
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('exchangeCodeForSession error:', exchangeError)
    return NextResponse.redirect(
      new URL(`/login?error=oauth_callback&message=${encodeURIComponent(exchangeError.message)}`, request.url)
    )
  }

  // Trigger cookie write and retrieve authenticated user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.redirect(new URL('/login?error=no_user', request.url))
  }

  // --- Sync user via Supabase REST API (avoids DATABASE_URL issues) ---
  const email = user.email
  const isAdmin = email === ADMIN_EMAIL
  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null
  const image =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null
  const role = isAdmin ? 'ADMIN' : 'USER'

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    Authorization: `Bearer ${SERVICE_KEY}`,
    Prefer: 'return=representation',
  }

  const existingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id`,
    { headers }
  )
  const existing = await existingRes.json()
  let userId: string

  if (existing && existing.length > 0) {
    userId = existing[0].id
    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name, image, role }),
    })
  } else {
    userId = randomUUID()
    await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: userId, email, name, image, role }),
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
      body: JSON.stringify({ id: randomUUID(), user_id: userId, language: 'uk', timezone: 'Europe/Kiev' }),
    })
  }

  await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: randomUUID(),
      user_id: userId,
      action: 'SIGN_IN',
      metadata: { provider: 'google' },
    }),
  })

  const response = NextResponse.redirect(new URL(next, request.url))

  cookiesToSet.forEach(({ name, value, options }) => {
    const opts = { ...options }
    if (!opts.path) opts.path = '/'
    response.cookies.set(name, value, opts)
  })

  return response
}
