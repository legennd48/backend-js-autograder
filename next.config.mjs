import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow external packages for vm2
  serverExternalPackages: ['vm2'],

  // Prevent Next from inferring the wrong monorepo/workspace root
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
