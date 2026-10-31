import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface InfrastructurePillar {
  id: string;
  name: string;
  subtitle: string;
  metric: string;
  features: string[];
}

const PILLARS: InfrastructurePillar[] = [
  {
    id: "intelligence",
    name: "Knowledge & Intelligence",
    subtitle: "Upload documents, catalogs, and FAQs for instant sub-20ms semantic contextual retrieval.",
    metric: "<20ms retrieval",
    features: ["Vector Embeddings", "Document Ingestion", "Contextual Recall"],
  },
  {
    id: "telephony",
    name: "Sovereign Infrastructure",
    subtitle: "Direct Tier-1 telecom interconnects, SIP trunks, and clean regional DIDs across 100+ cities.",
    metric: "100+ City DIDs",
    features: ["Virtual PBX Sync", "Ultra-Low Latency", "Zero Jitter WebRTC"],
  },
  {
    id: "commercials",
    name: "Commercial Flexibility",
    subtitle: "Transparent pay-per-second billing with auto-reloads, no lock-in, and volume credit scores.",
    metric: "Per-second metering",
    features: ["Prepaid Wallet", "Zero Commitments", "Enterprise Credit Line"],
  },
  {
    id: "governance",
    name: "Governance & Compliance",
    subtitle: "Statutory 09:00-21:00 calling windows, DND scrub engine, AI disclosure, and encrypted call vaults.",
    metric: "Bank-Grade Encryption",
    features: ["DND Scrub Engine", "AI Identity Notice", "Searchable Transcripts"],
  },
];

export function PlatformEcosystem() {
  return (
    <section
      id="features"
      className="w-full py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-10 select-none font-sans bg-white border-t border-b border-slate-200"
    >
      <div className="w-full max-w-[1400px] mx-auto">
        
        {/* ── SECTION HEADER ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8 sm:mb-10">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold tracking-tight leading-[1.15] text-[#0F172A] font-sans">
              More than a voice agent. <br className="hidden sm:inline" />
              <span className="text-[#2563EB]">A complete business solution.</span>
            </h2>
          </div>

          <div className="shrink-0">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs sm:text-[13px] font-semibold transition-all shadow-xs group cursor-pointer font-sans bg-white border-slate-200 text-[#0F172A] hover:border-[#2563EB] hover:text-[#2563EB]"
            >
              <span>Explore all capabilities</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* ── 4-PILLAR GRID ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {PILLARS.map((pillar) => {
            return (
              <div
                key={pillar.id}
                className="relative rounded-2xl border border-slate-200/90 p-5 sm:p-6 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer bg-white shadow-[0_1px_4px_rgba(15,23,42,0.04)] hover:border-[#2563EB]/45 hover:-translate-y-1.5 hover:shadow-[0_16px_36px_-10px_rgba(37,99,235,0.12),0_4px_12px_rgba(15,23,42,0.04)] overflow-hidden"
              >
                {/* Ambient Soft Glow on Hover (No harsh lines) */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-blue-50/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative z-10">
                  {/* Metric Badge */}
                  <div className="mb-4">
                    <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono tracking-wide uppercase transition-all duration-200 bg-slate-50 text-slate-500 border border-slate-100 group-hover:bg-blue-50 group-hover:text-[#2563EB] group-hover:border-blue-200/80">
                      {pillar.metric}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-[15px] sm:text-base font-bold text-[#0F172A] tracking-tight font-sans leading-snug mb-2.5 transition-colors duration-200 group-hover:text-[#2563EB]">
                    {pillar.name}
                  </h3>

                  {/* Description */}
                  <p className="text-xs sm:text-[13px] text-[#64748B] leading-relaxed font-sans mb-5">
                    {pillar.subtitle}
                  </p>
                </div>

                {/* Feature Bullets */}
                <div className="relative z-10 pt-4 border-t border-slate-100 space-y-2">
                  {pillar.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2 text-xs font-medium text-slate-600 transition-colors duration-200 group-hover:text-[#0F172A]">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 transition-all duration-200 text-slate-300 group-hover:text-[#2563EB] group-hover:scale-105" />
                      <span>{feat}</span>
                    </div>
                  ))}
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
