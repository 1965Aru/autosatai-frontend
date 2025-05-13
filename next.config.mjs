// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1) Make sure Next.js bundles your public API URL
  //    (Vercel will inject process.env.NEXT_PUBLIC_API_BASE_URL at build time)
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },

  // 2) Proxy any client-side fetch("/api/...") to your Render backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',                           // incoming client calls
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/:path*`
      }
    ]
  }
}

export default nextConfig
