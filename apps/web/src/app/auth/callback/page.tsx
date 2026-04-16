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
        window.location.href = `/login?error=${encodeURIComponent(errorDesc || errorParam || 'unknown')}`
        return
      }

      // Витягуємо токени з hash ДО створення будь-якого Supabase client
      const hash = typeof window !== 'undefined' ? window.location.hash.substring(1) : ''
      const hashParams = new URLSearchParams(hash)
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (!accessToken) {
        window.location.href = '/login?error=no_access_token'
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
      <p className="text-white/60 text-sm">{status}</p>
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
