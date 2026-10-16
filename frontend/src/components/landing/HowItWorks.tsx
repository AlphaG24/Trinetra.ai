"use client";

import React from "react";
import { motion } from "framer-motion";

interface StepItem {
  step: number;
  title: string;
  description: string;
  borderColor: string;
  textColor: string;
  glowStyle: string;
  ringStyle: string;
}

const STEPS: StepItem[] = [
  {
    step: 1,
    title: "Tell Us About Your Business",
    description:
      "Answer 5 quick questions about your business, services, and typical customer queries.",
    borderColor: "border-violet-500",
    textColor: "text-violet-600",
    glowStyle: "shadow-[0_0_20px_rgba(139,92,246,0.36)]",
    ringStyle: "ring-2 ring-violet-500/18",
  },
  {
    step: 2,
    title: "Configure Your AI Agent",
    description:
      "Customize instructions, voice tone, and knowledge base yourself in minutes via the self-serve dashboard — or request our team's hands-on help whenever needed.",
    borderColor: "border-amber-500",
    textColor: "text-amber-600",
    glowStyle: "shadow-[0_0_20px_rgba(245,158,11,0.36)]",
    ringStyle: "ring-2 ring-amber-500/18",
  },
  {
    step: 3,
    title: "Go Live & Start Saving",
    description:
      "Your AI agent goes live. Monitor performance, see ROI, and scale as you grow.",
    borderColor: "border-cyan-500",
    textColor: "text-cyan-600",
    glowStyle: "shadow-[0_0_20px_rgba(6,182,212,0.36)]",
    ringStyle: "ring-2 ring-cyan-500/18",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full bg-transparent py-14 sm:py-20 px-4 sm:px-6 lg:px-8 relative z-10 select-none">
      <div className="mx-auto max-w-[1180px]">

        {/* ── Direct Clean Section Headline ── */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-14 sm:mb-20">
          <h2
            className="text-3xl sm:text-4xl md:text-[46px] font-extrabold tracking-tight text-[#0B0F17] mb-3"
            style={{ fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif' }}
          >
            From Zero to AI-Powered in{" "}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 bg-clip-text text-transparent">
              24 Hours.
            </span>
          </h2>

          <p className="text-slate-600 text-sm sm:text-base font-normal max-w-lg mx-auto leading-relaxed">
            No complex setup. No coding required. Just three simple steps.
          </p>
        </div>

        {/* ── 3-Step Interactive Timeline ── */}
        <div className="relative" suppressHydrationWarning>

          {/* ── DESKTOP CONNECTOR TRACK & REFINED FLOWING GLOW ── */}
          {/* Spans strictly between center of Node 1 (16.666%) and center of Node 3 (83.333%) */}
          <div
            className="hidden md:block absolute top-[26px] left-[16.666%] right-[16.666%] h-[2px] z-0 pointer-events-none -translate-y-1/2 overflow-hidden rounded-full"
            suppressHydrationWarning
          >
            {/* 1. Base Gradient Track Line connecting all 3 nodes */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6] via-[#F59E0B] to-[#06B6D4] opacity-75"
              suppressHydrationWarning
            />

            {/* 2. Sleek, Refined Flowing Glow Pulse (Strictly contained, never overshoots 3rd node) */}
            <motion.div
              className="absolute top-0 bottom-0 w-16 sm:w-20 rounded-full pointer-events-none bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_8px_1px_#FFFFFF,0_0_12px_2px_rgba(139,92,246,0.7),0_0_16px_2px_rgba(6,182,212,0.7)]"
              animate={{
                left: ["-10%", "100%"],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
                repeatDelay: 0.2,
              }}
            />
          </div>

          {/* ── MOBILE VERTICAL CONNECTOR LINE ── */}
          <div
            className="md:hidden absolute top-[26px] bottom-[68px] left-[26px] w-[2px] z-0 pointer-events-none -translate-x-1/2 overflow-hidden rounded-full"
            suppressHydrationWarning
          >
            {/* Base Vertical Track */}
            <div
              className="absolute inset-0 bg-gradient-to-b from-[#8B5CF6] via-[#F59E0B] to-[#06B6D4] opacity-75"
              suppressHydrationWarning
            />
            {/* Flowing Downward Beam */}
            <motion.div
              className="absolute left-0 right-0 h-14 rounded-full pointer-events-none bg-gradient-to-b from-transparent via-white to-transparent shadow-[0_0_8px_1px_#FFFFFF,0_0_12px_2px_rgba(139,92,246,0.7),0_0_16px_2px_rgba(6,182,212,0.7)]"
              animate={{
                top: ["-10%", "100%"],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
                repeatDelay: 0.2,
              }}
            />
          </div>

          {/* ── 3 NODES: ELEGANT 52px CIRCLES & PURE TEXT (NO CARDS) ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 sm:gap-12 md:gap-6 lg:gap-10 relative z-10">
            {STEPS.map((item) => (
              <div
                key={item.step}
                className="flex flex-row md:flex-col items-start md:items-center text-left md:text-center group gap-4 sm:gap-5 md:gap-0"
              >
                {/* 52px Number Circle with Balanced Glow */}
                <div className="shrink-0 relative md:mb-5">
                  <div
                    className={`w-[50px] h-[50px] sm:w-[52px] sm:h-[52px] rounded-full bg-white border-2 ${item.borderColor} ${item.glowStyle} ${item.ringStyle} flex items-center justify-center text-lg font-bold ${item.textColor} transition-all duration-300 group-hover:scale-110`}
                  >
                    {item.step}
                  </div>
                </div>

                {/* Minimal Clean Typography */}
                <div className="pt-0.5 md:pt-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}

export default HowItWorks;
