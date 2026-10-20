"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  AudioLines,
  Zap,
  Globe2,
  CalendarCheck,
} from "lucide-react";

interface FeaturePillar {
  tag: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FEATURE_PILLARS: FeaturePillar[] = [
  {
    tag: "Turn-Taking",
    title: "Natural Conversations",
    description: "Handles interruptions casually, listens patiently, and speaks with authentic human pacing.",
    icon: AudioLines,
  },
  {
    tag: "Instant Pickup",
    title: "Zero Queue Times",
    description: "Instant response for every caller whether handling 5 calls or thousands simultaneously.",
    icon: Zap,
  },
  {
    tag: "Multilingual",
    title: "Native Dialect Fluency",
    description: "Seamlessly switches between English, Hindi, and regional dialects mid-conversation.",
    icon: Globe2,
  },
  {
    tag: "Action-Driven",
    title: "Automated Execution",
    description: "Schedules calendar bookings, qualifies sales intent, and updates CRM records live.",
    icon: CalendarCheck,
  },
];

const ORBIT_STEPS = [
  { id: 0, label: "Listen", desc: "Acoustic streaming & speech detection" },
  { id: 1, label: "Understand", desc: "Intent, entity & context extraction" },
  { id: 2, label: "Respond", desc: "Natural conversational neural synthesis" },
  { id: 3, label: "Take Action", desc: "Live CRM, calendar & tool automation" },
];

export function WhyTrinetra() {
  const [activeStep, setActiveStep] = useState(0);

  // Smoothly cycle through the 4 steps of the ring animation
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % ORBIT_STEPS.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  return (
    <section
      id="why-trinetra"
      className="w-full py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-10 relative z-10 select-none overflow-hidden bg-white border-t border-b border-slate-200"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-8">
          
          {/* ── LEFT COLUMN: EDITORIAL CONTENT & 2x2 CARDS ── */}
          <div className="w-full lg:w-[52%] xl:w-[50%] flex flex-col justify-center">
            {/* Eyebrow Label */}
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#2563EB] font-sans block mb-2.5">
              HUMAN-CENTRIC VOICE AI
            </span>

            {/* Display Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight leading-[1.14] mb-3 text-[#0F172A] font-sans">
              AI voice agents that understand{" "}
              <span className="text-[#2563EB]">real people.</span>
            </h2>

            {/* Subtitle */}
            <p className="text-sm sm:text-base font-normal leading-relaxed text-[#475569] max-w-xl mb-7 font-sans">
              Human-quality voice AI designed for enterprise scale. Understands nuance, adapts to context, and resolves customer needs instantly.
            </p>

            {/* ── 2x2 FEATURE CARDS GRID ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              {FEATURE_PILLARS.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-[#2563EB]/40 hover:shadow-[0_8px_20px_rgba(37,99,235,0.06)] transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Icon on left, Tag pill beside/above */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-100">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50/80 text-[#2563EB] border border-blue-100">
                          {feature.tag}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-[#0F172A] tracking-tight leading-snug mb-1.5 font-sans">
                        {feature.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs sm:text-[13px] leading-relaxed text-[#64748B] font-sans">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT COLUMN: BIG TRANSPARENT LINE-ART CHARACTER + CURVED ACTION RING ── */}
          <div className="w-full lg:w-[48%] xl:w-[50%] flex items-center justify-center relative min-h-[460px] sm:min-h-[520px]">
            <div className="relative w-full flex items-center justify-between">
              
              {/* ── BACKGROUND ORBITAL CONSTELLATION RINGS ── */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center -z-10">
                <svg className="w-full h-full absolute inset-0 text-blue-200/40" viewBox="0 0 600 480" fill="none">
                  {/* Outer Orbit Arc */}
                  <circle
                    cx="260"
                    cy="240"
                    r="210"
                    stroke="#2563EB"
                    strokeWidth="1.2"
                    strokeDasharray="4 6"
                    strokeOpacity="0.25"
                    className="animate-[spin_60s_linear_infinite]"
                  />
                  {/* Inner Orbit Arc */}
                  <circle
                    cx="260"
                    cy="240"
                    r="150"
                    stroke="#2563EB"
                    strokeWidth="1"
                    strokeOpacity="0.2"
                  />
                  {/* Floating constellation nodes */}
                  <circle cx="80" cy="180" r="4" fill="#2563EB" opacity="0.6" />
                  <circle cx="120" cy="330" r="3.5" fill="#38BDF8" opacity="0.7" />
                  <circle cx="430" cy="110" r="4.5" fill="#2563EB" opacity="0.8" />
                  <circle cx="450" cy="340" r="4" fill="#38BDF8" opacity="0.8" />
                </svg>

                {/* Soft ambient radiance */}
                <div className="w-80 h-80 rounded-full bg-blue-500/8 blur-3xl" />
              </div>

              {/* ── CENTER: BIG LINE-ART CHARACTER (NO BACKGROUND, NO COLOR FILL) ── */}
              <div className="relative w-[380px] sm:w-[460px] lg:w-[520px] h-[460px] sm:h-[530px] lg:h-[580px] shrink-0 -ml-4 sm:-ml-2 z-10 flex items-center justify-center select-none">
                <Image
                  src="/images/vaakriti_muse_pose2_trans.png"
                  alt="Vaakriti Voice Muse"
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-contain object-bottom drop-shadow-[0_16px_36px_rgba(37,99,235,0.08)]"
                  priority
                />

                {/* Glowing subtle blue aura behind the floating orb */}
                <div className="absolute top-[46%] left-[18%] w-24 h-24 rounded-full bg-blue-400/20 blur-xl pointer-events-none animate-pulse" />
              </div>

              {/* ── RIGHT: CURVED ANIMATED "LISTEN • UNDERSTAND • RESPOND • TAKE ACTION" RING ── */}
              <div className="relative z-20 flex flex-col justify-between h-[280px] sm:h-[310px] my-auto pr-1 sm:pr-3 w-[150px] sm:w-[170px]">
                
                {/* SVG Elliptical Curved Track Arc */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none -z-10" viewBox="0 0 170 310" fill="none">
                  {/* Curving track line that bows outward to the right */}
                  <path
                    d="M 124 25 C 168 95, 168 215, 124 285"
                    stroke="#93C5FD"
                    strokeWidth="1.6"
                    strokeDasharray="3 4"
                    strokeOpacity="0.85"
                  />
                  {/* Traveling accent glow along the curve */}
                  <path
                    d="M 124 25 C 168 95, 168 215, 124 285"
                    stroke="#2563EB"
                    strokeWidth="2.2"
                    strokeDasharray="28 260"
                    strokeDashoffset={-activeStep * 75}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                {/* 4 Steps along the curved path (offset horizontally to match the curve arc) */}
                {ORBIT_STEPS.map((step) => {
                  const isActive = step.id === activeStep;
                  // Horizontal offset for the curve: middle steps bowed outward to the right
                  const curveOffsets = ["mr-5", "mr-0.5", "mr-0.5", "mr-5"];
                  const currentCurveOffset = curveOffsets[step.id] || "mr-3";

                  return (
                    <div
                      key={step.id}
                      onClick={() => setActiveStep(step.id)}
                      className={`group flex items-center justify-end gap-3 cursor-pointer py-1 transition-all duration-300 ${currentCurveOffset}`}
                    >
                      {/* Step Text Label */}
                      <div className="text-right">
                        <span
                          className={`text-xs sm:text-[13px] font-sans font-medium transition-all duration-300 block ${
                            isActive
                              ? "text-[#0F172A] font-bold scale-105"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>

                      {/* Animated Dot Node on the curved ring */}
                      <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                        {/* Glowing ripple ping when active */}
                        {isActive && (
                          <motion.span
                            layoutId="activePing"
                            className="absolute inset-0 rounded-full bg-[#2563EB]/30 animate-ping"
                          />
                        )}

                        {/* Node circle */}
                        <div
                          className={`rounded-full transition-all duration-300 ${
                            isActive
                              ? "w-3 h-3 bg-[#2563EB] shadow-[0_0_12px_#2563EB]"
                              : "w-2 h-2 bg-slate-300 group-hover:bg-blue-400"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export const WhyVaakriti = WhyTrinetra;
export default WhyTrinetra;
