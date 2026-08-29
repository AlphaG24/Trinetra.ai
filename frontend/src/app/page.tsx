import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Layout } from "@/components/layout/Layout";
import { Hero } from "@/components/landing/Hero";
import { MetricsBar } from "@/components/landing/MetricsBar";
import { WhatWeBuild } from "@/components/landing/WhatWeBuild";
import { TrinetraShikshaSection } from "@/components/landing/TrinetraShikshaSection";
import { ProductsShowcase } from "@/components/landing/ProductsShowcase";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PartnerProgram } from "@/components/landing/PartnerProgram";
import { WhyTrinetra } from "@/components/landing/WhyTrinetra";
import { IndustriesWeServe } from "@/components/landing/IndustriesWeServe";
import { Testimonials } from "@/components/landing/Testimonials";
import { FloatingCallButton } from "@/components/landing/FloatingCallButton";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Fetch role for proper routing
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const role = (profile?.role || 'client').toLowerCase()
    const isAdmin = role === 'admin' || role === 'super_admin'
    redirect(isAdmin ? '/admin' : '/dashboard')
  }

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
      <Layout>
        <div className="flex flex-col bg-trinetra-bg min-h-screen">

        {/* Hero Section */}
        <Hero />

        {/* Metrics Social Proof Bar */}
        <MetricsBar />

        {/* What We Build (Three Pillars) */}
        <WhatWeBuild />

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
