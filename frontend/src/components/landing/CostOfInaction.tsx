import React from "react";
import { AlertCircle } from "lucide-react";

export function CostOfInaction() {
  return (
    <section className="w-full bg-[#080D18] border-y border-[#18243A] py-7 sm:py-8 lg:py-9 px-4 sm:px-6 lg:px-8 select-none font-sans relative overflow-hidden">
      {/* Subtle atmospheric blue glow */}
      <div className="pointer-events-none absolute left-1/4 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[#315CFF]/10 blur-[70px]" />

      <div className="w-full max-w-[1400px] mx-auto relative z-10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 lg:gap-8">
          
          {/* Left: Headline & Context */}
          <div className="w-full lg:w-[28%] shrink-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase mb-1.5 border bg-blue-950/60 border-blue-500/30 text-blue-300">
              <AlertCircle className="w-3 h-3 text-blue-400" />
              <span>THE COST OF INACTION</span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-[26px] font-black tracking-tight leading-[1.15] mb-1.5 text-white">
              <span className="block text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.15)]">Missed calls</span>
              <span className="block text-[#38BDF8] drop-shadow-[0_2px_16px_rgba(56,189,248,0.35)]">mean lost revenue.</span>
            </h2>

            <p className="text-xs leading-relaxed text-slate-300 max-w-xs">
              Unanswered phone interactions directly leak high-intent buyers, appointments, and customer trust.
            </p>
          </div>

          {/* Right: 4 Metrics with Equal Spacing & High-Contrast Cards */}
          <div className="w-full lg:w-[72%] grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-0 md:divide-x md:divide-slate-800">
            
            {/* Stat 1 */}
            <div className="flex flex-col md:px-4 lg:px-5 first:pl-0 bg-white/[0.02] md:bg-transparent p-2.5 md:p-0 rounded-xl border border-white/5 md:border-none">
              <span className="text-2xl sm:text-3xl lg:text-[32px] font-black font-mono tracking-tight mb-1 leading-none" style={{ color: "#FFFFFF" }}>
                70%
              </span>
              <p className="text-[11px] sm:text-xs font-sans font-medium leading-snug" style={{ color: "#E2E8F0" }}>
                of business calls go completely unanswered across Indian enterprise
              </p>
            </div>

            {/* Stat 2 */}
            <div className="flex flex-col md:px-4 lg:px-5 bg-white/[0.02] md:bg-transparent p-2.5 md:p-0 rounded-xl border border-white/5 md:border-none">
              <span className="text-2xl sm:text-3xl lg:text-[32px] font-black font-mono tracking-tight mb-1 leading-none" style={{ color: "#FFFFFF" }}>
                42%
              </span>
              <p className="text-[11px] sm:text-xs font-sans font-medium leading-snug" style={{ color: "#E2E8F0" }}>
                of high-intent service inquiries occur outside standard office hours
              </p>
            </div>

            {/* Stat 3 */}
            <div className="flex flex-col md:px-4 lg:px-5 bg-white/[0.02] md:bg-transparent p-2.5 md:p-0 rounded-xl border border-white/5 md:border-none">
              <span className="text-2xl sm:text-3xl lg:text-[32px] font-black font-mono tracking-tight mb-1 leading-none whitespace-nowrap" style={{ color: "#38BDF8" }}>
                ₹12,800
              </span>
              <p className="text-[11px] sm:text-xs font-sans font-medium leading-snug" style={{ color: "#E2E8F0" }}>
                average pipeline value lost per missed prospective buyer call
              </p>
            </div>

            {/* Stat 4 */}
            <div className="flex flex-col md:px-4 lg:px-5 last:pr-0 bg-white/[0.02] md:bg-transparent p-2.5 md:p-0 rounded-xl border border-white/5 md:border-none">
              <span className="text-2xl sm:text-3xl lg:text-[32px] font-black font-mono tracking-tight mb-1 leading-none whitespace-nowrap" style={{ color: "#FFFFFF" }}>
                ~$126,000
              </span>
              <p className="text-[11px] sm:text-xs font-sans font-medium leading-snug" style={{ color: "#E2E8F0" }}>
                annual revenue attrition per SME due to unmanaged call volume
              </p>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}

export default CostOfInaction;
