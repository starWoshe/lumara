'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function CallbackHandler() {
  const searchParams = useSearchParams()
  const [started, setStarted] = useState(false)

  async function doLogin() {
    setStarted(true)
    const errorParam = searchParams.get('error')
    const errorDesc = searchParams.get('error_description')
    const next = searchParams.get('next') ?? '/dashboard'

    if (errorParam || errorDesc) {
      window.location.href = `/login?error=callback&details=${encodeURIComponent(errorDesc || errorParam || 'unknown')}`
      return
    }

    const hash = typeof window !== 'undefined' ? window.location.hash.substring(1) : ''
    const hashParams = new URLSearchParams(hash)
    let accessToken = hashParams.get('access_token')
    let refreshToken = hashParams.get('refresh_token')

    const code = searchParams.get('code')
    if (code && !accessToken) {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error || !data.session) {
        window.location.href = `/login?error=callback&details=${encodeURIComponent(error?.message || 'exchange_failed')}`
        return
      }
      accessToken = data.session.access_token
      refreshToken = data.session.refresh_token
    }

    if (!accessToken) {
      window.location.href = '/login?error=callback&details=no_token'
      return
    }

    const res = await fetch('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      window.location.href = `/login?error=callback&details=${encodeURIComponent(data.error || 'sync_failed')}`
      return
    }

    window.location.href = next
  }

  useEffect(() => {
    if (!started) {
      doLogin()
    }
  }, [started])

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <p className="text-white/60">{started ? 'Вхід виконується...' : 'Очікування...'}</p>
      {!started && (
        <button
          onClick={doLogin}
          className="rounded bg-yellow-500 px-4 py-2 font-bold text-black hover:bg-yellow-400"
        >
          Продовжити вхід
        </button>
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
