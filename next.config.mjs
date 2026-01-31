/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow external packages for vm2
  experimental: {
    serverComponentsExternalPackages: ['vm2'],
  },
};

export default nextConfig;
