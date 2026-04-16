'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { syncUserAfterAuth } from './actions'

function CallbackHandler() {
  const searchParams = useSearchParams()
  const [info, setInfo] = useState<string>('Збір даних...')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const params: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      params[key] = value
    })

    const hash = typeof window !== 'undefined' ? window.location.hash : ''

    setInfo(JSON.stringify({ params, hash: hash.slice(0, 200), url: typeof window !== 'undefined' ? window.location.href : null }, null, 2))
  }, [searchParams])

  async function proceed() {
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'
    const errorParam = searchParams.get('error')
    const errorDesc = searchParams.get('error_description')

    if (errorParam || errorDesc) {
      window.location.href = `/login?error=callback&details=${encodeURIComponent(errorDesc || errorParam || 'unknown_error')}`
      return
    }

    const hash = typeof window !== 'undefined' ? window.location.hash.substring(1) : ''
    const hashParams = new URLSearchParams(hash)
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')

    setDone(true)
    const supabase = createClient()

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        window.location.href = `/login?error=callback&details=${encodeURIComponent(error.message)}`
        return
      }
    } else if (accessToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      })
      if (error) {
        window.location.href = `/login?error=callback&details=${encodeURIComponent(error.message)}`
        return
      }
    } else {
      window.location.href = '/login?error=callback&details=no_token_or_code'
      return
    }

    await syncUserAfterAuth()
    window.location.href = next
  }

  return (
    <div className="fixed left-4 top-4 z-[9999] max-h-[90vh] max-w-[90vw] overflow-auto rounded border-2 border-yellow-500 bg-black p-4 text-xs text-yellow-400 shadow-2xl">
      <pre className="whitespace-pre-wrap">{info}</pre>
      {!done && (
        <button
          onClick={proceed}
          className="mt-4 w-full rounded bg-yellow-500 px-3 py-2 font-bold text-black hover:bg-yellow-400"
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
