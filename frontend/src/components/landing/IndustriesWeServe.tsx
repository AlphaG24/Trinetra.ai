"use client";

import { motion } from "framer-motion";

const industries = [
  {
    num: "01",
    icon: "🏥",
    title: "Healthcare & Clinics",
    desc: "Inbound triage, appointment booking, prescription refills, and pre-op reminders in regional dialects."
  },
  {
    num: "02",
    icon: "🏠",
    title: "Real Estate & Housing",
    desc: "Lead qualification, site visit scheduling, price guidance, and instant WhatsApp brochures."
  },
  {
    num: "03",
    icon: "🏫",
    title: "Institutes & Coaching",
    desc: "Admissions counseling, entrance test queries, fee follow-ups, and student doubt resolution."
  },
  {
    num: "04",
    icon: "🍽️",
    title: "Hospitality & Dining",
    desc: "Table reservations, party bookings, catering inquiries, and operating hour details."
  },
  {
    num: "05",
    icon: "💼",
    title: "Professional Services",
    desc: "CA & legal consultations, client intake qualification, document checklists, and callbacks."
  },
  {
    num: "06",
    icon: "💇",
    title: "Wellness & Salons",
    desc: "Slot reservations, service menu queries, cancellation management, and loyalty re-engagement."
  }
];

export function IndustriesWeServe() {
  return (
    <section id="industries" className="w-full bg-white py-20 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <div className="max-w-[1536px] mx-auto">
        
        {/* Section Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 mb-10 border-b border-slate-200/90 gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-[1px] bg-[#84CC16]" />
            <h2 className="text-[13px] font-mono tracking-[0.2em] uppercase font-bold text-[#0B0F17]">
              INDUSTRIES WE SERVE
            </h2>
          </div>
          <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-slate-500 font-semibold">
            VERTICAL SPECIALIZATIONS →
          </span>
        </div>

        {/* 6-Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {industries.map((ind, idx) => (
            <motion.div
              key={ind.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className="group relative flex flex-col justify-between rounded-2xl bg-white border border-slate-200/90 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-lime-400 hover:shadow-[0_12px_36px_rgba(132,204,22,0.12)] transition-all duration-300"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="text-2xl p-2 rounded-xl bg-slate-50 border border-slate-200">{ind.icon}</span>
                  <span className="font-mono text-xs font-bold text-[#84CC16]">
                    {ind.num}
                  </span>
                </div>

                <h3 className="font-mono text-sm font-bold text-[#0B0F17] uppercase tracking-tight mb-2">
                  {ind.title}
                </h3>
                <p className="font-sans text-xs text-slate-600 leading-relaxed">
                  {ind.desc}
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <span className="text-slate-400 group-hover:text-[#84CC16] group-hover:translate-x-1 transition-all text-xs">
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
