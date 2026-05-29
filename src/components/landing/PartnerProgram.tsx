"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BadgePercent, CircleDollarSign, Link2 } from "lucide-react";

const partnerFeatures = [
  {
    title: "Recurring commissions",
    description: "Track partner earnings, approved payouts, and paid commissions in one place.",
    icon: CircleDollarSign,
    color: "text-[#F59E0B]",
    bg: "bg-[rgba(245,158,11,0.08)]",
  },
  {
    title: "Unique referral code",
    description: "Each partner receives a dedicated referral code and shareable referral link.",
    icon: Link2,
    color: "text-[#8B5CF6]",
    bg: "bg-[rgba(139,92,246,0.08)]",
  },
  {
    title: "Referral visibility",
    description: "See referral history, qualification status, and conversion value from the dashboard.",
    icon: BadgePercent,
    color: "text-[#22D3EE]",
    bg: "bg-[rgba(34,211,238,0.08)]",
  },
];

export function PartnerProgram() {
  return (
    <section className="relative overflow-hidden bg-[#080010] py-[100px]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(139,92,246,0.08) 0%, rgba(8,0,16,0) 55%)",
        }}
      />

      <div className="relative mx-auto max-w-[1280px] px-[20px] md:px-[80px]">
        <div className="rounded-[28px] border border-[#1E0A35] bg-[linear-gradient(180deg,rgba(19,2,36,0.95),rgba(12,1,24,0.98))] p-[28px] md:p-[40px]">
          <div className="grid gap-[32px] lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="inline-block rounded-full border border-[rgba(139,92,246,0.15)] bg-[rgba(139,92,246,0.1)] px-[16px] py-[6px] font-sans text-[13px] font-medium text-[#D7C4F7]"
              >
                Partner With Trinetra
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mt-[18px] font-display text-[34px] font-bold leading-tight tracking-[-0.02em] text-[#FAF7FF] md:text-[44px]"
              >
                Join the referral network and manage your partner performance from a dedicated portal.
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-[16px] max-w-[560px] font-sans text-[16px] leading-[1.7] text-[#B8B0D1] md:text-[18px]"
              >
                If you bring clients to Trinetra, your dashboard should already know your code, your
                commissions, and your referral history.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-[28px] flex flex-wrap gap-[14px]"
              >
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full bg-[#F59E0B] px-[24px] py-[14px] font-sans text-[15px] font-semibold text-[#080010] transition-colors hover:bg-[#D97706]"
                >
                  Join as Partner
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full border border-[#2D1255] bg-[#0C0118] px-[24px] py-[14px] font-sans text-[15px] font-medium text-[#D7C4F7] transition-colors hover:border-[#8B5CF6] hover:text-[#FAF7FF]"
                >
                  Discuss Partnership
                </Link>
              </motion.div>
            </div>

            <div className="grid gap-[16px]">
              {partnerFeatures.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.55, delay: 0.1 * index }}
                    className="rounded-[18px] border border-[#1E0A35] bg-[#130224] p-[22px]"
                  >
                    <div className="flex items-start gap-[16px]">
                      <div
                        className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] ${feature.bg} ${feature.color}`}
                      >
                        <Icon size={22} />
                      </div>
                      <div>
                        <h3 className="font-display text-[18px] font-semibold text-[#FAF7FF]">
                          {feature.title}
                        </h3>
                        <p className="mt-[8px] font-sans text-[14px] leading-[1.7] text-[#B8B0D1]">
                          {feature.description}
                        </p>
                      </div>
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
