import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  distDir: process.env.GATEWAY_NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  devIndicators: false,
  serverExternalPackages: ['playwright', 'playwright-core'],
};
export default nextConfig;
