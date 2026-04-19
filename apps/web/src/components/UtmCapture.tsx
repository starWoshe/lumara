'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

// Зберігає UTM-параметри у cookie при першому відвіданні
export function UtmCapture() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const utmSource = searchParams.get('utm_source')
    const utmMedium = searchParams.get('utm_medium')
    const utmCampaign = searchParams.get('utm_campaign')

    if (!utmSource) return
    if (document.cookie.includes('utm_captured=1')) return

    const value = [utmSource, utmMedium, utmCampaign].filter(Boolean).join('/')
    document.cookie = `utm_source=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
    document.cookie = 'utm_captured=1; path=/; max-age=31536000; SameSite=Lax'
  }, [searchParams])

  return null
}
