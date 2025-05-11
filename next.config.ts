
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export', // Enables static HTML export
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: true, // Required for next export with next/image
  },
  // If you are using App Router and `output: 'export'`,
  // trailingSlashes: true, // Optional: can be useful for consistency if your server expects trailing slashes
  // distDir: 'out', // Optional: if you want to specify the output directory name explicitly (default is 'out')
};

export default nextConfig;
