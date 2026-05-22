import type { NextConfig } from "next";

const deployTarget = (process.env.NEXT_OUTPUT || "").toLowerCase();
const isStaticExport = deployTarget === "export" || deployTarget === "static" || deployTarget === "shared";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  output: isStaticExport ? "export" : undefined,
  outputFileTracingRoot: __dirname,
  images: {
    unoptimized: isStaticExport,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'randomuser.me',
        port: '',
        pathname: '/**',
      },
    ],
  },
  trailingSlash: isStaticExport,
  // Ensure environment variables are available
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY: process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY,
    NEXT_PUBLIC_CONTACT_API_URL: process.env.NEXT_PUBLIC_CONTACT_API_URL,
  },
};

export default nextConfig;
