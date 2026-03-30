import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { db } from '@lumara/database'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    // Зберігаємо юзера в БД при першому вході
    async jwt({ token, user, account }) {
      // Перший вхід — user і account є в token
      if (user && account) {
        try {
          const dbUser = await db.user.upsert({
            where: { email: user.email! },
            update: { name: user.name, image: user.image },
            create: {
              email: user.email!,
              name: user.name,
              image: user.image,
            },
          })
          token.userId = dbUser.id

          // Створюємо профіль якщо не існує
          await db.profile.upsert({
            where: { userId: dbUser.id },
            update: {},
            create: { userId: dbUser.id, language: 'uk', timezone: 'Europe/Kiev' },
          }).catch(() => null)
        } catch (e) {
          console.error('JWT callback error:', e)
        }
      }

      // Fallback: якщо userId відсутній в токені (наприклад, попередній вхід без БД)
      if (!token.userId && token.email) {
        try {
          const dbUser = await db.user.upsert({
            where: { email: token.email as string },
            update: {},
            create: {
              email: token.email as string,
              name: token.name as string | undefined,
              image: (token.picture as string | undefined) ?? (token.image as string | undefined),
            },
          })
          token.userId = dbUser.id
          await db.profile.upsert({
            where: { userId: dbUser.id },
            update: {},
            create: { userId: dbUser.id, language: 'uk', timezone: 'Europe/Kiev' },
          }).catch(() => null)
        } catch (e) {
          console.error('JWT fallback error:', e)
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url
      if (url.startsWith('/')) return `${baseUrl}${url}`
      return `${baseUrl}/dashboard`
    },
  },
}

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
