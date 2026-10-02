import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@opea/shared', '@opea/api-client'],
};

export default nextConfig;
