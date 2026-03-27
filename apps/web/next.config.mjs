import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { PrismaPlugin } = require('@prisma/nextjs-monorepo-workaround-plugin')
const __dirname = fileURLToPath(new URL('.', import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@lumara/ui', '@lumara/shared', '@lumara/database', '@lumara/agents'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
    outputFileTracingRoot: path.join(__dirname, '../../'),
    outputFileTracingIncludes: {
      '/**': [
        'node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**',
        'node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/libquery_engine*',
      ],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()]
    }
    return config
  },
}

export default nextConfig
