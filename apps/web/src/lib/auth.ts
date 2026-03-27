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
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 днів
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    // Додаємо userId до сесії з JWT токену
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
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
        try {
          await db.profile.create({
            data: {
              userId: user.id,
              language: 'uk',
              timezone: 'Europe/Kiev',
            },
          })
        } catch (error) {
          console.error('Помилка створення профілю:', error)
        }
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
