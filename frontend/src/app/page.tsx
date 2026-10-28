import nextDynamic from "next/dynamic";
import { Layout } from "@/components/layout/Layout";
import { Hero } from "@/components/landing/Hero";
import { MetricsBar } from "@/components/landing/MetricsBar";
import { WhyVaakriti } from "@/components/landing/WhyTrinetra";
import { CostOfInaction } from "@/components/landing/CostOfInaction";
import { PlatformEcosystem } from "@/components/landing/PlatformEcosystem";
import { GlobalTelephonyMap } from "@/components/landing/GlobalTelephonyMap";
import { FloatingCallButton } from "@/components/landing/FloatingCallButton";
// Dynamically load the developer-managed Live Voice Studio with real agents and WebRTC
const LiveDemoSection = nextDynamic(
  () => import("@/components/landing/LiveDemoSection").then((mod) => ({ default: mod.default || mod.LiveDemoSection })),
  {
    loading: () => <div className="min-h-[420px] w-full bg-white" />,
  }
);

// Dynamically load the Real Personalized Dashboard Preview
const PersonalizedDashboardSection = nextDynamic(
  () => import("@/components/landing/PersonalizedDashboardSection").then((mod) => ({ default: mod.default || mod.PersonalizedDashboardSection })),
  {
    loading: () => <div className="min-h-[360px] w-full" />,
  }
);

export const revalidate = 60;

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Vaakriti AI — The Creation of Voice',
            url: 'https://vaakriti.com',
            description:
              'Autonomous Voice AI Infrastructure for Indian Enterprise. Sub-480ms latency, native vernacular code-switching, and full statutory TRAI compliance.',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://vaakriti.com/products?q={search_term_string}',
              'query-input': 'required name=search_term_string',
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Vaakriti Enterprise Voice AI Platform',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://vaakriti.com',
            description:
              'Autonomous Enterprise Voice Platform powering 24/7 inbound receptionists, high-velocity outbound campaigns, and real-time CRM intelligence across 12+ Indian languages.',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'INR',
              availability: 'https://schema.org/InStock',
            },
            creator: {
              '@type': 'Organization',
              name: 'Vaakriti AI',
              url: 'https://vaakriti.com',
            },
          }),
        }}
      />
      <Layout theme="vaakriti">
        <div
          suppressHydrationWarning
          className="homepage-theme-root flex flex-col min-h-screen transition-colors duration-300"
          style={{
            backgroundColor: "var(--theme-bg, #FAFAFA)",
            color: "var(--theme-text-primary, #0F172A)",
          }}
        >

          {/* 1. Cinematic Hero Section with 3D Plasma Ring & Quick Call Trigger */}
          <div
            suppressHydrationWarning
            className="relative w-full flex flex-col items-center justify-start overflow-hidden transition-colors duration-300"
            style={{
              backgroundColor: "var(--theme-bg-hero, #FAFAFA)",
            }}
          >
            <Hero />
            <MetricsBar />
          </div>

          {/* 2. Interactive Voice Studio (Managed by Developer Portal, Real Agents & Transcripts) */}
          <LiveDemoSection />

          {/* 3. Core Enterprise Value Proposition & USPs */}
          <WhyVaakriti />

          {/* 4. The Problem & Financial Urgency: Unanswered Calls Cost Matrix */}
          <CostOfInaction />

          {/* 5. Complete Sovereign Business Stack & Telephony Ecosystem */}
          <PlatformEcosystem />

          {/* 6. Global Telephony Fabric & Animated World Map */}
          <GlobalTelephonyMap />

          {/* 7. Real Personalized Dashboard Preview (Interactive Industry Switcher) */}
          <PersonalizedDashboardSection />

          {/* Persistent Floating Quick Call Widget */}
          <FloatingCallButton />


        </div>
      </Layout>
    </>
  );
}
