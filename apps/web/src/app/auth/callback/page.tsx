'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { syncUserAfterAuth } from './actions'

function CallbackHandler() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<string>('Автоматичний вхід...')

  useEffect(() => {
    async function run() {
      const code = searchParams.get('code')
      const next = searchParams.get('next') ?? '/dashboard'
      const errorParam = searchParams.get('error')
      const errorDesc = searchParams.get('error_description')

      if (errorParam || errorDesc) {
        setStatus(`Помилка Google: ${errorDesc || errorParam}`)
        return
      }

      const hash = typeof window !== 'undefined' ? window.location.hash.substring(1) : ''
      const hashParams = new URLSearchParams(hash)
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const expiresAt = hashParams.get('expires_at')
      const tokenType = hashParams.get('token_type')
      const providerToken = hashParams.get('provider_token')

      const supabase = createClient()

      if (code) {
        setStatus('Обмін code на сесію...')
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setStatus(`Помилка exchangeCodeForSession: ${error.message}`)
          return
        }
      } else if (accessToken) {
        setStatus('Встановлення сесії з access_token...')
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        })
        if (error) {
          setStatus(`Помилка setSession: ${error.message}`)
          return
        }
      } else {
        setStatus('Помилка: немає code і немає access_token')
        return
      }

      setStatus('Синхронізація з базою...')
      const user = await syncUserAfterAuth()
      if (!user) {
        setStatus('Помилка: користувача не знайдено після синхронізації')
        return
      }

      setStatus(`Успіх! Перенаправлення...`)
      window.location.href = next
    }

    run()
  }, [searchParams])

  return (
    <div className="fixed left-4 top-4 z-[9999] max-h-[90vh] max-w-[90vw] overflow-auto rounded border-2 border-yellow-500 bg-black p-4 text-xs text-yellow-400 shadow-2xl">
      <pre className="whitespace-pre-wrap">{status}</pre>
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
