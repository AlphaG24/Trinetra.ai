"use client";

import { motion } from "framer-motion";
import { Globe, Zap, GraduationCap, Shield, PhoneCall, Database } from "lucide-react";

const features = [
  {
    id: "lang",
    icon: <Globe size={28} className="text-[#8B5CF6]" />,
    colorBg: "bg-[rgba(139,92,246,0.08)]",
    title: "Multilingual AI",
    desc: "Our agents speak Hindi, English, and more. Because India doesn't just speak English.",
  },
  {
    id: "heal",
    icon: <Zap size={28} className="text-[#22D3EE]" />,
    colorBg: "bg-[rgba(34,211,238,0.08)]",
    title: "Self-Healing Agents",
    desc: "Our AI agents detect and fix their own errors. They get smarter with every interaction.",
  },
  {
    id: "shiksha",
    icon: <GraduationCap size={28} className="text-[#8B5CF6]" />,
    colorBg: "bg-[rgba(139,92,246,0.08)]",
    title: "AI-Powered Education",
    desc: "Empowering institutions with smart assessment engines, dynamic lesson plans, and localized teaching aids aligned with national guidelines.",
  },
  {
    id: "voice",
    icon: <PhoneCall size={28} className="text-[#22D3EE]" />,
    colorBg: "bg-[rgba(34,211,238,0.08)]",
    title: "Autonomous Voice Workflows",
    desc: "Deploy custom voice receptionists to manage inbound/outbound calls, schedule appointments, and coordinate workflows in multiple regional languages.",
  },
  {
    id: "data",
    icon: <Database size={28} className="text-[#FBBF24]" />,
    colorBg: "bg-[rgba(251,191,36,0.08)]",
    title: "Intelligent Data Extraction",
    desc: "Automate document classification and entity extraction. Pull structured datasets from complex tables, PDFs, and invoices with absolute precision.",
  },
  {
    id: "sec",
    icon: <Shield size={28} className="text-[#F59E0B]" />,
    colorBg: "bg-[rgba(245,158,11,0.08)]",
    title: "Enterprise Security",
    desc: "End-to-end encryption, DPDPA compliant, role-based access. Your data never leaves India.",
  },
];

export function WhyTrinetra() {
  return (
    <section className="w-full overflow-hidden bg-[#080010] py-[100px]">
      <div className="mx-auto max-w-[1280px] px-[20px] md:px-[80px]">
        <div className="mb-[64px] flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-[20px] inline-block rounded-full border border-[rgba(139,92,246,0.15)] bg-[rgba(139,92,246,0.1)] px-[16px] py-[6px] font-sans text-[13px] font-medium text-[#D7C4F7]"
          >
            Why Trinetra
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-[16px] font-display text-[32px] font-bold leading-tight tracking-[-0.02em] text-[#FAF7FF] md:text-[42px]"
          >
            Built{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #8B5CF6 0%, #FBBF24 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Different.
            </span>{" "}
            Built for India.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto max-w-[600px] font-sans text-[16px] font-normal leading-[1.6] text-[#B8B0D1] md:text-[18px]"
          >
            While others copy Silicon Valley, we build for the realities of Indian businesses.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 gap-[20px] md:grid-cols-3">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 * idx }}
              className="group rounded-[16px] border border-[#1E0A35] bg-[#130224] p-[32px] transition-all duration-300 hover:-translate-y-[2px] hover:border-[#2D1255]"
            >
              <div
                className={`mb-[20px] flex h-[48px] w-[48px] items-center justify-center rounded-[12px] ${feature.colorBg}`}
              >
                {feature.icon}
              </div>

              <h3 className="mb-[10px] font-display text-[18px] font-semibold text-[#FAF7FF]">
                {feature.title}
              </h3>

              <p className="font-sans text-[14px] font-normal leading-[1.6] text-[#B8B0D1]">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
