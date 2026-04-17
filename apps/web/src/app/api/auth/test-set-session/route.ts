import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const access_token = searchParams.get('access_token')
  const refresh_token = searchParams.get('refresh_token')

  if (!access_token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 400 })
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
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
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  supabase.auth.onAuthStateChange((event) => {
    console.log('[test-set-session] auth event:', event)
  })

  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token || '',
  })

  // Даємо час на applyServerStorage з onAuthStateChange
  await new Promise((resolve) => setTimeout(resolve, 100))

  const allCookies = cookieStore.getAll().map(c => ({ name: c.name, value: c.value.substring(0, 30) }))
  console.log('[test-set-session] cookies after setSession:', allCookies)

  if (error) {
    return NextResponse.json({ error: error.message, cookies: allCookies }, { status: 401 })
  }

  return NextResponse.json({ success: true, cookies: allCookies })
}
