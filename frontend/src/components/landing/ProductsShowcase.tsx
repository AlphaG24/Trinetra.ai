"use client";

import React from "react";
import { motion } from "framer-motion";
import { PhoneCall, Workflow, GraduationCap, ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";

export function ProductsShowcase() {
  return (
    <section id="platform" className="w-full bg-white py-20 px-6 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-[1536px]">
        
        {/* Section Top Bar (Matching Reference Image "■ SELECTED WORK" / "EXPLORE MORE PROJECTS →") */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 mb-10 border-b border-slate-200/90 gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-[1px] bg-[#84CC16]" />
            <h2 className="text-[13px] font-mono tracking-[0.2em] uppercase font-bold text-[#0B0F17]">
              SELECTED WORK &amp; PLATFORMS
            </h2>
          </div>
          <Link
            href="/#solutions"
            className="group flex items-center gap-1.5 text-[11px] font-mono tracking-[0.2em] uppercase text-slate-600 hover:text-[#84CC16] font-semibold transition-colors"
          >
            <span>EXPLORE MORE PROJECTS</span>
            <span className="text-[#84CC16] group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        {/* 3-Card Showcase Grid (With Signature Center Dark Card from Reference Image) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          
          {/* CARD 01: Luminous White Card (FINTRACK DASHBOARD style) */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="group relative flex flex-col justify-between rounded-3xl bg-white border border-slate-200/90 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-lime-400 hover:shadow-[0_12px_36px_rgba(132,204,22,0.12)] transition-all duration-300"
          >
            {/* Mockup Preview Area */}
            <div className="relative w-full h-[220px] rounded-2xl bg-slate-50 border border-slate-200/80 p-5 flex flex-col justify-between overflow-hidden mb-6 group-hover:border-lime-400/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  INBOUND AI RECEPTIONIST
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#84CC16] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#84CC16] animate-pulse" /> LIVE
                </span>
              </div>

              {/* Realistic Call Interface */}
              <div className="rounded-xl bg-white p-4 border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#0B0F17]">Dr. Sharma Clinic</span>
                  <span className="text-[10px] font-mono text-[#84CC16]">01:42</span>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                  &ldquo;Aapka appointment kal sham 5 baje confirm kar diya gaya hai.&rdquo;
                </p>
              </div>

              {/* Waveform footer */}
              <div className="flex items-center gap-1">
                {[14, 22, 10, 26, 18, 12, 30, 16, 20].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-[#84CC16]/70"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
            </div>

            {/* Info Footer */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#84CC16]">01</span>
                  <h3 className="text-sm font-bold text-[#0B0F17] tracking-tight uppercase font-mono">
                    VOICE RECEPTION OS
                  </h3>
                </div>
                <span className="text-slate-400 group-hover:text-[#84CC16] group-hover:translate-x-1 transition-all text-sm">
                  →
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans">
                Autonomous inbound telephony and appointment booking platform.
              </p>
            </div>
          </motion.div>

          {/* CARD 02: HIGH-CONTRAST DEEP BLACK CARD (Matches center LAUNCHPAD WEBSITE card with Glowing Lime Orb) */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="group relative flex flex-col justify-between rounded-3xl bg-[#0C0E14] border border-slate-800 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.35)] hover:border-lime-400/80 hover:shadow-[0_0_45px_rgba(132,204,22,0.25)] transition-all duration-300"
          >
            {/* Mockup Preview Area with Glowing Electric Lime Sphere */}
            <div className="relative w-full h-[220px] rounded-2xl bg-[#07090E] border border-slate-800 p-6 flex flex-col justify-between overflow-hidden mb-6">
              
              {/* Top headline text on dark card */}
              <div className="relative z-10">
                <p className="text-sm font-mono text-slate-400">
                  Where voice becomes
                </p>
                <p className="text-lg font-black text-white tracking-tight">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#84CC16] to-[#A3E635]">
                    reality.
                  </span>
                </p>
              </div>

              {/* Glowing Electric Lime Sphere (Exact reference image element) */}
              <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-gradient-to-tr from-[#65A30D] via-[#84CC16] to-[#A3E635] shadow-[0_0_60px_rgba(132,204,22,0.65)] flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-[#0C0E14]/30 backdrop-blur-xs border border-white/20" />
              </div>

              {/* Micro badge */}
              <div className="relative z-10 flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-[#84CC16]" />
                <span>Trinetra Engine v2.4</span>
              </div>
            </div>

            {/* Info Footer on Dark Card */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#84CC16]">02</span>
                  <h3 className="text-sm font-bold text-white tracking-tight uppercase font-mono">
                    AUTONOMOUS VOICE AGENTS
                  </h3>
                </div>
                <span className="text-[#84CC16] group-hover:translate-x-1 transition-transform text-sm">
                  →
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Self-healing outbound &amp; inbound AI sales and support pipelines.
              </p>
            </div>
          </motion.div>

          {/* CARD 03: Luminous White Card (ELEVATE APP style) */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="group relative flex flex-col justify-between rounded-3xl bg-white border border-slate-200/90 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-lime-400 hover:shadow-[0_12px_36px_rgba(132,204,22,0.12)] transition-all duration-300"
          >
            {/* Mockup Preview Area */}
            <div className="relative w-full h-[220px] rounded-2xl bg-slate-50 border border-slate-200/80 p-5 flex flex-col justify-between overflow-hidden mb-6 group-hover:border-lime-400/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  TRINETRA SHIKSHA
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  EDUCATION OS
                </span>
              </div>

              {/* Education App UI Snapshot */}
              <div className="rounded-xl bg-white p-4 border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#0B0F17]">CBSE Class X Math</span>
                  <span className="text-[10px] font-mono font-bold text-[#84CC16]">98% Mastery</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#84CC16] h-full rounded-full w-[82%]" />
                </div>
              </div>

              {/* Tag pills */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-600">
                  Voice Tutor
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#84CC16]/10 text-[#65A30D]">
                  Adaptive
                </span>
              </div>
            </div>

            {/* Info Footer */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#84CC16]">03</span>
                  <h3 className="text-sm font-bold text-[#0B0F17] tracking-tight uppercase font-mono">
                    AI PEDAGOGY PLATFORM
                  </h3>
                </div>
                <span className="text-slate-400 group-hover:text-[#84CC16] group-hover:translate-x-1 transition-all text-sm">
                  →
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans">
                Personalized bilingual voice tutoring aligned with national curricula.
              </p>
            </div>
          </motion.div>

        </div>

        {/* 4-COLUMN STATS / IMPACT ROW (Matching Reference Image "28+ PROJECTS DELIVERED / 14+ HAPPY CLIENTS / 99% SUCCESS RATE / 5+ YEARS OF EXPERIENCE") */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-10 border-t border-slate-200/90 text-center">
          
          <div className="flex flex-col items-center">
            <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0B0F17] tracking-tight font-mono">
              28<span className="text-[#84CC16]">+</span>
            </span>
            <span className="mt-2 text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500 font-semibold">
              VOICE WORKFLOWS
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0B0F17] tracking-tight font-mono">
              99.8<span className="text-[#84CC16]">%</span>
            </span>
            <span className="mt-2 text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500 font-semibold">
              UPTIME SLA
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0B0F17] tracking-tight font-mono">
              &lt;700<span className="text-[#84CC16]">ms</span>
            </span>
            <span className="mt-2 text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500 font-semibold">
              VOICE LATENCY
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0B0F17] tracking-tight font-mono">
              60<span className="text-[#84CC16]">+</span>
            </span>
            <span className="mt-2 text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500 font-semibold">
              LANGUAGES &amp; DIALECTS
            </span>
          </div>

        </div>

      </div>
    </section>
  );
}
