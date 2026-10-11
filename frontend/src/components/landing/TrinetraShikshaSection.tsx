"use client";

import React from "react";
import { motion } from "framer-motion";
import { Target, BarChart2, BookOpen, ExternalLink } from "lucide-react";

export function TrinetraShikshaSection() {
  return (
    <section className="w-full bg-white py-20 overflow-hidden relative px-6 sm:px-10 lg:px-16">
      <div className="max-w-[1536px] mx-auto">
        
        {/* Section Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 mb-12 border-b border-slate-200/90 gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-[1px] bg-[#84CC16]" />
            <h2 className="text-[13px] font-mono tracking-[0.2em] uppercase font-bold text-[#0B0F17]">
              TRINETRA SHIKSHA
            </h2>
          </div>
          <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-slate-500 font-semibold">
            AI-POWERED PEDAGOGY PLATFORM →
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Content (7 cols) */}
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7 flex flex-col"
          >
            {/* Live Platform Badge */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-lime-500/30 bg-lime-500/10 px-3.5 py-1 w-max">
              <span className="h-2 w-2 rounded-full bg-[#84CC16] animate-pulse" />
              <span className="font-mono text-[11px] font-bold text-lime-800 tracking-wide uppercase">
                Specialized Vertical Platform
              </span>
            </div>

            {/* Heading */}
            <h3 className="mb-4 text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight text-[#0B0F17]">
              Train Smarter.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#65A30D] via-[#84CC16] to-[#A3E635]">
                Crack GATE.
              </span>
            </h3>

            {/* Description */}
            <p className="mb-8 max-w-xl font-sans text-sm sm:text-base leading-relaxed text-slate-600">
              AI-powered mock exams with real exam patterns, instant voice feedback, deep performance analytics, and topic-wise insights — built to help engineering aspirants maximize percentile scores.
            </p>

            {/* Features Checklist */}
            <div className="mb-10 flex flex-col gap-4">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-[#84CC16]">
                  <Target size={18} />
                </div>
                <div>
                  <h4 className="font-mono text-xs sm:text-sm font-bold uppercase text-[#0B0F17]">
                    01 • Real Exam Simulation
                  </h4>
                  <p className="font-sans text-xs text-slate-500 mt-0.5">
                    Full-length adaptive mock tests with genuine GATE interfaces and calibrated timing.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-[#84CC16]">
                  <BarChart2 size={18} />
                </div>
                <div>
                  <h4 className="font-mono text-xs sm:text-sm font-bold uppercase text-[#0B0F17]">
                    02 • Deep Performance Analytics
                  </h4>
                  <p className="font-sans text-xs text-slate-500 mt-0.5">
                    Granular topic-by-topic breakdowns that spotlight knowledge gaps with high precision.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-[#84CC16]">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h4 className="font-mono text-xs sm:text-sm font-bold uppercase text-[#0B0F17]">
                    03 • Autonomous Voice Tutor
                  </h4>
                  <p className="font-sans text-xs text-slate-500 mt-0.5">
                    Ask doubts verbally and receive step-by-step mathematical reasoning in English or Hinglish.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div>
              <a
                href="https://shiksha.trinetraedu-ai.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-full bg-[#0B0F17] px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-black hover:shadow-[0_0_25px_rgba(132,204,22,0.4)] transition-all"
              >
                <span>Start Free Mock Test</span>
                <ExternalLink size={14} className="text-[#84CC16]" />
              </a>
            </div>
          </motion.div>

          {/* Right Column: Visual Mockup (5 cols) */}
          <motion.div
            initial={{ opacity: 0, x: 25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="lg:col-span-5 flex justify-center lg:justify-end relative"
          >
            {/* Ambient Lime Glow behind image */}
            <div
              className="pointer-events-none absolute inset-0 rounded-full blur-[70px] opacity-25"
              style={{
                background: "radial-gradient(circle, rgba(132, 204, 22, 0.5) 0%, transparent 70%)",
              }}
            />

            {/* Mockup Container */}
            <div className="relative w-full max-w-[380px] rounded-3xl bg-white border border-slate-200/90 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:border-lime-400 transition-colors">
              <div className="relative overflow-hidden rounded-2xl bg-slate-100">
                <img
                  src="/Trinetra-shiksha.jpeg"
                  alt="Trinetra Shiksha Exam Platform"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
