/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,  // ESLint errors build rok nahi paayenge
  },
  typescript: {
    ignoreBuildErrors: true,   // TypeScript errors bhi ignore
  },
  images: {
    domains: ['localhost', 'api.travelplatform.com', 'tramps-aviation-backend.onrender.com'],
  },
}

module.exports = nextConfig