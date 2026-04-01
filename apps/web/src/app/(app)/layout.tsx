import type { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'

// Layout для авторизованої зони — з навігацією
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen lumara-gradient relative">
      {/* Фон — замок академії */}
      <Image
        src="/academy-castle.png"
        alt=""
        fill
        className="object-cover object-bottom opacity-10 pointer-events-none"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/40 pointer-events-none" />

      {/* Бокова навігація */}
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-white/5 bg-black/20 backdrop-blur-md z-40 hidden md:flex flex-col relative">
        {/* Логотип */}
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <Image src="/lumara-logo.png" alt="LUMARA" width={36} height={36} className="rounded-full flex-shrink-0" />
          <span className="font-display text-2xl font-bold bg-gradient-to-r from-lumara-300 to-gold-400 bg-clip-text text-transparent">
            LUMARA
          </span>
        </div>

        {/* Навігаційні посилання */}
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all text-sm">
            <span>🏠</span> Головна
          </Link>
          <Link href="/chat/LUNA" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all text-sm">
            <span>🌙</span> LUNA — Астрологія
          </Link>
          <Link href="/chat/ARCAS" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all text-sm">
            <span>🔮</span> ARCAS — Таро
          </Link>
          <Link href="/chat/NUMI" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all text-sm">
            <span>✨</span> NUMI — Нумерологія
          </Link>
          <Link href="/chat/UMBRA" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all text-sm">
            <span>🌑</span> UMBRA — Езо-психологія
          </Link>
        </nav>

        {/* Профіль користувача */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2">
            {session.user.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="avatar" className="w-8 h-8 rounded-full" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{session.user.name}</p>
              <p className="text-xs text-white/40 truncate">{session.user.email}</p>
            </div>
          </div>
          <Link href="/profile" className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-all text-xs">
            <span>👤</span> Профіль
          </Link>
          <Link href="/api/auth/signout" className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-all text-xs">
            <span>↩</span> Вийти
          </Link>
        </div>
      </aside>

      {/* Основний контент */}
      <main className="md:pl-64 min-h-screen relative z-10">
        {children}
      </main>
    </div>
  )
}
