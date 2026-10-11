"use client";

import { motion } from "framer-motion";

const steps = [
  {
    num: "01",
    title: "Configure Persona & Dialect",
    desc: "Define your business knowledge, target dialect, greeting script, and appointment calendar rules in minutes.",
  },
  {
    num: "02",
    title: "Autonomous Pipeline Training",
    desc: "Our engine fine-tunes speech recognition, latency routing, and guardrail safeguards with custom verification.",
  },
  {
    num: "03",
    title: "Deploy Live Virtual Number",
    desc: "Receive your verified virtual telephony number or connect existing SIP trunks. Live production in under 24 hours.",
  }
];

export function HowItWorks() {
  return (
    <section 
      className="relative w-full py-20 overflow-hidden bg-white px-6 sm:px-10 lg:px-16"
    >
      <div className="max-w-[1536px] mx-auto">
        
        {/* Section Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 mb-12 border-b border-slate-200/90 gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-[1px] bg-[#84CC16]" />
            <h2 className="text-[13px] font-mono tracking-[0.2em] uppercase font-bold text-[#0B0F17]">
              HOW IT WORKS
            </h2>
          </div>
          <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-slate-500 font-semibold">
            ZERO TO LIVE IN 24 HOURS →
          </span>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {steps.map((step, idx) => (
            <motion.div 
              key={step.num}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * idx }}
              className="group relative flex flex-col justify-between rounded-3xl bg-white border border-slate-200/90 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-lime-400 hover:shadow-[0_12px_36px_rgba(132,204,22,0.12)] transition-all duration-300"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="font-mono text-2xl font-black text-[#84CC16]">
                    {step.num}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#84CC16]" />
                </div>

                <h3 className="font-mono text-base font-bold text-[#0B0F17] uppercase tracking-tight mb-3">
                  {step.title}
                </h3>
                <p className="font-sans text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>

              <div className="mt-8 flex justify-end">
                <span className="text-slate-400 group-hover:text-[#84CC16] group-hover:translate-x-1 transition-all text-sm">
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
