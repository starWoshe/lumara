import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { Inter, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { UtmCapture } from '@/components/UtmCapture'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'LUMARA — Поговори з магом безкоштовно',
    template: '%s | LUMARA',
  },
  description: 'Провідники з астрології, таро та нумерології — доступні 24/7. Перша сесія безкоштовно.',
  keywords: ['астрологія', 'таро', 'нумерологія', 'езотерика', 'провідник', 'оракул', 'мудрець'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://lumara.fyi'),
  openGraph: {
    type: 'website',
    locale: 'uk_UA',
    siteName: 'LUMARA',
    title: 'LUMARA — Поговори з магом безкоштовно',
    description: 'Вони вже чекають тебе. Провідники з астрології, таро та нумерології. Перша сесія безкоштовно.',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'LUMARA — Містичні провідники',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LUMARA — Поговори з магом безкоштовно',
    description: 'Вони вже чекають тебе. Перша сесія — безкоштовно.',
    images: ['/og-default.png'],
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk" className={`${inter.variable} ${playfair.variable}`}>
      <body className="lumara-gradient min-h-dvh">
        <SessionProvider>{children}</SessionProvider>
        <Suspense><UtmCapture /></Suspense>
        <Analytics />
      </body>
    </html>
  )
}
