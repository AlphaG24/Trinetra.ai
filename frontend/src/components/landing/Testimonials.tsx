"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

const FEEDBACK_LIST = [
  {
    id: 1,
    quote:
      "Professional, creative, and incredibly detail-oriented. The AI voice agents not only look and sound amazing, but also handle our daily call volume with flawless reliability and sub-second latency.",
    author: "JAMES PARKER",
    role: "FOUNDER, LAUNCHPAD",
    initials: "JP",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: 2,
    quote:
      "Arika handled over 4,500 patient appointments across Mumbai clinics in Hinglish without a single breakdown. The voice quality and compliance controls are unmatched in the Indian market.",
    author: "DR. ANANYA SEN",
    role: "CHIEF OF OPERATIONS, CAREPULSE HEALTH",
    initials: "AS",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: 3,
    quote:
      "Trinetra's self-healing voice pipeline eliminated our manual lead follow-up backlog within 48 hours. Our conversion speed jumped by 3.4x with automated WhatsApp summaries.",
    author: "RAJESH VERMA",
    role: "DIRECTOR OF GROWTH, NEXUS ENTERPRISES",
    initials: "RV",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  },
];

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="w-full bg-white py-20 px-6 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-[1536px]">
        
        {/* Section Top Bar (Matching Reference Image "■ WHAT CLIENTS SAY" / "REAL FEEDBACK →") */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 mb-10 border-b border-slate-200/90 gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-[1px] bg-[#84CC16]" />
            <h2 className="text-[13px] font-mono tracking-[0.2em] uppercase font-bold text-[#0B0F17]">
              WHAT CLIENTS SAY
            </h2>
          </div>
          <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-slate-500 font-semibold">
            REAL FEEDBACK →
          </span>
        </div>

        {/* Luminous White Testimonial Card */}
        <div className="max-w-4xl mx-auto">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-lime-400/80 transition-all duration-300 relative"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 justify-between">
              
              {/* Quote Body with Electric Lime Quote Mark */}
              <div className="flex-1">
                <div className="flex items-start gap-4">
                  <span className="text-4xl text-[#84CC16] font-serif leading-none select-none shrink-0 font-bold">
                    “
                  </span>
                  <p className="text-[15px] sm:text-[17px] text-slate-700 font-sans leading-relaxed">
                    {FEEDBACK_LIST[activeIndex].quote}
                  </p>
                </div>
              </div>

              {/* Author Meta on Right (Matching Reference Image) */}
              <div className="flex items-center gap-4 shrink-0 sm:pl-8 sm:border-l border-slate-200/80">
                <div className="relative w-12 h-12 rounded-full border border-lime-400/50 bg-[#0C0E14] text-[#84CC16] font-mono font-bold text-sm flex items-center justify-center shadow-[0_0_12px_rgba(132,204,22,0.25)] shrink-0">
                  {FEEDBACK_LIST[activeIndex].initials}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#0B0F17] uppercase tracking-wider font-mono">
                    {FEEDBACK_LIST[activeIndex].author}
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-mono tracking-wider uppercase mt-0.5">
                    {FEEDBACK_LIST[activeIndex].role}
                  </p>
                </div>
              </div>

            </div>
          </motion.div>

          {/* Minimalist Carousel Dots (Active Dot in Electric Lime #84CC16) */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {FEEDBACK_LIST.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === activeIndex
                    ? "w-6 h-2 bg-[#84CC16] shadow-[0_0_10px_#84CC16]"
                    : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
