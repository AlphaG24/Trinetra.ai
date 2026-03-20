"use client";

import { motion } from "framer-motion";
import { Globe, IndianRupee, Zap, BarChart3, Shield, Clock } from "lucide-react";

const features = [
  {
    id: "lang",
    icon: <Globe size={28} className="text-[#8B5CF6]" />,
    colorBg: "bg-[rgba(139,92,246,0.08)]",
    title: "Multilingual AI",
    desc: "Our agents speak Hindi, English, and more. Because India doesn't just speak English."
  },
  {
    id: "price",
    icon: <IndianRupee size={28} className="text-[#F59E0B]" />,
    colorBg: "bg-[rgba(245,158,11,0.08)]",
    title: "India-First Pricing",
    desc: "Pay-per-use starting at ₹2/interaction. No $297/month Silicon Valley pricing."
  },
  {
    id: "heal",
    icon: <Zap size={28} className="text-[#22D3EE]" />,
    colorBg: "bg-[rgba(34,211,238,0.08)]",
    title: "Self-Healing Agents",
    desc: "Our AI agents detect and fix their own errors. They get smarter with every interaction."
  },
  {
    id: "roi",
    icon: <BarChart3 size={28} className="text-[#8B5CF6]" />,
    colorBg: "bg-[rgba(139,92,246,0.08)]",
    title: "ROI Dashboard",
    desc: "See exactly how much time, money, and effort your AI is saving. Real metrics, not vanity numbers."
  },
  {
    id: "sec",
    icon: <Shield size={28} className="text-[#F59E0B]" />,
    colorBg: "bg-[rgba(245,158,11,0.08)]",
    title: "Enterprise Security",
    desc: "End-to-end encryption, DPDPA compliant, role-based access. Your data never leaves India."
  },
  {
    id: "deploy",
    icon: <Clock size={28} className="text-[#22D3EE]" />,
    colorBg: "bg-[rgba(34,211,238,0.08)]",
    title: "24-Hour Deployment",
    desc: "From signup to live AI agent in under 24 hours. Not weeks. Not months. One day."
  }
];

export function WhyTrinetra() {
  return (
    <section className="w-full bg-[#080010] py-[100px] overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-[20px] md:px-[80px]">
        
        {/* HEADER */}
        <div className="flex flex-col items-center text-center mb-[64px]">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-block bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.15)] text-[#A78BFA] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[20px]"
          >
            ✦ Why Trinetra
          </motion.div>

          {/* Heading */}
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-bold text-[32px] md:text-[42px] text-[#F5F3FF] tracking-[-0.02em] mb-[16px] leading-tight"
          >
            Built <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #8B5CF6 0%, #FBBF24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Different.</span> Built for India.
          </motion.h2>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-sans font-normal text-[16px] md:text-[18px] text-[#A8A0C0] max-w-[600px] mx-auto leading-[1.6]"
          >
            While others copy Silicon Valley, we build for the realities of Indian businesses.
          </motion.p>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[20px]">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 * idx }}
              className="group bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px] transition-all duration-300 hover:border-[#2D1255] hover:-translate-y-[2px]"
            >
              {/* Icon Container */}
              <div className={`w-[48px] h-[48px] rounded-[12px] flex items-center justify-center mb-[20px] ${feature.colorBg}`}>
                {feature.icon}
              </div>

              {/* Title */}
              <h3 className="font-display font-semibold text-[18px] text-[#F5F3FF] mb-[10px]">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="font-sans font-normal text-[14px] text-[#A8A0C0] leading-[1.6]">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
