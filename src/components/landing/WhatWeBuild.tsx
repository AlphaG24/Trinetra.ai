"use client";

import { motion } from "framer-motion";
import { Bot, GraduationCap, Users } from "lucide-react";
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
    linkText: "Trinetra Shiksha (In Stealth)",
    linkRef: "#",
    linkStyle: "text-[#6B6088] cursor-default",
    clickable: false
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
            ✦ What We Build
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
                <Link href={card.linkRef} className={`font-sans font-medium text-[14px] ${card.linkStyle}`}>
                  {card.linkText}
                </Link>
              ) : (
                <span className={`font-sans font-medium text-[14px] ${card.linkStyle}`}>
                  {card.linkText}
                </span>
              )}
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
