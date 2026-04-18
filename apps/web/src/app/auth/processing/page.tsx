'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

function ProcessingContent() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'
    const dest = next.startsWith('/') ? next : '/dashboard'

    if (!code) {
      window.location.replace('/login?error=missing_code')
      return
    }

    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        console.error('[auth/processing]', error)
        window.location.replace('/login?error=exchange_failed')
      } else {
        // window.location — hard navigation, гарантує що сервер отримає свіжі кукі
        window.location.replace(dest)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#060610',
      color: 'rgba(255,255,255,0.45)',
      fontSize: '14px',
      fontFamily: 'sans-serif',
      letterSpacing: '0.05em',
    }}>
      Встановлення з&apos;єднання...
    </div>
  )
}

export default function AuthProcessingPage() {
  return (
    <Suspense>
      <ProcessingContent />
    </Suspense>
  )
}
