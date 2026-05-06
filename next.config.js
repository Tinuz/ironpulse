/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    minimumCacheTTL: 86400, // cache optimized images for 24 hours
    formats: ['image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.muscleandstrength.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        // Supabase storage (avatars, progress photos, exercise images)
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
    ],
  },
}

module.exports = nextConfig
