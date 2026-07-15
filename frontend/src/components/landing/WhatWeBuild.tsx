"use client";

import { motion } from "framer-motion";
import { Bot, GraduationCap, Users, ExternalLink } from "lucide-react";
import Link from "next/link";

const cards = [
  {
    id: "ai",
    accent: "violet",
    icon: <Bot size={24} className="text-[#8B5CF6]" />,
    iconBg: "bg-[rgba(139,92,246,0.1)]",
    gradient: "from-[#8B5CF6] to-[#D7C4F7]",
    hoverBorder: "hover:border-[rgba(139,92,246,0.3)]",
    hoverShadow: "hover:shadow-[0_0_40px_rgba(139,92,246,0.08)]",
    title: "AI Automations",
    description: "Intelligent agents that handle calls, chats, and social media for your business. 24/7. In multiple languages.",
    linkText: "Explore AI Agents →",
    linkRef: "/login",
    linkStyle: "text-[#D7C4F7] hover:text-[#FAF7FF] transition-colors",
    clickable: true
  },
  {
    id: "edu",
    accent: "gold",
    icon: <GraduationCap size={24} className="text-[#F59E0B]" />,
    iconBg: "bg-[rgba(245,158,11,0.1)]",
    gradient: "from-[#F59E0B] to-[#FBBF24]",
    hoverBorder: "hover:border-[rgba(245,158,11,0.3)]",
    hoverShadow: "hover:shadow-[0_0_40px_rgba(245,158,11,0.08)]",
    title: "Smart Education",
    description: "Adaptive exam platforms that understand each student's cognitive profile and personalize every question.",
    linkText: "Explore Trinetra Shiksha →",
    linkRef: "https://shiksha.trinetraedu-ai.com",
    linkStyle: "text-[#FDE68A] hover:text-[#FAF7FF] transition-colors",
    clickable: true
  },
  {
    id: "human",
    accent: "cyan",
    icon: <Users size={24} className="text-[#06B6D4]" />,
    iconBg: "bg-[rgba(6,182,212,0.1)]",
    gradient: "from-[#06B6D4] to-[#22D3EE]",
    hoverBorder: "hover:border-[rgba(6,182,212,0.3)]",
    hoverShadow: "hover:shadow-[0_0_40px_rgba(6,182,212,0.08)]",
    title: "Human Connection",
    description: "Platforms connecting retired professionals with those who need their wisdom. Experience never retires.",
    blurDescription: true,
    linkText: "Coming Soon",
    linkRef: "#",
    linkStyle: "text-[#6B6088] cursor-default",
    clickable: false
  }
];

