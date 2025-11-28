/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
};

export default nextConfig;
