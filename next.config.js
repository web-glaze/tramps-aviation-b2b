/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pre-fix: both ESLint and TypeScript errors were silenced at build time
  // with `ignoreDuringBuilds`/`ignoreBuildErrors`. That meant CI could ship
  // type-broken code straight to production. We default to STRICT, but let
  // the operator opt out via env vars if they truly need an emergency
  // hotfix deploy.
  eslint: {
    ignoreDuringBuilds: process.env.SKIP_LINT === 'true',
  },
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TS_CHECK === 'true',
  },
  images: {
    domains: ['localhost', 'api.travelplatform.com', 'tramps-aviation-backend.onrender.com'],
  },
}

module.exports = nextConfig