import { NextRequest, NextResponse } from 'next/server'

// Приймаємо code від Google OAuth і передаємо на клієнтський /auth/processing.
// exchangeCodeForSession відбувається у браузері через createBrowserClient,
// щоб кукі встановлювались через document.cookie — це надійно на Vercel Edge.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/dashboard'
  const next = nextParam.startsWith('/') ? nextParam : '/dashboard'

  const rawHost = request.headers.get('x-forwarded-host')
  const forwardedHost = rawHost ? rawHost.split(',')[0].trim() : null
  const base = forwardedHost
    ? `https://${forwardedHost}`
    : new URL(request.url).origin

  if (!code) {
    return NextResponse.redirect(`${base}/login?error=missing_code`)
  }

  const url = new URL('/auth/processing', base)
  url.searchParams.set('code', code)
  url.searchParams.set('next', next)
  return NextResponse.redirect(url.toString())
}
