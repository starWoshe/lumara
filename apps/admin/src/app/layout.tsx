import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'LUMARA Admin',
  description: 'Панель адміністратора LUMARA Academy',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uk">
      <body className={`${inter.className} bg-gray-950 text-white`}>
        <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
          <div className="max-w-5xl mx-auto px-8 py-4 flex items-center gap-6">
            <a href="/" className="font-bold text-purple-400 hover:text-purple-300 transition">
              LUMARA Admin
            </a>
            <a
              href="/groups"
              className="text-sm text-gray-400 hover:text-white transition"
            >
              Групи
            </a>
            <a
              href="/userbot"
              className="text-sm text-gray-400 hover:text-white transition"
            >
              UserBot
            </a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
