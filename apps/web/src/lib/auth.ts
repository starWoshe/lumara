import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { db } from '@lumara/database'

// Email адреса адміністратора — отримує роль ADMIN автоматично
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'woshem68@gmail.com'

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
    async jwt({ token, user, account, req }) {
      // Перший вхід — user і account є в token
      if (user && account) {
        try {
          const isAdmin = user.email === ADMIN_EMAIL
          const dbUser = await db.user.upsert({
            where: { email: user.email! },
            update: {
              name: user.name,
              image: user.image,
              // Якщо це адмін — виставляємо роль
              ...(isAdmin ? { role: 'ADMIN' } : {}),
            },
            create: {
              email: user.email!,
              name: user.name,
              image: user.image,
              role: isAdmin ? 'ADMIN' : 'USER',
            },
          })
          token.userId = dbUser.id
          token.role = dbUser.role

          // Створюємо профіль якщо не існує
          await db.profile.upsert({
            where: { userId: dbUser.id },
            update: {},
            create: { userId: dbUser.id, language: 'uk', timezone: 'Europe/Kiev' },
          }).catch(() => null)

          // Логуємо вхід в систему
          await db.activityLog.create({
            data: {
              userId: dbUser.id,
              action: 'SIGN_IN',
              metadata: { provider: account.provider },
              // IP та userAgent недоступні в jwt callback — додамо через middleware якщо потрібно
            },
          }).catch(() => null)
        } catch (e) {
          console.error('JWT callback error:', e)
        }
      }

      // Fallback: перевіряємо чи юзер реально існує в БД
      if (token.email && !token.role) {
        try {
          const existingUser = token.userId
            ? await db.user.findUnique({ where: { id: token.userId as string } }).catch(() => null)
            : null

          if (!existingUser) {
            const isAdmin = token.email === ADMIN_EMAIL
            const dbUser = await db.user.upsert({
              where: { email: token.email as string },
              update: {},
              create: {
                email: token.email as string,
                name: token.name as string | undefined,
                image: (token.picture as string | undefined) ?? (token.image as string | undefined),
                role: isAdmin ? 'ADMIN' : 'USER',
              },
            })
            token.userId = dbUser.id
            token.role = dbUser.role
            await db.profile.upsert({
              where: { userId: dbUser.id },
              update: {},
              create: { userId: dbUser.id, language: 'uk', timezone: 'Europe/Kiev' },
            }).catch(() => null)
          } else {
            token.role = existingUser.role
          }
        } catch (e) {
          console.error('JWT fallback error:', e)
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string
        session.user.role = token.role as string
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
      role: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
