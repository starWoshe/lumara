'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { syncUserAfterAuth } from './actions'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [debugInfo, setDebugInfo] = useState<string>('Завантаження...')

  useEffect(() => {
    const params: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      params[key] = value
    })

    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')
    const errorDesc = searchParams.get('error_description')
    const next = searchParams.get('next') ?? '/dashboard'

    setDebugInfo(JSON.stringify({ params, next }, null, 2))

    if (errorParam || errorDesc) {
      const details = errorDesc || errorParam || 'unknown_error'
      router.push(`/login?error=callback&details=${encodeURIComponent(details)}`)
      return
    }

    if (!code) {
      router.push('/login?error=callback&details=no_code')
      return
    }

    const authCode = code

    async function exchange() {
      const supabase = createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(authCode)

      if (error) {
        router.push(`/login?error=callback&details=${encodeURIComponent(error.message)}`)
        return
      }

      await syncUserAfterAuth()
      router.push(next)
    }

    exchange()
  }, [router, searchParams])

  return (
    <div className="relative flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-white/60">Вхід виконується...</p>
      <pre
        className="fixed left-4 top-4 z-[9999] max-h-[80vh] max-w-[90vw] overflow-auto rounded border border-yellow-500 bg-black p-4 text-xs text-yellow-400 shadow-2xl"
        style={{ boxShadow: '0 0 30px rgba(234,179,8,0.5)' }}
      >
        {debugInfo}
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
