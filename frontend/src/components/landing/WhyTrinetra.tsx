"use client";

import { motion } from "framer-motion";
import { Globe, Zap, GraduationCap, Shield, PhoneCall, Database, ArrowRight } from "lucide-react";

const features = [
  {
    num: "01",
    id: "lang",
    icon: <Globe size={22} className="text-[#0B0F17]" />,
    title: "MULTILINGUAL VOICE",
    desc: "Autonomous voice pipelines fluently conversing across Hinglish, Hindi, Tamil, Telugu, and 60+ global languages with sub-second latency.",
  },
  {
    num: "02",
    id: "heal",
    icon: <Zap size={22} className="text-[#0B0F17]" />,
    title: "SELF-HEALING AGENTS",
    desc: "Continuous autonomous monitoring that detects tool errors, recovers gracefully mid-call, and self-optimizes with every conversational turn.",
  },
  {
    num: "03",
    id: "voice",
    icon: <PhoneCall size={22} className="text-[#0B0F17]" />,
    title: "AUTONOMOUS RECEPTION",
    desc: "24/7 inbound receptionists that qualify leads, schedule appointments, handle escalations, and send instant WhatsApp/SMS briefings.",
  },
  {
    num: "04",
    id: "shiksha",
    icon: <GraduationCap size={22} className="text-[#0B0F17]" />,
    title: "EDUCATION & SHIKSHA",
    desc: "Specialized pedagogical voice engines for schools, institutes, and entrance exam candidates with curriculum alignment.",
  },
  {
    num: "05",
    id: "data",
    icon: <Database size={22} className="text-[#0B0F17]" />,
    title: "STRUCTURED EXTRACTION",
    desc: "Real-time extraction of caller intent, appointments, CRM records, and structured JSON directly from natural voice conversations.",
  },
  {
    num: "06",
    id: "sec",
    icon: <Shield size={22} className="text-[#0B0F17]" />,
    title: "ENTERPRISE SECURITY",
    desc: "DPDP Act 2023 compliant, automated PII scrubbing, 180-day retention splits, strict multi-tenant isolation, and in-country data residency.",
  },
];

export function WhyTrinetra() {
  return (
    <section id="solutions" className="w-full bg-white py-20 px-6 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-[1536px]">
        
        {/* Section Top Bar (Matching Reference Image "■ WHAT I DO" / "SOLVING PROBLEMS WITH DESIGN") */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 mb-10 border-b border-slate-200/90 gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-[1px] bg-[#84CC16]" />
            <h2 className="text-[13px] font-mono tracking-[0.2em] uppercase font-bold text-[#0B0F17]">
              WHAT WE DO
            </h2>
          </div>
          <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-slate-500 font-semibold">
            SOLVING PROBLEMS WITH VOICE &amp; AI
          </span>
        </div>

        {/* Grid of Luminous White Cards (Matching 01, 02, 03, 04 Card Style in Reference Image) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.08 * idx }}
              className="group relative flex flex-col justify-between rounded-2xl bg-white border border-slate-200/90 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-lime-400 hover:shadow-[0_12px_36px_rgba(132,204,22,0.12)] transition-all duration-300"
            >
              <div>
                {/* Header: Icon on Left, Lime Numeric Badge on Right */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 group-hover:border-[#84CC16] group-hover:bg-[#84CC16]/10 transition-colors">
                    {feature.icon}
                  </div>
                  <span className="font-mono text-sm font-bold text-[#84CC16]">
                    {feature.num}
                  </span>
                </div>

                {/* Card Title & Desc */}
                <h3 className="text-base font-bold text-[#0B0F17] tracking-tight mb-2.5 uppercase font-mono">
                  {feature.title}
                </h3>
                <p className="text-[13px] text-slate-600 leading-relaxed font-sans">
                  {feature.desc}
                </p>
              </div>

              {/* Bottom Right Corner Arrow */}
              <div className="mt-8 flex justify-end">
                <span className="text-slate-400 group-hover:text-[#84CC16] group-hover:translate-x-1 transition-all duration-200 text-sm">
                  →
                </span>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
