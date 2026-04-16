import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { db } from '@lumara/database'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'woshem68@gmail.com'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { access_token, refresh_token } = body

    if (!access_token) {
      return NextResponse.json({ error: 'missing_token' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing env vars:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey })
      return NextResponse.json({ error: 'missing_env' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser(access_token)

    if (userError) {
      console.error('getUser error:', userError)
      return NextResponse.json({ error: 'invalid_token', details: userError.message }, { status: 401 })
    }

    if (!user?.email) {
      return NextResponse.json({ error: 'no_user_email' }, { status: 401 })
    }

    const isAdmin = user.email === ADMIN_EMAIL

    const dbUser = await db.user.upsert({
      where: { email: user.email },
      update: {
        name: (user.user_metadata?.full_name as string | undefined)
          ?? (user.user_metadata?.name as string | undefined)
          ?? null,
        image: (user.user_metadata?.avatar_url as string | undefined)
          ?? (user.user_metadata?.picture as string | undefined)
          ?? null,
        ...(isAdmin ? { role: 'ADMIN' } : {}),
      },
      create: {
        email: user.email,
        name: (user.user_metadata?.full_name as string | undefined)
          ?? (user.user_metadata?.name as string | undefined)
          ?? null,
        image: (user.user_metadata?.avatar_url as string | undefined)
          ?? (user.user_metadata?.picture as string | undefined)
          ?? null,
        role: isAdmin ? 'ADMIN' : 'USER',
      },
    })

    await db.profile.upsert({
      where: { userId: dbUser.id },
      update: {},
      create: { userId: dbUser.id, language: 'uk', timezone: 'Europe/Kiev' },
    }).catch((err) => {
      console.error('Profile upsert error:', err)
      return null
    })

    await db.activityLog.create({
      data: {
        userId: dbUser.id,
        action: 'SIGN_IN',
        metadata: { provider: 'google' },
      },
    }).catch((err) => {
      console.error('Activity log error:', err)
      return null
    })

    return NextResponse.json({ success: true, userId: dbUser.id })
  } catch (err: any) {
    console.error('Auth sync fatal error:', err?.message || err)
    return NextResponse.json({ error: 'server_error', details: err?.message || String(err) }, { status: 500 })
  }
}
