import React from "react";
import Image from "next/image";
import { Mic, Zap, Languages, CheckCircle2, Sparkles } from "lucide-react";

interface FeaturePillar {
  number: string;
  badge: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FEATURE_PILLARS: FeaturePillar[] = [
  {
    number: "01",
    badge: "Turn-Taking",
    title: "Natural, Fluid Conversations",
    description:
      "Callers can speak casually, pause to think, or change their mind mid-sentence. The AI listens, pauses instantly when interrupted, and pivots the conversation naturally.",
    icon: Mic,
  },
  {
    number: "02",
    badge: "5,000+ Lines",
    title: "Zero Hold Times, Instant Scale",
    description:
      "Instant pickup with 0s queue time. Whether 5 calls a day or a peak rush of 5,000 inquiries in the same minute, every caller gets immediate, attentive support 24/7.",
    icon: Zap,
  },
  {
    number: "03",
    badge: "Global Dialects",
    title: "Fluent Across Languages",
    description:
      "Native fluency across global languages and regional dialects. Your AI effortlessly detects accents and switches languages mid-conversation so every caller feels understood.",
    icon: Languages,
  },
  {
    number: "04",
    badge: "Action-Driven",
    title: "Calls That Actually Complete Work",
    description:
      "Far beyond scripted FAQ bots. The agent autonomously books calendar meetings, qualifies sales intent, and syncs records to your CRM in real time.",
    icon: CheckCircle2,
  },
];

export function WhyTrinetra() {
  return (
    <section
      id="why-trinetra"
      className="w-full py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-10 relative z-10 select-none overflow-hidden transition-colors duration-300"
      style={{
        backgroundColor: "var(--theme-bg-why, #FAFAFA)",
        borderTop: "1px solid var(--theme-border, #E5E5E5)",
        borderBottom: "1px solid var(--theme-border, #E5E5E5)",
      }}
    >
      <div className="mx-auto max-w-[1400px]">
        {/* ── 2-COLUMN GRAND SHOWCASE: EDITORIAL GRID + ILLUSTRATED CHARACTER ── */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
          
          {/* ── LEFT COLUMN: EDITORIAL CONTENT & 4 FEATURE CARDS ── */}
          <div className="w-full lg:w-[58%] xl:w-[60%] flex flex-col justify-center">
            <div>
              {/* Eyebrow Label */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase mb-3 border bg-white border-[#E2E8F0] text-[#315CFF]">
                <Sparkles className="w-3.5 h-3.5 text-[#315CFF]" />
                <span>VOICE AGENT CAPABILITIES</span>
              </div>

              {/* Editorial Display Heading with Cal Sans */}
              <h2
                className="text-3xl sm:text-4xl lg:text-[46px] xl:text-[52px] font-bold tracking-tight leading-[1.12] mb-4 font-[family-name:var(--font-cal-sans)] transition-colors duration-300"
                style={{ color: "var(--theme-text-primary, #080D18)" }}
              >
                AI voice agents that understand{" "}
                <span style={{ color: "var(--theme-accent, #315CFF)" }}>
                  real people.
                </span>
              </h2>

              {/* Descriptive Value Subtitle */}
              <p
                className="text-base sm:text-lg font-normal leading-relaxed max-w-2xl mb-8 sm:mb-10 font-sans transition-colors duration-300"
                style={{ color: "var(--theme-text-secondary, #4A5568)" }}
              >
                From natural multilingual code-switching to instant intent resolution, your agent answers conversationally, adapts on the fly, and gets things done — just like a human, but available 24/7.
              </p>
            </div>

            {/* ── 4 STRUCTURED FEATURE CARDS GRID ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {FEATURE_PILLARS.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.number}
                    className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_2px_10px_rgba(8,13,24,0.02)] hover:border-[#315CFF]/40 hover:shadow-[0_8px_24px_rgba(49,92,255,0.06)] transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar with Number & Icon */}
                      <div className="flex items-center justify-between mb-3.5">
                        <span className="font-mono text-xs font-bold text-[#315CFF] tracking-wider">
                          /{feature.number}
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-[#315CFF]/8 border border-[#315CFF]/15 flex items-center justify-center text-[#315CFF]">
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Feature Title */}
                      <h3
                        className="text-base font-bold tracking-tight leading-snug mb-2 font-sans"
                        style={{ color: "var(--theme-text-primary, #080D18)" }}
                      >
                        {feature.title}
                      </h3>

                      {/* Feature Description */}
                      <p
                        className="text-xs sm:text-[13px] leading-relaxed font-normal font-sans"
                        style={{ color: "var(--theme-text-secondary, #4A5568)" }}
                      >
                        {feature.description}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-[#F1F5F9]">
                      <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-[#718096]">
                        {feature.badge}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* ── RIGHT COLUMN: ILLUSTRATED CHARACTER AS SUPPORTING VISUAL ── */}
          <div className="w-full lg:w-[42%] xl:w-[40%] shrink-0 flex items-center justify-center">
            <div className="relative w-full max-w-[420px] sm:max-w-[460px] lg:max-w-[500px] aspect-[4/5] flex items-center justify-center">
              {/* Subtle Atmospheric Radiance behind character */}
              <div className="absolute inset-4 rounded-full bg-radial from-[#315CFF]/12 via-[#45C5FF]/6 to-transparent blur-2xl pointer-events-none" />

              <Image
                src="/images/vaakriti_voice_muse_transparent.png"
                alt="Vaakriti Voice Muse - Royal Blue Fine Line Ink Engraving Artwork"
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-contain object-center drop-shadow-[0_16px_36px_rgba(49,92,255,0.12)] transition-transform duration-500 hover:scale-[1.015]"
                priority
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export default WhyTrinetra;
