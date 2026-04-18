import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)

  const path = request.nextUrl.pathname

  const publicPaths = [
    '/', '/login', '/pricing', '/mages',
    '/api/auth', '/api/stripe/webhook', '/api/debug', '/api/debug-cookie', '/auth/callback',
  ]
  const isPublic = publicPaths.some((p) => path === p || path.startsWith(p + '/'))

  // Авторизований → не пускаємо на /login
  if (path === '/login' && user) {
    const redirect = NextResponse.redirect(new URL('/dashboard', request.url))
    // Копіюємо кукі з supabaseResponse в redirect response
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value))
    return redirect
  }

  // Захищений маршрут без сесії → на /login
  if (!isPublic && !user) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const redirect = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value))
    return redirect
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.mp4|.*\\.webm|.*\\.ico).*)'],
}
