import type { NextConfig } from "next";

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com https://apis.google.com https://accounts.google.com https://*.vapi.ai https://*.daily.co blob:;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://lh3.googleusercontent.com;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://formspree.io https://*.googleapis.com https://*.vapi.ai wss://*.vapi.ai https://*.daily.co wss://*.daily.co wss://*.wss.daily.co https://*.pluot.blue wss://*.pluot.blue blob: data: stun: turn:;
    media-src 'self' blob:;
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
  turbopack: {
    root: process.cwd(),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
    workerThreads: true,
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
