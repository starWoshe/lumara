'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

// Обгортка для Client Components, що потребують сесію
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
