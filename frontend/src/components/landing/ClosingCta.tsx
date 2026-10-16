"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Phone, Sparkles, CheckCircle2 } from "lucide-react";
import { VaakritiWordmarkVector } from "@/components/ui/VaakritiWordmarkVector";
import { VaakritiSymbolVector } from "@/components/ui/VaakritiSymbolVector";

export function ClosingCta() {
  return (
    <section className="w-full bg-white py-20 sm:py-28 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="mx-auto max-w-[1400px]">
        
        <div className="relative rounded-[2.5rem] lg:rounded-[3.2rem] border border-slate-200/90 bg-gradient-to-b from-slate-50 via-white to-slate-50/70 p-8 sm:p-14 lg:p-20 overflow-hidden text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]">
          
          {/* Subtle Ambient Radial Glow */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40 blur-3xl z-0"
            style={{
              background:
                "radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.15) 0%, rgba(14, 165, 233, 0.08) 45%, transparent 75%)",
            }}
          />

          <div className="relative z-10 flex flex-col items-center max-w-3xl mx-auto">
            
            {/* Emblem Lockup */}
            <div className="mb-6 flex items-center justify-center">
              <VaakritiSymbolVector className="w-16 sm:w-20 h-auto text-slate-900" />
            </div>

            <span className="text-[11px] font-mono font-bold tracking-[0.28em] text-slate-500 uppercase mb-3">
              THE CREATION OF VOICE
            </span>

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.08] mb-6">
              Give your enterprise an autonomous Indian voice today.
            </h2>

            <p className="text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed mb-10 max-w-2xl">
              Zero ring delay, sub-480ms turn-taking, and 100% statutory compliance. Start testing in our live sound studio or configure your first agent in minutes.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto justify-center mb-10">
              <a
                href="#live-demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-slate-900 text-white font-semibold text-sm hover:bg-black transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                <span>Test Live Voice Studio</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full border border-slate-300 bg-white text-slate-800 font-semibold text-sm hover:bg-slate-50 transition-all shadow-2xs"
              >
                <span>Deploy Agent in Console</span>
              </Link>
            </div>

            {/* Trust Points */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                No Credit Card Required
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                TRAI DND &amp; DPDP Compliant
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Live Setup Under 24 Hours
              </span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
