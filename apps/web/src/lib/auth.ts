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
          const existingUser = await db.user.findUnique({ where: { email: user.email! } })

          if (existingUser) {
            token.userId = existingUser.id
          } else {
            const newUser = await db.user.create({
              data: {
                email: user.email!,
                name: user.name,
                image: user.image,
              },
            })
            token.userId = newUser.id

            // Створюємо профіль
            await db.profile.create({
              data: { userId: newUser.id, language: 'uk', timezone: 'Europe/Kiev' },
            }).catch(() => null)
          }
        } catch (e) {
          console.error('JWT callback error:', e)
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
