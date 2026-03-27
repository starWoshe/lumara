import { PrismaAdapter } from '@auth/prisma-adapter'
import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import DiscordProvider from 'next-auth/providers/discord'
import EmailProvider from 'next-auth/providers/email'
import { db } from '@lumara/database'

export const authOptions: NextAuthOptions = {
  // Prisma адаптер — сесії зберігаються в Supabase
  adapter: PrismaAdapter(db) as NextAuthOptions['adapter'],

  providers: [
    // Основний провайдер — Google
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Альтернатива — Discord
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
    // Альтернатива — Email magic link
    EmailProvider({
      server: {
        host: 'smtp.resend.com',
        port: 465,
        auth: {
          user: 'resend',
          pass: process.env.RESEND_API_KEY!,
        },
      },
      from: 'LUMARA Academy <noreply@lumara.fyi>',
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
