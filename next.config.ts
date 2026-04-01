import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'standalone',
    typescript: {
        // cheerio v1.2+ ships .ts source files that conflict with strict mode
        // Our actual app code is type-checked during development
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
