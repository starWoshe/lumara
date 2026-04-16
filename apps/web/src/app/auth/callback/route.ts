import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@lumara/database'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'woshem68@gmail.com'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const errorDesc = searchParams.get('error_description') ?? searchParams.get('error')
  const next = searchParams.get('next') ?? '/dashboard'

  if (errorDesc) {
    console.error('OAuth callback error from provider:', errorDesc)
    return NextResponse.redirect(`${origin}/login?error=callback&details=${encodeURIComponent(errorDesc)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=callback&details=no_code`)
  }

  const supabase = await createClient()
  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('exchangeCodeForSession error:', error)
    return NextResponse.redirect(`${origin}/login?error=callback&details=${encodeURIComponent(error.message)}`)
  }

  if (session?.user) {
    const user = session.user
    const isAdmin = user.email === ADMIN_EMAIL

    const dbUser = await db.user.upsert({
      where: { email: user.email! },
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
        email: user.email!,
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
    }).catch(() => null)

    await db.activityLog.create({
      data: {
        userId: dbUser.id,
        action: 'SIGN_IN',
        metadata: { provider: 'google' },
      },
    }).catch(() => null)

    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/login?error=callback&details=no_session`)
}
