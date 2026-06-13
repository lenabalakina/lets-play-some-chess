import type { NextConfig } from 'next'

function tryParseHost(url: string | undefined): string {
  if (!url) return ''
  try { return new URL(url).hostname } catch { return '' }
}
const supabaseHost = tryParseHost(process.env.NEXT_PUBLIC_SUPABASE_URL)

const connectSrc = [
  "'self'",
  'https://lichess.org',
  ...(supabaseHost ? [`https://${supabaseHost}`, `wss://${supabaseHost}`] : []),
  'https://fonts.googleapis.com',
].join(' ')

// Content Security Policy
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",   // unsafe-eval needed by Three.js / WASM
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src ${connectSrc}`,
  "img-src 'self' data: blob: https:",
  "worker-src 'self' blob:",                            // needed by chess WASM / R3F workers
  "frame-ancestors 'none'",
].join('; ')

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',  value: 'on' },
  { key: 'X-Frame-Options',         value: 'DENY' },
  { key: 'X-Content-Type-Options',  value: 'nosniff' },
  { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: csp },
]

const nextConfig: NextConfig = {
  // Strict React mode catches side-effect bugs early
  reactStrictMode: true,

  // Security headers on all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  // Compiler optimizations
  compiler: {
    // Remove all console.* in production (except console.error)
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error'] }
      : false,
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost }]
      : [],
  },

  // Transpile Three.js and R3F for better tree-shaking
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],

  // Experimental: enable server component external packages
  serverExternalPackages: ['chess.js'],
}

export default nextConfig
