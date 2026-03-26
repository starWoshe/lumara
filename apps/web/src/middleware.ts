import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// Middleware для захисту роутів
export default withAuth(
  function middleware(req) {
    // Якщо авторизований і йде на /login — редиректимо на dashboard
    if (req.nextUrl.pathname === '/login' && req.nextauth.token) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      // Визначаємо, чи потрібна авторизація для маршруту
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname

        // Публічні маршрути — доступні без входу
        const publicPaths = ['/', '/login', '/api/auth']
        const isPublic = publicPaths.some((p) => path === p || path.startsWith(p))

        if (isPublic) return true

        // Решта — тільки для авторизованих
        return !!token
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

// Застосовуємо middleware до всіх маршрутів крім статичних файлів
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg).*)'],
}
