'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function CallbackHandler() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<string>('Натисни кнопку для входу')

  async function doLogin() {
    setStatus('Авторизація...')
    const errorParam = searchParams.get('error')
    const errorDesc = searchParams.get('error_description')
    const next = searchParams.get('next') ?? '/dashboard'

    if (errorParam || errorDesc) {
      setStatus(`Помилка Google: ${errorDesc || errorParam}`)
      return
    }

    const hash = typeof window !== 'undefined' ? window.location.hash.substring(1) : ''
    const hashParams = new URLSearchParams(hash)
    let accessToken = hashParams.get('access_token')
    let refreshToken = hashParams.get('refresh_token')

    const code = searchParams.get('code')
    if (code && !accessToken) {
      setStatus('Обмін code...')
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error || !data.session) {
        setStatus(`Обмін не вдався: ${error?.message || 'no session'}`)
        return
      }
      accessToken = data.session.access_token
      refreshToken = data.session.refresh_token
    }

    if (!accessToken) {
      setStatus('Помилка: немає access_token')
      return
    }

    setStatus('Синхронізація з сервером...')
    const res = await fetch('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
    })

    const data = await res.json().catch(() => ({ error: 'parse_failed' }))

    if (!res.ok || !data.success) {
      setStatus(`Помилка сервера: ${JSON.stringify(data, null, 2)}`)
      return
    }

    setStatus(`Успіх! Переадресація...`)
    window.location.href = next
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-white">Вхід через Google</h1>
      <button
        onClick={doLogin}
        className="rounded bg-yellow-500 px-6 py-3 font-bold text-black hover:bg-yellow-400"
      >
        Продовжити вхід
      </button>
      <pre className="max-w-lg whitespace-pre-wrap rounded bg-black/60 p-4 text-sm text-yellow-400">
        {status}
      </pre>
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
