import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter, Playfair_Display } from 'next/font/google'
import { SessionProvider } from '@/components/providers/SessionProvider'
import './globals.css'

// Шрифти для LUMARA Academy
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
    default: 'LUMARA Academy',
    template: '%s | LUMARA Academy',
  },
  description: 'Академія містичного пізнання. Астрологія, Таро, Нумерологія з AI-провідниками.',
  keywords: ['астрологія', 'таро', 'нумерологія', 'езотерика', 'AI', 'академія'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'uk_UA',
    siteName: 'LUMARA Academy',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk" className={`${inter.variable} ${playfair.variable}`}>
      <body className="lumara-gradient min-h-dvh">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
