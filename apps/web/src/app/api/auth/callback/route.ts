import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'woshem68@gmail.com'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function corsResponse(body: object, status: number, origin?: string) {
  const res = NextResponse.json(body, { status })
  if (origin) {
    res.headers.set('Access-Control-Allow-Origin', origin)
    res.headers.set('Access-Control-Allow-Methods', 'POST')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  }
  return res
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin') || undefined
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      'https://lumara.fyi',
      'http://localhost:3000',
    ].filter(Boolean) as string[]

    if (origin && !allowedOrigins.some((o) => origin === o || origin.endsWith('.vercel.app'))) {
      return corsResponse({ error: 'cors' }, 403)
    }

    const { access_token, refresh_token } = await request.json()
    if (!access_token) {
      return corsResponse({ error: 'missing_token' }, 400, origin)
    }

    const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user }, error: userError } = await serviceClient.auth.getUser(access_token)
    if (userError || !user?.email) {
      return corsResponse({ error: 'invalid_token', details: userError?.message }, 401, origin)
    }

    const cookieStore = await cookies()
    const cookiesToSet: { name: string; value: string; options?: any }[] = []

    const ssrClient = createServerClient(
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

    const { error: sessionError } = await ssrClient.auth.setSession({
      access_token,
      refresh_token: refresh_token || '',
    })
    if (sessionError) {
      return corsResponse({ error: 'setSession_failed', details: sessionError.message }, 401, origin)
    }

    await ssrClient.auth.getSession()

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

    const response = corsResponse({ success: true, userId }, 200, origin)
    cookiesToSet.forEach(({ name, value, options }) => {
      const opts = { ...options }
      if (!opts.path) opts.path = '/'
      response.cookies.set(name, value, opts)
    })

    return response
  } catch (err: any) {
    console.error('Auth callback error:', err)
    return corsResponse({ error: 'server_error', details: err?.message || String(err) }, 500)
  }
}
