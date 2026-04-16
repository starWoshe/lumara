'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { syncUserAfterAuth } from './actions'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

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
    <div className="flex h-screen items-center justify-center">
      <p className="text-white/60">Вхід виконується...</p>
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
