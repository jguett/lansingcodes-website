import type { NextConfig } from 'next'

if (process.env.NODE_ENV === 'production' && process.env.DATA_STORE === 'mock') {
  throw new Error('DATA_STORE=mock is for development only')
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.meetup.com',
      },
      {
        protocol: 'https',
        hostname: 'secure.meetupstatic.com',
      },
    ],
  },
}

export default nextConfig
