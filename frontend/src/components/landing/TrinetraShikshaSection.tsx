"use client";

import React from "react";
import { motion } from "framer-motion";
import NextImage from "next/image";
import { Target, BarChart2, BookOpen, ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";

export function TrinetraShikshaSection() {
  return (
    <section className="w-full bg-[#080010] py-[80px] overflow-hidden relative">
      <div className="max-w-[1280px] mx-auto px-[20px] md:px-[80px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[60px] items-center">
          
          {/* Left Column: Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col"
          >
            {/* Badge */}
            <div className="mb-[24px] inline-flex items-center gap-[8px] rounded-full border border-[#FBBF24]/30 bg-[#FBBF24]/10 px-[14px] py-[6px]">
              <div className="h-[6px] w-[6px] rounded-full bg-[#FBBF24] animate-pulse" />
              <span className="font-sans text-[12px] font-semibold text-[#FBBF24] tracking-wide uppercase">
                Trinetra Shiksha — Live Platform
              </span>
            </div>

            {/* Heading */}
            <h2 className="mb-[20px] font-display text-[42px] md:text-[52px] font-bold leading-[1.1] tracking-tight text-[#FAF7FF]">
              Train Smarter. <span className="text-[#FBBF24]">Crack GATE.</span>
            </h2>

            {/* Description */}
            <p className="mb-[40px] max-w-[540px] font-sans text-[16px] leading-[1.7] text-[#B8B0D1]">
              AI-powered mock exams with real exam patterns, smart performance analytics, topic-wise insights, and continuous progress tracking — built to help engineering students score higher on every attempt.
            </p>

            {/* Features Checklist */}
            <div className="mb-[48px] flex flex-col gap-[24px]">
              <div className="flex items-start gap-[16px]">
                <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-xl bg-[rgba(251,191,36,0.1)] text-[#FBBF24]">
                  <Target size={20} />
                </div>
                <div>
                  <h4 className="mb-[4px] font-sans text-[15px] font-semibold text-[#FAF7FF]">Real Exam Experience</h4>
                  <p className="font-sans text-[14px] leading-relaxed text-[#8E86A8]">Full-length mock tests with actual GATE patterns and timer-based conditions.</p>
                </div>
              </div>

              <div className="flex items-start gap-[16px]">
                <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-xl bg-[rgba(139,92,246,0.1)] text-[#8B5CF6]">
                  <BarChart2 size={20} />
                </div>
                <div>
                  <h4 className="mb-[4px] font-sans text-[15px] font-semibold text-[#FAF7FF]">Smart Analytics</h4>
                  <p className="font-sans text-[14px] leading-relaxed text-[#8E86A8]">Deep performance insights to identify weak areas and track improvement over time.</p>
                </div>
              </div>

              <div className="flex items-start gap-[16px]">
                <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-xl bg-[rgba(255,90,95,0.1)] text-[#FF5A5F]">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h4 className="mb-[4px] font-sans text-[15px] font-semibold text-[#FAF7FF]">Topic-Wise Mastery</h4>
                  <p className="font-sans text-[14px] leading-relaxed text-[#8E86A8]">Drill down subject-by-subject to build targeted strength before exam day.</p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div>
              <a
                href="https://shiksha.trinetraedu-ai.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-[8px] rounded-xl bg-[#FBBF24] px-[28px] py-[14px] font-sans text-[15px] font-bold text-[#080010] shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-all hover:-translate-y-[2px] hover:bg-[#FCD34D] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)]"
              >
                Start Free Test
                <ExternalLink size={18} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </a>
            </div>
          </motion.div>

          {/* Right Column: Visual Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex justify-center lg:justify-end"
          >
            {/* Glow Background */}
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl blur-[60px]"
              style={{
                background: "radial-gradient(ellipse at center, rgba(139,92,246,0.15) 0%, rgba(251,191,36,0.1) 50%, transparent 70%)",
              }}
            />

            {/* Image Container */}
            <div className="relative w-full max-w-[320px]">
              <div className="relative overflow-hidden">
                {/* The Image - Using standard img to preserve perfect intrinsic aspect ratio */}
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
