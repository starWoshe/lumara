import { PrismaAdapter } from '@auth/prisma-adapter'
import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { db } from '@lumara/database'

export const authOptions: NextAuthOptions = {
  // Prisma адаптер — сесії зберігаються в Supabase
  adapter: PrismaAdapter(db) as NextAuthOptions['adapter'],

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],

  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 днів
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    // Додаємо userId до сесії для зручного доступу
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },

    // Редирект після входу
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url
      if (url.startsWith('/')) return `${baseUrl}${url}`
      return `${baseUrl}/dashboard`
    },
  },

  events: {
    // Створюємо профіль при першому вході
    async createUser({ user }) {
      if (user.id) {
        await db.profile.create({
          data: {
            userId: user.id,
            language: 'uk',
            timezone: 'Europe/Kiev',
          },
        })
      }
    },
  },
}

// Розширення типу Session для TypeScript
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
