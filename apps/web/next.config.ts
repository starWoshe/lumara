import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Дозволяємо імпорти з packages/
  transpilePackages: ['@lumara/ui', '@lumara/shared', '@lumara/database'],

  // Оптимізація зображень
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  // Експериментальні функції Next.js 14
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
}

export default nextConfig
