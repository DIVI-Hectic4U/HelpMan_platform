/** @type {import('next').NextConfig} */
const nextConfig = {

  // Environment variable passthrough to client
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "",
  },

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Skip TypeScript check on Vercel (validated locally)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
