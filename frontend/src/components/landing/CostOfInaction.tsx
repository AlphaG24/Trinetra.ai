import React from "react";
import { AlertCircle } from "lucide-react";

export function CostOfInaction() {
  return (
    <section className="w-full bg-[#080D18] border-y border-[#18243A] py-16 sm:py-20 px-4 sm:px-6 lg:px-10 select-none font-sans relative overflow-hidden">
      {/* Subtle atmospheric blue glow */}
      <div className="pointer-events-none absolute left-1/4 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#315CFF]/10 blur-[100px]" />

      <div className="w-full max-w-[1440px] mx-auto relative z-10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 lg:gap-14">
          
          {/* Left: Punchy Headline & Context */}
          <div className="w-full lg:w-[30%] xl:w-[28%] shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase mb-3 border bg-[#18243A] border-[#1E2D4A] text-[#45C5FF]">
              <AlertCircle className="w-3.5 h-3.5 text-[#45C5FF]" />
              <span>THE COST OF INACTION</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight text-white leading-[1.12] font-[family-name:var(--font-cal-sans)] mb-3">
              Missed calls <br />
              mean lost revenue.
            </h2>

            <p className="text-sm font-normal text-slate-400 leading-relaxed font-sans max-w-sm">
              Unanswered phone interactions directly leak high-intent buyers, appointments, and customer trust.
            </p>
          </div>

          {/* Right: 4 Metrics with Equal Spacing & Clean Dividers */}
          <div className="w-full lg:w-[70%] xl:w-[72%] grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x md:divide-[#18243A]">
            
            {/* Stat 1 */}
            <div className="flex flex-col md:px-6 lg:px-8 first:pl-0">
              <span className="text-4xl sm:text-5xl xl:text-[48px] font-bold text-white font-mono tracking-tight mb-2 leading-none">
                70%
              </span>
              <p className="text-xs sm:text-[13px] text-slate-300 font-sans font-normal leading-relaxed">
                of business calls go completely unanswered across Indian enterprise
              </p>
            </div>

            {/* Stat 2 */}
            <div className="flex flex-col md:px-6 lg:px-8">
              <span className="text-4xl sm:text-5xl xl:text-[48px] font-bold text-white font-mono tracking-tight mb-2 leading-none">
                42%
              </span>
              <p className="text-xs sm:text-[13px] text-slate-300 font-sans font-normal leading-relaxed">
                of high-intent service inquiries occur outside standard office hours
              </p>
            </div>

            {/* Stat 3 */}
            <div className="flex flex-col md:px-6 lg:px-8">
              <span className="text-4xl sm:text-5xl xl:text-[48px] font-bold text-[#45C5FF] font-mono tracking-tight mb-2 leading-none whitespace-nowrap">
                ₹12,800
              </span>
              <p className="text-xs sm:text-[13px] text-slate-300 font-sans font-normal leading-relaxed">
                average pipeline value lost per missed prospective buyer call
              </p>
            </div>

            {/* Stat 4 */}
            <div className="flex flex-col md:px-6 lg:px-8 last:pr-0">
              <span className="text-4xl sm:text-5xl xl:text-[48px] font-bold text-white font-mono tracking-tight mb-2 leading-none whitespace-nowrap">
                ~$126,000
              </span>
              <p className="text-xs sm:text-[13px] text-slate-300 font-sans font-normal leading-relaxed">
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
