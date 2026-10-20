import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { Inter, JetBrains_Mono, Playfair_Display, Montserrat, Merriweather } from "next/font/google";
import localFont from 'next/font/local';
import { Toaster } from "sonner";
import { Toaster as HotToaster } from "react-hot-toast";
import { AuthProvider } from "@/src/components/providers/AuthProvider";
// Client wrapper that applies ssr:false for MaintenanceWatcher
import { MaintenanceWatcherLoader } from '@/src/components/dashboard/MaintenanceWatcherLoader';

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

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700', '400'], variable: '--font-playfair', display: 'swap' })
const montserrat = Montserrat({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-montserrat', display: 'swap' })
const merriweather = Merriweather({ subsets: ['latin'], weight: ['300', '400'], variable: '--font-merriweather', display: 'swap' })

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
  metadataBase: new URL('https://vaakriti.com'),
  title: {
    default: 'Vaakriti AI — The Creation of Voice | Intelligent Voice Agents',
    template: '%s | Vaakriti AI',
  },
  description:
    'Deploy AI voice agents in 60 seconds. Zero-code platform for Indian MSMEs & global enterprises. Hinglish & multilingual support.',
  keywords: [
    'AI voice agent',
    'voice bot India',
    'Hinglish AI',
    'automated calling',
    'business phone agent',
    'Vaakriti AI',
    'Vaakriti',
    'AI agents',
    'autonomous AI',
    'AI workflows',
  ],
  authors: [{ name: 'Vaakriti AI', url: 'https://vaakriti.com' }],
  creator: 'Vaakriti AI',
  publisher: 'Vaakriti AI',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://vaakriti.com',
    siteName: 'Vaakriti AI',
    title: 'Vaakriti AI — The Creation of Voice | Intelligent Voice Agents',
    description:
      'Deploy AI voice agents in 60 seconds. Zero-code platform for Indian MSMEs & global enterprises. Hinglish & multilingual support.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Vaakriti AI — Intelligent Voice Agents',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vaakriti AI — The Creation of Voice | Intelligent Voice Agents',
    description:
      'Deploy AI voice agents in 60 seconds. Zero-code platform for Indian MSMEs & global enterprises. Hinglish & multilingual support.',
    images: ['/og-image.png'],
    creator: '@vaakriti_ai',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-light.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-dark.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  alternates: {
    canonical: 'https://vaakriti.com',
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('trinetra-theme')?.value;
  const initialTheme = themeCookie === 'dark' ? 'dark' : 'light';

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://vaakriti.com/#organization",
        "name": "Vaakriti AI",
        "url": "https://vaakriti.com",
        "logo": "https://vaakriti.com/logo.png",
        "description": "Intelligent Voice Agents for Modern Businesses. Deploy AI voice agents in 60 seconds.",
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+91-9999999999",
          "contactType": "customer service",
          "email": "support@vaakriti.com",
          "availableLanguage": ["en", "hi"]
        }
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://vaakriti.com/#application",
        "name": "Vaakriti AI Platform",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "All",
        "url": "https://vaakriti.com",
        "offers": {
          "@type": "Offer",
          "price": "99.00",
          "priceCurrency": "INR"
        }
      }
    ]
  };

  let initialMaintenanceMode = false;
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false }
      }
    );
    const queryPromise = supabaseAdmin
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'maintenance_mode')
      .maybeSingle();

    const timeoutPromise = new Promise<any>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase layout check timeout')), 1500)
    );

    const result = await Promise.race([queryPromise, timeoutPromise]);
    initialMaintenanceMode = result?.data?.config_value === 'true';
  } catch {
    initialMaintenanceMode = false;
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme={initialTheme}
      className={`${initialTheme} ${inter.variable} ${jetbrainsMono.variable} ${calSans.variable} ${playfair.variable} ${montserrat.variable} ${merriweather.variable}`}
      data-scroll-behavior="smooth"
    >
      <body suppressHydrationWarning className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AuthProvider>
          <Suspense fallback={null}>
            <MaintenanceWatcherLoader initialMaintenanceMode={initialMaintenanceMode} />
          </Suspense>
          {children}
          <Toaster position="bottom-right" theme={initialTheme === 'light' ? 'light' : 'dark'} />
          <HotToaster position="top-right" toastOptions={{ style: { background: '#18181b', color: '#f4f4f5', border: '1px solid #27272a' } }} />
        </AuthProvider>
      </body>
    </html>
  );
}

