/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Only used by the local dev server (including Playwright on 127.0.0.1).
  // Production is a static export with no Next.js request server.
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

module.exports = nextConfig;
