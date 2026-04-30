'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

// Ця сторінка більше не потрібна — exchange відбувається server-side в /auth/callback
// Якщо хтось потрапив сюди, перенаправляємо на dashboard
function ProcessingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const next = searchParams.get('next') ?? '/dashboard'
    const dest = next.startsWith('/') ? next : '/dashboard'
    router.replace(dest)
  }, [router, searchParams])

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
