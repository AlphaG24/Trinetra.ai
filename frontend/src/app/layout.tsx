import type { Metadata } from "next";
import "./globals.css";
import { Inter, JetBrains_Mono, Playfair_Display, Montserrat, Merriweather } from "next/font/google";
import localFont from 'next/font/local';
import { Toaster } from "sonner";
import { AuthProvider } from "@/src/components/providers/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700', '400'], variable: '--font-playfair' })
const montserrat = Montserrat({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-montserrat' })
const merriweather = Merriweather({ subsets: ['latin'], weight: ['300', '400'], variable: '--font-merriweather' })

const calSans = localFont({
  src: [
    {
      path: '../../public/fonts/cal-sans/CalSans-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-cal-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://trinetraedu-ai.com'),
  title: {
    default: 'Trinetra AI — Intelligent Voice Agents for Indian Business',
    template: '%s | Trinetra AI',
  },
  description:
    'Deploy AI voice agents in 60 seconds. Zero-code platform for Indian MSMEs. Hinglish & multilingual support. Start with ₹99 trial.',
  keywords: [
    'AI voice agent',
    'voice bot India',
    'Hinglish AI',
    'automated calling',
    'business phone agent',
    'Trinetra AI',
    'AI agents',
    'autonomous AI',
    'AI workflows',
  ],
  authors: [{ name: 'Trinetra AI', url: 'https://trinetraedu-ai.com' }],
  creator: 'Trinetra AI',
  publisher: 'Trinetra AI',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://trinetraedu-ai.com',
    siteName: 'Trinetra AI',
    title: 'Trinetra AI — Intelligent Voice Agents for Indian Business',
    description:
      'Deploy AI voice agents in 60 seconds. Zero-code platform for Indian MSMEs. Hinglish & multilingual support. Start with ₹99 trial.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Trinetra AI — Intelligent Voice Agents',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trinetra AI — Intelligent Voice Agents for Indian Business',
    description:
      'Deploy AI voice agents in 60 seconds. Zero-code platform for Indian MSMEs. Hinglish & multilingual support. Start with ₹99 trial.',
    images: ['/og-image.png'],
    creator: '@trinetra_ai',
  },
  robots: {
    index: true,
    follow: true,
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
  alternates: {
    canonical: 'https://trinetraedu-ai.com',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://trinetraedu-ai.com/#organization",
        "name": "Trinetra AI",
        "url": "https://trinetraedu-ai.com",
        "logo": "https://trinetraedu-ai.com/logo.png",
        "description": "Intelligent Voice Agents for Indian Business. Deploy AI voice agents in 60 seconds.",
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+91-9999999999",
          "contactType": "customer service",
          "email": "support@trinetraedu-ai.com",
          "availableLanguage": ["en", "hi"]
        }
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://trinetraedu-ai.com/#application",
        "name": "Trinetra AI Platform",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "All",
        "url": "https://trinetraedu-ai.com",
        "offers": {
          "@type": "Offer",
          "price": "99.00",
          "priceCurrency": "INR"
        }
      }
    ]
  };

  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable} ${calSans.variable} ${playfair.variable} ${montserrat.variable} ${merriweather.variable}`} data-scroll-behavior="smooth">
      <body suppressHydrationWarning className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AuthProvider>
          {children}
          <Toaster position="bottom-right" theme="dark" />
        </AuthProvider>
      </body>
    </html>
  );
}

