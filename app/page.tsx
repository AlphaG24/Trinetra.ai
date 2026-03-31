"use client";

import { Layout } from "@/components/layout/Layout";
import { Hero } from "@/components/landing/Hero";
import { MetricsBar } from "@/components/landing/MetricsBar";
import { WhatWeBuild } from "@/components/landing/WhatWeBuild";
import { ProductsShowcase } from "@/components/landing/ProductsShowcase";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { RoiDashboardPreview } from "@/components/landing/RoiDashboardPreview";
import { WhyTrinetra } from "@/components/landing/WhyTrinetra";
import { IndustriesWeServe } from "@/components/landing/IndustriesWeServe";
import { Testimonials } from "@/components/landing/Testimonials";
import { FloatingCallButton } from "@/components/landing/FloatingCallButton";

export default function Home() {
  return (
    <Layout>
      <div className="flex flex-col bg-trinetra-bg min-h-screen">

        {/* Hero Section */}
        <Hero />

        {/* Metrics Social Proof Bar */}
        <MetricsBar />

        {/* What We Build (Three Pillars) */}
        <WhatWeBuild />

        {/* Our Products / Use Cases (Alternating) */}
        <ProductsShowcase />

        {/* How It Works Pipeline */}
        <HowItWorks />

        {/* ROI Dashboard Visualization */}
        <RoiDashboardPreview />

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
  );
}
