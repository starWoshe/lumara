import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'woshem68@gmail.com'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: Request) {
  try {
    const { access_token, refresh_token } = await request.json()
    if (!access_token) {
      return NextResponse.json({ error: 'missing_token' }, { status: 400 })
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
          setAll(cookies: { name: string; value: string; options?: any }[]) {
            cookiesToSet.push(...cookies)
          },
        },
      }
    )

    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token: refresh_token || '',
    })
    if (error) {
      return NextResponse.json({ error: 'setSession_failed', details: error.message }, { status: 401 })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user?.email) {
      return NextResponse.json({ error: 'no_user' }, { status: 401 })
    }

    const email = user.email
    const isAdmin = email === ADMIN_EMAIL
    const name = (user.user_metadata?.full_name as string | undefined) ?? (user.user_metadata?.name as string | undefined) ?? null
    const image = (user.user_metadata?.avatar_url as string | undefined) ?? (user.user_metadata?.picture as string | undefined) ?? null
    const role = isAdmin ? 'ADMIN' : 'USER'

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=representation',
    }

    const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id`, { headers })
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

    const profilesRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=id`, { headers })
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
      body: JSON.stringify({ id: randomUUID(), user_id: userId, action: 'SIGN_IN', metadata: { provider: 'google' } }),
    })

    const response = NextResponse.json({ success: true, userId })
    cookiesToSet.forEach(({ name, value, options }) => {
      const opts = { ...options }
      if (!opts.path) opts.path = '/'
      response.cookies.set(name, value, opts)
    })
    return response
  } catch (err: any) {
    console.error('Auth callback error:', err)
    return NextResponse.json({ error: 'server_error', details: err?.message || String(err) }, { status: 500 })
  }
}
