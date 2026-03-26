import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@lumara/ui', '@lumara/shared', '@lumara/database'],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
}

export default nextConfig
