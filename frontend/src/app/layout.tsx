import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/src/components/providers/AuthProvider";

export const metadata: Metadata = {
  metadataBase: new URL('https://trinetraedu-ai.com'),
  title: {
    default: 'Trinetra AI — Autonomous Business OS & AI Education Platform',
    template: '%s | Trinetra AI',
  },
  description:
    'Deploy self-healing AI agents, autonomous voice workflows, and AI-powered education tools. Trinetra bridges cognitive learning and intelligent business automation on one unified platform.',
  keywords: [
    'AI agents',
    'autonomous AI',
    'AI education',
    'AI voice agents',
    'business automation',
    'AI workflows',
    'AI platform',
    'self-healing AI',
    'conversational AI',
    'AI for education',
    'AI SaaS',
    'Trinetra AI',
    'AI marketplace',
  ],
  authors: [{ name: 'Trinetra AI', url: 'https://trinetraedu-ai.com' }],
  creator: 'Trinetra AI',
  publisher: 'Trinetra AI',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://trinetraedu-ai.com',
    siteName: 'Trinetra AI',
    title: 'Trinetra AI — Autonomous Business OS & AI Education Platform',
    description:
      'Deploy self-healing AI agents, autonomous voice workflows, and AI-powered education tools on one unified platform.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Trinetra AI — Autonomous Business OS',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trinetra AI — Autonomous Business OS & AI Education Platform',
    description:
      'Deploy self-healing AI agents, autonomous voice workflows, and AI-powered education tools.',
    images: ['/og-image.png'],
    creator: '@trinetra_ai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body suppressHydrationWarning className="antialiased">
        <AuthProvider>
          {children}
          <Toaster position="bottom-right" theme="dark" />
        </AuthProvider>
      </body>
    </html>
  );
}
