'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// Сторінка має бути динамічною, щоб Vercel не кешував стару версію
export const dynamic = 'force-dynamic'
export const revalidate = 0

function CallbackHandler() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<string>('Авторизація...')
  const [errorInfo, setErrorInfo] = useState<string | null>(null)

  useEffect(() => {
    async function doLogin() {
      console.log('[callback] СТАРТ doLogin')
      // Затримка для можливості відкрити консоль (F12)
      await new Promise((resolve) => setTimeout(resolve, 5000))

      const errorParam = searchParams.get('error')
      const errorDesc = searchParams.get('error_description')
      const next = searchParams.get('next') ?? '/dashboard'

      if (errorParam || errorDesc) {
        console.error('[callback] OAuth error from query:', { errorParam, errorDesc })
        setErrorInfo(`Помилка OAuth: ${errorDesc || errorParam}`)
        return
      }

      // Читаємо hash на клієнті після гідратації
      const hash = window.location.hash.substring(1)
      const hashParams = new URLSearchParams(hash)
      let accessToken = hashParams.get('access_token')
      let refreshToken = hashParams.get('refresh_token')

      console.log('[callback] raw hash:', hash.slice(0, 100))
      console.log('[callback] has accessToken:', !!accessToken)

      // Fallback PKCE: якщо hash порожній, але є code в query params
      const code = searchParams.get('code')
      if (code && !accessToken) {
        console.log('[callback] спроба PKCE exchange для code:', code.slice(0, 10) + '...')
        setStatus('Обмін code на сесію...')
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error || !data.session) {
          console.error('[callback] PKCE exchange failed:', error)
          setErrorInfo(`PKCE обмін не вдався: ${error?.message || 'no session'}`)
          return
        }
        accessToken = data.session.access_token
        refreshToken = data.session.refresh_token
        console.log('[callback] PKCE exchange успішний')
      }

      if (!accessToken) {
        console.error('[callback] access_token відсутній і code відсутній')
        setErrorInfo('Помилка: не вдалося отримати токен авторизації. Спробуй увійти знову.')
        return
      }

      setStatus('Синхронізація з сервером...')

      const res = await fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
        }),
      })

      const data = await res.json().catch(() => ({ error: 'parse_failed' }))
      console.log('[callback] відповідь сервера:', { status: res.status, data })

      if (!res.ok || !data.success) {
        const msg = data.error || data.details || 'unknown'
        setErrorInfo(`Помилка сервера: ${msg}. Деталі в консолі (F12).`)
        return
      }

      window.location.href = next
    }

    doLogin()
  }, [searchParams])

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-white">Вхід через Google</h1>
      {errorInfo ? (
        <div className="rounded-lg bg-red-500/20 px-6 py-4 text-red-200 max-w-md">
          <p className="font-medium">{errorInfo}</p>
          <p className="mt-2 text-sm text-red-300/70">Відкрий F12 → Console для деталей.</p>
        </div>
      ) : (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <p className="text-white/60 text-sm max-w-md">{status}</p>
        </>
      )}
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  )
}
