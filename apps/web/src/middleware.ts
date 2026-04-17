import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Middleware для захисту роутів та оновлення Supabase сесії
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)

  const path = request.nextUrl.pathname
  const allCookies = request.cookies.getAll().map(c => c.name)
  console.log('[middleware]', path, { user: !!user, cookies: allCookies })

  // Публічні маршрути — доступні без входу
  const publicPaths = ['/', '/login', '/pricing', '/api/auth', '/api/stripe/webhook', '/api/debug', '/auth/callback']
  const isPublic = publicPaths.some((p) => path === p || path.startsWith(p + '/'))

  // Якщо авторизований і йде на /login — редиректимо на dashboard
  if (path === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Решта — тільки для авторизованих
  if (!isPublic && !user) {
    console.log('[middleware] redirecting to /login', path)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

// Застосовуємо middleware до всіх маршрутів крім статичних файлів
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg).*)'],
}
