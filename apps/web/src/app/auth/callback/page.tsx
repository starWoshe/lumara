'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function CallbackHandler() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<string>('Авторизація...')
  const [errorInfo, setErrorInfo] = useState<string | null>(null)

  useEffect(() => {
    async function doLogin() {
      const errorParam = searchParams.get('error')
      const errorDesc = searchParams.get('error_description')
      const next = searchParams.get('next') ?? '/dashboard'

      if (errorParam || errorDesc) {
        setErrorInfo(`Помилка OAuth: ${errorDesc || errorParam}`)
        return
      }

      let accessToken: string | null = null
      let refreshToken: string | null = null

      // Варіант 1: PKCE flow (?code=...)
      const code = searchParams.get('code')
      if (code) {
        setStatus('Обмін code на сесію...')
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error || !data.session) {
          console.error('[callback] PKCE exchange failed:', error)
        } else {
          accessToken = data.session.access_token
          refreshToken = data.session.refresh_token
        }
      }

      // Варіант 2: Implicit flow (#access_token=...)
      if (!accessToken) {
        const hash = window.location.hash.substring(1)
        const hashParams = new URLSearchParams(hash)
        accessToken = hashParams.get('access_token')
        refreshToken = hashParams.get('refresh_token')
        if (accessToken) {
          console.log('[callback] знайдено access_token в hash')
        }
      }

      // Варіант 3: Вже існуюча сесія (наприклад, користувач вже увійшов)
      if (!accessToken) {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data, error } = await supabase.auth.getSession()
        if (!error && data.session) {
          accessToken = data.session.access_token
          refreshToken = data.session.refresh_token
          console.log('[callback] знайдено існуючу сесію через getSession()')
        }
      }

      if (!accessToken) {
        console.error('[callback] ні code, ні access_token, ні існуюча сесія не знайдені')
        console.error('[callback] поточний URL:', window.location.href)
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

      const responseData = await res.json().catch(() => ({ error: 'parse_failed' }))

      if (!res.ok || !responseData.success) {
        const msg = responseData.error || responseData.details || 'unknown'
        setErrorInfo(`Помилка сервера: ${msg}`)
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
