/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Ensure lucide-react resolves to per-icon imports (avoids pulling the barrel).
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Allow next/image to optimize images served from Supabase Storage
  // (landing hero/teacher photos + app logo).
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
};

module.exports = withPWA(nextConfig);