export function WhatWeBuild() {
  return (
    <section className="w-full bg-[#080010] py-[100px] overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-[20px] md:px-[80px]">
        
        {/* HEADER */}
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-block bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.15)] text-[#D7C4F7] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[20px]"
          >
            What We Build
          </motion.div>

          {/* Heading */}
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-bold text-[30px] md:text-[42px] text-[#FAF7FF] tracking-[-0.02em] mb-[16px]"
          >
            One Vision. <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #D7C4F7 0%, #FBBF24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Three</span> Dimensions.
          </motion.h2>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-sans font-normal text-[16px] md:text-[18px] text-[#B8B0D1] max-w-[550px] mx-auto leading-[1.6] mb-[64px]"
          >
            Trinetra sees what others miss — across businesses, education, and communities.
          </motion.p>
        </div>

        {/* CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px]">
          {cards.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15 * idx }}
              className={`group relative bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[36px] transition-all duration-300 hover:-translate-y-[4px] ${card.hoverBorder} ${card.hoverShadow}`}
            >
              {/* Top Accent Line */}
              <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-[16px] bg-gradient-to-r ${card.gradient}`} />

              {/* Icon Container */}
              <div className={`w-[48px] h-[48px] rounded-[12px] flex items-center justify-center mb-[24px] ${card.iconBg}`}>
                {card.icon}
              </div>

              {/* Title */}
              <h3 className="font-display font-semibold text-[22px] text-[#FAF7FF] mb-[12px]">
                {card.title}
              </h3>

              {/* Description */}
              <p
                className={`font-sans font-normal text-[15px] text-[#B8B0D1] leading-[1.7] mb-[24px] ${
                  card.blurDescription ? "blur-[4px] select-none" : ""
                }`}
              >
                {card.description}
              </p>

              {/* Link */}
              {card.clickable ? (
                card.linkRef.startsWith("http") ? (
                  <a
                    href={card.linkRef}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`font-sans font-medium text-[14px] ${card.linkStyle}`}
                  >
                    {card.linkText}
                  </a>
                ) : (
                  <Link href={card.linkRef} className={`font-sans font-medium text-[14px] ${card.linkStyle}`}>
                    {card.linkText}
                  </Link>
                )
              ) : (
                <span className={`font-sans font-medium text-[14px] ${card.linkStyle}`}>
                  {card.linkText}
                </span>
              )}
            </motion.div>
          ))}
        </div>

        {/* TRINETRA SHIKSHA PLATFORM SHOWCASE SECTION */}
        <div className="mt-[120px] relative">
          {/* Decorative Gold Radial Glow */}
          <div 
            className="absolute -right-[100px] top-[50%] -translate-y-1/2 w-[350px] h-[350px] z-0 pointer-events-none rounded-full blur-[100px]"
            style={{
              background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)'
            }}
          />

          <div className="flex flex-col lg:flex-row items-center gap-[60px] relative z-10">
            {/* Left Column: Text & Features */}
            <div className="w-full lg:w-1/2 flex flex-col items-start text-left">
              <div className="mb-[16px] inline-block rounded-full border border-[rgba(245,158,11,0.15)] bg-[rgba(245,158,11,0.1)] px-[12px] py-[4px] font-sans text-[12px] font-medium text-[#FDE68A]">
                Trinetra Shiksha Platform
              </div>
              
              <h3 className="font-display font-bold text-[32px] md:text-[38px] text-[#FAF7FF] leading-tight mb-[20px] tracking-tight">
                AI-Driven Assessments that Adapt to{" "}
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Every Mind
                </span>
              </h3>

              <p className="font-sans text-[15px] leading-[1.7] text-[#B8B0D1] mb-[32px]">
                Trinetra Shiksha reimagines examination engines. Instead of static questions, our proprietary engine creates dynamic, real-time assessment tracks tailored to a student's conceptual mastery and cognitive load.
              </p>

              <div className="space-y-[20px] w-full mb-[40px]">
                {[
                  {
                    title: "Adaptive Question Routing",
                    desc: "Instantly adjust question difficulty and complexity based on prior responses and cognitive latencies."
                  },
                  {
                    title: "Granular Cognitive Analytics",
                    desc: "Generate detailed profile maps tracking memory retention curves, analytical speed, and conceptual depth."
                  },
                  {
                    title: "Automated Educator Dashboards",
                    desc: "Empower teachers with auto-generated classroom insight sheets and individualized student support plans."
                  }
                ].map((item, index) => (
                  <div key={index} className="flex gap-[16px] items-start">
                    <div className="w-[36px] h-[36px] rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.15)] flex items-center justify-center text-[#F59E0B] flex-shrink-0 mt-[2px]">
                      <span className="font-sans font-bold text-[14px]">0{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="text-[#FAF7FF] font-semibold text-[16px] mb-[4px]">{item.title}</h4>
                      <p className="text-[#9A91B5] text-[13px] leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="https://shiksha.trinetraedu-ai.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-[10px] bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-[#0C0118] font-semibold text-[15px] px-[28px] py-[12px] rounded-[10px] transition-all duration-300 hover:shadow-[0_0_25px_rgba(245,158,11,0.35)] hover:scale-[1.02]"
              >
                Launch Trinetra Shiksha
                <ExternalLink size={16} />
              </a>
            </div>

            {/* Right Column: Premium Royal Style Live Assessment Preview */}
            <div className="w-full lg:w-1/2 flex justify-center">
              <div className="w-full max-w-[480px] bg-[#130224]/80 border border-[#1E0A35] rounded-[24px] p-[28px] md:p-[32px] relative overflow-hidden shadow-[0_20px_50px_rgba(245,158,11,0.03)] transition-all duration-500">
                {/* Thin Gold accent line on top */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent" />
                
                {/* Glassmorphic card header */}
                <div className="flex items-center justify-between border-b border-[#1E0A35] pb-[16px] mb-[24px]">
                  <div className="flex items-center gap-[10px]">
                    <div className="w-[10px] h-[10px] rounded-full bg-[#F59E0B] animate-pulse" />
                    <span className="font-mono text-[12px] text-[#FAF7FF] uppercase tracking-wider">Trinetra Shiksha Console</span>
                  </div>
                  <div className="px-[10px] py-[4px] rounded-md bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.1)] font-mono text-[11px] text-[#F59E0B]">
                    Difficulty: Level 4
                  </div>
                </div>

                {/* Question block */}
                <div className="space-y-[16px]">
                  <div className="flex justify-between items-center text-[12px] text-[#9A91B5] font-mono">
                    <span>SECTION: ADVANCED ALGORITHMS</span>
                    <span>Q. 12/25</span>
                  </div>
                  
                  <p className="text-[#FAF7FF] font-medium text-[16px] leading-[1.6]">
                    Given a cyclic graph of size N, what is the maximum number of cuts required to partition it into components of size at most K?
                  </p>

                  {/* Multi-choice options */}
                  <div className="space-y-[10px] pt-[8px]">
                    {[
                      { label: "A", text: "ceil(N / K)", selected: false },
                      { label: "B", text: "N - K + 1", selected: false },
                      { label: "C", text: "ceil(N / K) + 1", selected: true },
                      { label: "D", text: "floor(N / K)", selected: false }
                    ].map((opt) => (
                      <div 
                        key={opt.label}
                        className={`flex items-center justify-between px-[16px] py-[12px] rounded-[10px] border transition-all duration-300 ${
                          opt.selected 
                            ? "bg-[rgba(245,158,11,0.08)] border-[#F59E0B] text-[#FAF7FF] shadow-[0_0_15px_rgba(245,158,11,0.05)]" 
                            : "bg-[#080010] border-[#1E0A35] text-[#B8B0D1]"
                        }`}
                      >
                        <span className="text-[14px]"><strong>{opt.label}.</strong> {opt.text}</span>
                        {opt.selected && <div className="w-[8px] h-[8px] rounded-full bg-[#F59E0B]" />}
                      </div>
                    ))}
                  </div>

                  {/* Adaptive Engine Real-time Analysis Widget */}
                  <div className="mt-[28px] pt-[20px] border-t border-[#1E0A35] bg-[rgba(245,158,11,0.02)] p-[16px] rounded-[12px] border border-[rgba(245,158,11,0.05)] space-y-[12px]">
                    <div className="flex items-center justify-between text-[12px] font-mono">
                      <span className="text-[#9A91B5]">REAL-TIME ADAPTIVE RUNTIME</span>
                      <span className="text-[#FBBF24] font-semibold">Active</span>
                    </div>

                    <div className="grid grid-cols-2 gap-[12px] text-[13px]">
                      <div className="bg-[#080010]/80 p-[10px] rounded-md border border-[#1E0A35]">
                        <span className="text-[#6B6088] text-[11px] block uppercase font-mono mb-[2px]">Student Pace</span>
                        <strong className="text-[#FAF7FF] font-medium font-sans">14.2s (Optimal)</strong>
                      </div>
                      <div className="bg-[#080010]/80 p-[10px] rounded-md border border-[#1E0A35]">
                        <span className="text-[#6B6088] text-[11px] block uppercase font-mono mb-[2px]">Cognitive Load</span>
                        <strong className="text-[#FAF7FF] font-medium font-sans text-green-400">Stable</strong>
                      </div>
                    </div>

                    <div className="pt-[4px]">
                      <div className="flex justify-between items-center text-[11px] text-[#9A91B5] font-mono mb-[4px]">
                        <span>Difficulty Progression</span>
                        <span className="text-[#F59E0B]">Level Up imminent</span>
                      </div>
                      <div className="h-[4px] w-full bg-[#080010] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] rounded-full" style={{ width: '84%' }} />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
