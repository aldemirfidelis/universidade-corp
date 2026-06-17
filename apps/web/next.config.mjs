/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 'standalone' só no build de produção (Docker/Linux). No Windows local os
  // symlinks do pnpm falham com EPERM, então mantemos desligado por padrão.
  output: process.env.BUILD_STANDALONE ? 'standalone' : undefined,
  transpilePackages: ['@uc/shared'],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
