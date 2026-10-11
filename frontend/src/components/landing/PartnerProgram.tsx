"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BadgePercent, CircleDollarSign, Link2, ArrowRight } from "lucide-react";

const partnerFeatures = [
  {
    num: "01",
    title: "Recurring Monthly Commissions",
    description: "Earn predictable revenue on every active virtual line, minutes volume, and enterprise subscription.",
    icon: CircleDollarSign,
  },
  {
    num: "02",
    title: "Dedicated Partner Portal",
    description: "Track live lead conversions, custom referral links, qualification milestones, and automatic payouts.",
    icon: Link2,
  },
  {
    num: "03",
    title: "White-Label & Agency Support",
    description: "Deploy branded voice receptionists for your clients with co-selling assistance and direct API tokens.",
    icon: BadgePercent,
  },
];

export function PartnerProgram() {
  return (
    <section className="relative overflow-hidden bg-white py-20 px-6 sm:px-10 lg:px-16">
      <div className="relative mx-auto max-w-[1536px]">
        
        {/* Section Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 mb-10 border-b border-slate-200/90 gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-[1px] bg-[#84CC16]" />
            <h2 className="text-[13px] font-mono tracking-[0.2em] uppercase font-bold text-[#0B0F17]">
              PARTNER ECOSYSTEM
            </h2>
          </div>
          <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-slate-500 font-semibold">
            AGENCY &amp; ENTERPRISE ALLIANCES →
          </span>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-8 sm:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            
            <div className="lg:col-span-5">
              <span className="inline-block px-3 py-1 rounded-full bg-lime-500/10 border border-lime-500/30 text-[11px] font-mono font-bold text-lime-800 uppercase tracking-wider mb-4">
                REVENUE SHARE
              </span>

              <h3 className="text-3xl sm:text-4xl font-black text-[#0B0F17] tracking-tight leading-tight mb-4">
                Scale Your Agency with{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#65A30D] via-[#84CC16] to-[#A3E635]">
                  Voice AI.
                </span>
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans mb-8">
                Join our certified partner program to deploy multilingual voice receptionists for healthcare, education, retail, and real estate clients.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/partner/apply"
                  className="inline-flex items-center gap-2 rounded-full bg-[#0B0F17] px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-black hover:shadow-[0_0_20px_rgba(132,204,22,0.35)] transition-all"
                >
                  <span>Apply as Partner</span>
                  <ArrowRight size={14} className="text-[#84CC16]" />
                </Link>

                <Link
                  href="/partner/login"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-700 hover:border-[#84CC16] hover:text-[#0B0F17] transition-all"
                >
                  Partner Login
                </Link>
              </div>
            </div>

            {/* Right Features Cards */}
            <div className="lg:col-span-7 grid gap-4 sm:grid-cols-3">
              {partnerFeatures.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-6 hover:border-lime-400 hover:bg-white transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-[#84CC16]">
                          <Icon size={18} />
                        </div>
                        <span className="font-mono text-xs font-bold text-[#84CC16]">
                          {feature.num}
                        </span>
                      </div>

                      <h4 className="font-mono text-xs font-bold text-[#0B0F17] uppercase tracking-tight mb-2">
                        {feature.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
