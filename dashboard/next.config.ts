import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  images: {
    unoptimized: true, // For static export compatibility
  },
};

export default nextConfig;
