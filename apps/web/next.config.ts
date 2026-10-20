import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@audiocanvas/shared'],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
