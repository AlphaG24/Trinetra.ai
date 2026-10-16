import React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, PhoneCall, Wallet, Award, Mic, ShieldCheck, Layers } from "lucide-react";

interface FeatureCard {
  category: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FEATURE_CARDS: FeatureCard[] = [
  {
    category: "Knowledge & Intelligence",
    title: "Knowledge Base",
    description: "Upload your documents, pricing sheets, FAQs, and policies for instant contextual retrieval.",
    icon: BookOpen,
  },
  {
    category: "Telephony Infrastructure",
    title: "Number Management",
    description: "Bring your existing virtual PBX numbers or provision clean regional DIDs across 100+ cities.",
    icon: PhoneCall,
  },
  {
    category: "Commercial Flexibility",
    title: "Prepaid Wallet",
    description: "Transparent pay-per-second billing with auto-reloads and zero upfront lock-in commitments.",
    icon: Wallet,
  },
  {
    category: "Commercial Flexibility",
    title: "Credit Score",
    description: "Build an enterprise credit line with predictable consumption discounts on sustained volume.",
    icon: Award,
  },
  {
    category: "Governance & Storage",
    title: "Call Recordings",
    description: "Military-grade encrypted storage with searchable transcripts and sentiment analysis.",
    icon: Mic,
  },
  {
    category: "Governance & Security",
    title: "Region-Aware Compliance",
    description: "Enforces statutory calling floors (09:00 - 21:00), DND scrub lists, and AI disclosure notices.",
    icon: ShieldCheck,
  },
];

export function PlatformEcosystem() {
  return (
    <section
      id="features"
      className="w-full py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-10 select-none font-sans transition-colors duration-300"
      style={{
        backgroundColor: "var(--theme-bg-eco, #FAFAFA)",
        borderTop: "1px solid var(--theme-border, #E5E5E5)",
      }}
    >
      <div className="w-full max-w-[1400px] mx-auto">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 sm:mb-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase mb-3 border bg-white border-[#E2E8F0] text-[#315CFF]">
              <Layers className="w-3.5 h-3.5 text-[#315CFF]" />
              <span>PLATFORM ARCHITECTURE</span>
            </div>

            <h2
              className="text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-tight leading-[1.12] mb-3 font-[family-name:var(--font-cal-sans)] transition-colors duration-300"
              style={{ color: "var(--theme-text-primary, #080D18)" }}
            >
              More than a voice agent. <br />
              <span style={{ color: "var(--theme-accent, #315CFF)" }}>
                A complete business solution.
              </span>
            </h2>

            <p
              className="text-base sm:text-lg font-normal leading-relaxed font-sans transition-colors duration-300"
              style={{ color: "var(--theme-text-secondary, #4A5568)" }}
            >
              Every foundational layer required to deploy, monitor, and scale sovereign enterprise voice pipelines.
            </p>
          </div>

          <div className="shrink-0">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border text-xs sm:text-sm font-semibold transition-all shadow-2xs group cursor-pointer font-sans bg-white border-[#CBD5E1] text-[#080D18] hover:border-[#315CFF] hover:text-[#315CFF]"
            >
              <span>Explore all capabilities</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* 6 Structured Capability Cards (3x2 Grid for generous proportions) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURE_CARDS.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-7 flex flex-col justify-between shadow-[0_2px_12px_rgba(8,13,24,0.02)] hover:border-[#315CFF]/50 hover:shadow-[0_8px_24px_rgba(49,92,255,0.06)] hover:-translate-y-0.5 transition-all duration-200"
              >
                <div>
                  {/* Category Pill and Icon Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-[#315CFF]/8 border border-[#315CFF]/15 flex items-center justify-center text-[#315CFF]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10.5px] font-mono font-semibold uppercase tracking-wider text-[#718096]">
                      {card.category}
                    </span>
                  </div>

                  {/* Card Title */}
                  <h3
                    className="text-lg font-bold tracking-tight leading-snug mb-2 font-sans"
                    style={{ color: "var(--theme-text-primary, #080D18)" }}
                  >
                    {card.title}
                  </h3>

                  {/* Card Description */}
                  <p
                    className="text-xs sm:text-[13.5px] font-normal leading-relaxed font-sans"
                    style={{ color: "var(--theme-text-secondary, #4A5568)" }}
                  >
                    {card.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

export default PlatformEcosystem;
