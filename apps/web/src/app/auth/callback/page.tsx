'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { syncUserAfterAuth } from './actions'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    if (!code) {
      router.push('/login?error=callback&details=no_code')
      return
    }

    async function exchange() {
      const supabase = createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

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
