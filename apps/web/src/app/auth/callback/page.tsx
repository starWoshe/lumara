'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function CallbackHandler() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<string>('Авторизація...')

  useEffect(() => {
    async function doLogin() {
      const errorParam = searchParams.get('error')
      const errorDesc = searchParams.get('error_description')
      const next = searchParams.get('next') ?? '/dashboard'

      if (errorParam || errorDesc) {
        console.error('[callback] OAuth error from query:', { errorParam, errorDesc })
        window.location.href = `/login?error=${encodeURIComponent(errorDesc || errorParam || 'unknown')}`
        return
      }

      // Читаємо hash на клієнті після гідратації
      const hash = window.location.hash.substring(1)
      const hashParams = new URLSearchParams(hash)
      let accessToken = hashParams.get('access_token')
      let refreshToken = hashParams.get('refresh_token')

      console.log('[callback] raw hash:', JSON.stringify(hash.slice(0, 100)))
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
          setStatus(`Обмін не вдався: ${error?.message || 'no session'}`)
          return
        }
        accessToken = data.session.access_token
        refreshToken = data.session.refresh_token
        console.log('[callback] PKCE exchange успішний')
      }

      if (!accessToken) {
        console.error('[callback] access_token відсутній і code відсутній')
        setStatus('Помилка: не вдалося отримати токен авторизації. Спробуй увійти знову.')
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
        window.location.href = `/login?error=${encodeURIComponent(msg)}`
        return
      }

      window.location.href = next
    }

    doLogin()
  }, [searchParams])

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-white">Вхід через Google</h1>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      <p className="text-white/60 text-sm max-w-md">{status}</p>
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
