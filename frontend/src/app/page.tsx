import nextDynamic from "next/dynamic";
import { Layout } from "@/components/layout/Layout";
import { Hero } from "@/components/landing/Hero";
import { MetricsBar } from "@/components/landing/MetricsBar";
import { TrinetraShikshaSection } from "@/components/landing/TrinetraShikshaSection";
import { ProductsShowcase } from "@/components/landing/ProductsShowcase";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PartnerProgram } from "@/components/landing/PartnerProgram";
import { WhyTrinetra } from "@/components/landing/WhyTrinetra";
import { IndustriesWeServe } from "@/components/landing/IndustriesWeServe";
import { Testimonials } from "@/components/landing/Testimonials";
import { FloatingCallButton } from "@/components/landing/FloatingCallButton";

const LiveDemoSection = nextDynamic(
  () =>
    import("@/components/landing/LiveDemoSection").then(
      (mod) => mod.LiveDemoSection || mod.default
    ),
  {
    loading: () => <div className="min-h-[200px] w-full bg-white" />,
  }
);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Trinetra AI',
            url: 'https://trinetraedu-ai.com',
            description:
              'Deploy self-healing AI agents, autonomous voice workflows, and AI-powered education tools on one unified platform.',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://trinetraedu-ai.com/marketplace?q={search_term_string}',
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
            name: 'Trinetra AI',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://trinetraedu-ai.com',
            description:
              'Autonomous Business OS powering self-healing AI agents, voice workflows, and AI-driven education through Trinetra Shiksha.',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'INR',
              availability: 'https://schema.org/InStock',
            },
            creator: {
              '@type': 'Organization',
              name: 'Trinetra AI',
              url: 'https://trinetraedu-ai.com',
            },
          }),
        }}
      />
      <Layout theme="vaakriti">
        <div className="homepage-theme-root flex flex-col bg-white min-h-screen text-[#111827]">

          {/* First Page Viewport: Main Heading, Hero Object & Moving Section */}
          <div className="relative w-full flex flex-col items-center justify-start overflow-hidden bg-white">
            {/* ── CONTINUOUS SEAMLESS TOP-TO-BOTTOM AMBIENT CANOPY ── */}
            {/* Flows uninterrupted from top 0 down past the plasma ring and through the products ticker */}
            <div
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(16, 185, 129, 0.32) 0%, rgba(5, 150, 105, 0.20) 22%, rgba(13, 148, 136, 0.12) 48%, rgba(16, 185, 129, 0.05) 75%, transparent 100%)",
              }}
            />

            {/* Primary Luminous Top Radial Canopy (Radiates emerald & teal aura from top center) */}
            <div
              className="pointer-events-none absolute -top-24 inset-x-0 h-[880px] opacity-95 blur-[95px] z-0"
              style={{
                background:
                  "radial-gradient(ellipse 110% 75% at 50% 0%, rgba(16, 185, 129, 0.40) 0%, rgba(5, 150, 105, 0.28) 32%, rgba(13, 148, 136, 0.18) 60%, transparent 88%)",
              }}
            />

            {/* Atmospheric Flank (Left): Soft luminous Teal & Aqua light */}
            <div
              className="pointer-events-none absolute top-0 left-[-5%] sm:left-[5%] w-[650px] sm:w-[850px] h-[850px] opacity-75 blur-[105px] z-0"
              style={{
                background:
                  "radial-gradient(circle, rgba(13, 148, 136, 0.28) 0%, rgba(6, 182, 212, 0.16) 45%, transparent 75%)",
              }}
            />

            {/* Atmospheric Flank (Right): Luminous Warm Jade & Golden Sun tone */}
            <div
              className="pointer-events-none absolute top-0 right-[-5%] sm:right-[5%] w-[650px] sm:w-[850px] h-[850px] opacity-75 blur-[105px] z-0"
              style={{
                background:
                  "radial-gradient(circle, rgba(16, 185, 129, 0.28) 0%, rgba(245, 158, 11, 0.14) 45%, transparent 75%)",
              }}
            />

            <Hero />
            <MetricsBar />
          </div>

          {/* Live Interactive Voice Demo Studio (Managed by developer_tester) */}
          <LiveDemoSection />

          {/* Trinetra Shiksha Spotlight */}
          <TrinetraShikshaSection />

          {/* Our Products / Use Cases (Alternating) */}
          <ProductsShowcase />

          {/* How It Works Pipeline */}
          <HowItWorks />

          {/* Partner Program */}
          <PartnerProgram />

          {/* Why Trinetra (Differentiators) */}
          <WhyTrinetra />

          {/* Industries / Verticals */}
          <IndustriesWeServe />

          {/* Testimonials / Social Proof */}
          <Testimonials />

          {/* Persistent Floating Widget */}
          <FloatingCallButton />

        </div>
      </Layout>
    </>
  );
}
