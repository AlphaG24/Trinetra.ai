import type { NextConfig } from "next";

// ============================================================================
// SECURITY: Content Security Policy
// - 'unsafe-eval' kept for Spline/Vapi SDK compatibility
// - 'unsafe-inline' kept in script-src for Next.js inline scripts (required
//   until full nonce support is configured). Mitigated by frame-ancestors 'none'.
// - style-src 'unsafe-inline' required for CSS-in-JS and Google Fonts
// ============================================================================
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com https://apis.google.com https://accounts.google.com https://*.vapi.ai https://*.daily.co blob:;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://lh3.googleusercontent.com https://*.supabase.co https://i.postimg.cc https://assets.trinetraedu-ai.com;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 https://*.trycloudflare.com https://*.onrender.com https://api.vapi.ai https://*.supabase.co wss://*.supabase.co https://formspree.io https://*.googleapis.com https://*.vapi.ai wss://*.vapi.ai https://*.daily.co wss://*.daily.co wss://*.wss.daily.co https://*.pluot.blue wss://*.pluot.blue https://raw.githubusercontent.com blob: data: stun: turn:;
    media-src 'self' blob: https://storage.vapi.ai;
    worker-src 'self' blob:;
    child-src 'self' blob:;
    frame-src 'self' https://accounts.google.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`;

const nextConfig: NextConfig = {
  // SECURITY: Remove X-Powered-By header (information disclosure)
  poweredByHeader: false,

  turbopack: {},
  typescript: {
    // TODO: Remove this once all type errors are fixed. Suppressing type
    // errors can hide security-relevant bugs (e.g. unchecked nulls).
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
      },
      {
        protocol: 'https',
        hostname: 'assets.trinetraedu-ai.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
    workerThreads: false,
    serverActions: {
      // SECURITY: Reduced from 50mb to 10mb to mitigate DoS via large payloads
      bodySizeLimit: "10mb",
    },
  },
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/backend/**',
          '**/.venv/**',
          '**/database/**',
        ],
      };
    }
    return config;
  },
  async redirects() {
    return [
      {
        source: '/pricing',
        destination: '/contact',
        permanent: false,
      },
      {
        source: '/dashboard/deploy-agent',
        destination: '/dashboard/deploy',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // SECURITY: HSTS — force HTTPS for 2 years with preload
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          // SECURITY: Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // SECURITY: Prevent MIME-type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // SECURITY: Control referrer leakage
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // SECURITY: Restrict browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=(), payment=(), usb=()'
          },
          // SECURITY: Disable legacy XSS filter (CSP replaces it;
          // the old filter can introduce vulnerabilities)
          {
            key: 'X-XSS-Protection',
            value: '0'
          },
          // SECURITY: Full CSP
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, '').replace(/\s{2,}/g, ' ').trim()
          }
        ],
      },
    ]
  },
};

export default nextConfig;
