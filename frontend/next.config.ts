import type { NextConfig } from "next";

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com https://apis.google.com https://accounts.google.com https://*.vapi.ai https://*.daily.co https://dashboard.retellai.com https://api.retellai.com https://*.retellai.com blob:;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://lh3.googleusercontent.com https://dashboard.retellai.com https://api.retellai.com https://*.retellai.com https://*.supabase.co;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' http://localhost:8000 https://*.trycloudflare.com https://trinetra-ai-1-6f2n.onrender.com https://*.onrender.com https://api.vapi.ai https://*.supabase.co wss://*.supabase.co https://formspree.io https://*.googleapis.com https://*.vapi.ai wss://*.vapi.ai https://*.daily.co wss://*.daily.co wss://*.wss.daily.co https://*.pluot.blue wss://*.pluot.blue https://dashboard.retellai.com https://api.retellai.com https://*.retellai.com wss://*.retellai.com https://raw.githubusercontent.com blob: data: stun: turn:;
    media-src 'self' blob: https://dashboard.retellai.com https://api.retellai.com https://*.retellai.com https://storage.vapi.ai;
    worker-src 'self' blob:;
    child-src 'self' blob: https://dashboard.retellai.com https://api.retellai.com https://*.retellai.com;
    frame-src 'self' https://accounts.google.com https://dashboard.retellai.com https://api.retellai.com https://*.retellai.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
`;

const nextConfig: NextConfig = {
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
    workerThreads: false,
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
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()'
          },
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
