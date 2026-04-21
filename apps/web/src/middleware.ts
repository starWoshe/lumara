import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const allCookieNames = request.cookies.getAll().map(c => c.name)
  console.log(`[middleware] ${path} | user: ${user?.email ?? 'null'} | error: ${error?.message ?? 'none'} | cookies: ${JSON.stringify(allCookieNames)}`)

  const publicPaths = [
    '/', '/login', '/pricing', '/mages', '/links',
    '/api/auth', '/api/stripe/webhook', '/api/debug', '/api/debug-cookie', '/auth',
  ]
  const isPublic = publicPaths.some((p) => path === p || path.startsWith(p + '/'))

  if (path === '/login' && user) {
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl')
    const dest = callbackUrl?.startsWith('/') ? callbackUrl : '/chat/luna'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  if (!isPublic && !user) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.mp4|.*\\.webm|.*\\.ico).*)'],
}
