'use client'

import { useEffect } from 'react'

// Після логіну зчитує UTM-cookie і зберігає у профіль (лише один раз)
export function UtmSync() {
  useEffect(() => {
    const match = document.cookie.match(/utm_source=([^;]+)/)
    if (!match) return

    const source = decodeURIComponent(match[1])
    fetch('/api/profile/utm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source }),
    }).then(() => {
      // Видаляємо cookie після збереження
      document.cookie = 'utm_source=; path=/; max-age=0'
      document.cookie = 'utm_captured=; path=/; max-age=0'
    }).catch(() => {})
  }, [])

  return null
}
