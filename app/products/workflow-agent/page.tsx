"use client";

import { Layout } from "@/components/layout/Layout";
import { motion } from "framer-motion";
import Link from "next/link";
import { Check, X, Network, Workflow, BringToFront, Combine } from "lucide-react";

export default function WorkflowAgentPage() {
  return (
    <Layout>
      <div className="flex flex-col bg-[#080010] min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 800px 500px at top center, rgba(167,139,250,0.1) 0%, transparent 70%)' }} />

        {/* SECTION 1: PRODUCT HERO */}
        <section className="relative z-10 w-full pt-[140px] pb-[80px] px-[20px] flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-[8px] bg-[rgba(107,96,136,0.15)] text-[#A8A0C0] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[24px]">
             <span className="w-[8px] h-[8px] rounded-full text-[14px]">◐</span> Coming Soon
          </div>
          <div className="w-[64px] h-[64px] rounded-[16px] bg-[#130224] border border-[#2D1255] flex items-center justify-center mb-[24px] shadow-[0_0_30px_rgba(139,92,246,0.2)]">
            <Network size={32} className="text-[#A78BFA]" />
          </div>
          <h1 className="font-display font-bold text-[40px] md:text-[52px] text-[#F5F3FF] tracking-[-0.02em] leading-tight mb-[24px]">
            AI Workflow Agent
          </h1>
          <p className="font-sans font-normal text-[16px] md:text-[18px] text-[#A8A0C0] max-w-[560px] leading-relaxed mb-[40px]">
            Automate complex multi-step business processes. Connect your tools, extract data, generate reports — all on autopilot.
          </p>
          <div className="flex flex-col sm:flex-row gap-[16px] w-full sm:w-auto">
            <Link href="/contact" className="px-[32px] py-[16px] border border-[#2D1255] bg-[rgba(19,2,36,0.5)] text-[#A78BFA] font-sans font-semibold text-[16px] rounded-full hover:bg-[#8B5CF6] hover:text-white hover:border-[#8B5CF6] hover:-translate-y-1 transition-all">
              Get Early Access →
            </Link>
          </div>
        </section>

        {/* SECTION 2: PROBLEM -> SOLUTION */}
        <section className="relative z-10 w-full py-[80px] px-[20px]">
          <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-[24px]">
            <div className="bg-[#0C0118] border border-[rgba(239,68,68,0.15)] rounded-[20px] p-[40px] relative">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[150px] leading-none text-[#EF4444] opacity-[0.03] select-none pointer-events-none font-bold">✗</div>
               <h3 className="font-display font-semibold text-[20px] text-[#EF4444] mb-[24px]">Without Workflow Agent</h3>
               <div className="flex flex-col gap-[16px]">
                 {[
                   "Endless copying and pasting data between unlinked software",
                   "Human error corrupting critical database entries continually",
                   "Paying thousands to Zapier experts tracking standard zaps",
                   "Total operational gridlock during massive scaling periods"
                 ].map((item, i) => (
                   <div key={i} className="flex items-start gap-[12px]">
                     <X size={18} className="text-[#EF4444] shrink-0 mt-[2px]" />
                     <span className="font-sans font-normal text-[15px] text-[#6B6088]">{item}</span>
                   </div>
                 ))}
               </div>
            </div>
            <div className="bg-[#130224] border border-[rgba(139,92,246,0.2)] rounded-[20px] p-[40px] relative shadow-[0_0_40px_rgba(139,92,246,0.05)]">
               <h3 className="font-display font-semibold text-[20px] text-[#F5F3FF] mb-[24px]">With Trinetra AI</h3>
               <div className="flex flex-col gap-[16px]">
                 {[
                   "Intelligent visual mapping directly parsing raw intent",
                   "Zero-hallucination data transfer across entirely disconnected APIs",
                   "Flawless sequential operations updating databases securely instantly",
                   "Self-healing operations dynamically catching edge-case logic"
                 ].map((item, i) => (
                   <div key={i} className="flex items-start gap-[12px]">
                     <Check size={18} className="text-[#10B981] shrink-0 mt-[2px]" />
                     <span className="font-sans font-normal text-[15px] text-[#A8A0C0]">{item}</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: KEY FEATURES */}
        <section className="relative z-10 w-full py-[80px] px-[20px]">
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-[24px]">
            {[
              { icon: Workflow, title: "Unbound Integrations", desc: "If it has an API, it can be automated natively. No more waiting perfectly for specific generic plugins." },
              { icon: Combine, title: "Multi-Step Logic", desc: "Build massive operational arrays parsing inputs deeply, evaluating conditionals, and executing heavy endpoint commands." },
              { icon: BringToFront, title: "Human in the loop", desc: "Setup explicit checkpoints naturally requiring your physical validation before transferring any sensitive high-profile transactions." }
            ].map((Feature, i) => (
              <div key={i} className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px] relative overflow-hidden group hover:border-[#8B5CF6]/50 transition-colors">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] opacity-50" />
                <Feature.icon size={48} className="text-[#8B5CF6] mb-[24px]" strokeWidth={1} />
                <h3 className="font-display font-semibold text-[20px] text-[#F5F3FF] mb-[12px]">{Feature.title}</h3>
                <p className="font-sans font-normal text-[15px] text-[#A8A0C0] leading-[1.6]">
                  {Feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: HOW IT WORKS */}
        <section className="relative z-10 w-full py-[80px] px-[20px] bg-[#0C0118] border-y border-[#1E0A35]">
          <div className="max-w-[800px] mx-auto flex flex-col items-center">
            <h2 className="font-display font-bold text-[32px] text-[#F5F3FF] mb-[64px]">How It Works</h2>
            <div className="relative w-full flex flex-col gap-[48px] pl-[20px]">
              <div className="absolute left-[44px] top-[24px] bottom-[24px] w-[2px] border-l-2 border-dotted border-[#2D1255] z-0" />
              {[
                { step: "1", title: "Determine the Core Path", desc: "Construct the visual logic map sequentially. Decide exactly what the trigger mechanisms actively process natively." },
                { step: "2", title: "Bind Valid Credentials", desc: "Lock in strict OAuth layers or explicit master API key mappings securely directly over your localized internal database bounds." },
                { step: "3", title: "Turn it on", desc: "Activate the node. Trinetra tracks explicit internal server logs validating each micro-transaction mapping cleanly." }
              ].map((item, i) => (
                <div key={i} className="relative z-10 flex gap-[24px]">
                  <div className="w-[48px] h-[48px] rounded-full bg-[#130224] border border-[#8B5CF6] flex items-center justify-center text-[#A78BFA] font-display font-bold text-[20px] shrink-0 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                    {item.step}
                  </div>
                  <div className="flex flex-col pt-[8px]">
                    <h3 className="font-display font-semibold text-[20px] text-[#F5F3FF] mb-[8px]">{item.title}</h3>
                    <p className="font-sans font-normal text-[15px] text-[#A8A0C0] leading-relaxed max-w-[500px]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 6: COMING SOON / WHAT IT HANDLES */}
        <section className="relative z-10 w-full py-[80px] px-[20px] bg-[#0C0118]">
          <div className="max-w-[1000px] mx-auto flex flex-col md:flex-row gap-[40px]">
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="font-display font-bold text-[32px] text-[#F5F3FF] mb-[16px]">What workflows will it handle?</h2>
              <p className="font-sans font-normal text-[16px] text-[#A8A0C0] mb-[32px]">
                Forget rigid templates. You can design nearly anything. Here are just a few standard combinations launching internally:
              </p>
              
              <div className="flex flex-col gap-[16px] font-mono text-[13px] text-[#A78BFA] bg-[#130224] border border-[#1E0A35] p-[24px] rounded-[16px]">
                  <div className="flex items-center gap-[12px]"><span className="text-[#FBBF24]">→</span> New lead → Qualify → Send email → Book meeting</div>
                  <div className="flex items-center gap-[12px]"><span className="text-[#FBBF24]">→</span> Invoice received → Extract data → Update spreadsheet → Notify team</div>
                  <div className="flex items-center gap-[12px]"><span className="text-[#FBBF24]">→</span> Customer complaint → Categorize → Route to department → Track resolution</div>
              </div>
            </div>
            
            <div className="flex-1 bg-[#130224] border border-[#2D1255] rounded-[24px] flex items-center justify-center p-[40px] relative">
              <div className="absolute inset-0 bg-[#080010]/20 rounded-[24px]" />
              {/* Animated Network nodes mockup */}
              <div className="relative w-full h-[200px] flex items-center justify-between z-10">
                <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="w-[40px] h-[40px] rounded-lg bg-[#F59E0B] flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
                <div className="h-[2px] flex-1 bg-gradient-to-r from-[#F59E0B] via-[#8B5CF6] to-[#06B6D4]" />
                <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, delay: 0.5, repeat: Infinity }} className="w-[40px] h-[40px] rounded-full bg-[#8B5CF6] flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)]" />
                <div className="h-[2px] flex-1 bg-gradient-to-r from-[#8B5CF6] to-[#10B981]" />
                <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, delay: 1, repeat: Infinity }} className="w-[40px] h-[40px] rounded-lg bg-[#10B981] flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7: PRICING SNIPPET */}
        <section className="relative z-10 w-full py-[80px] px-[20px] text-center border-t border-[#1E0A35]">
          <div className="font-sans font-medium text-[16px] text-[#A8A0C0] mb-[24px]">
            Pricing structure bounds launching late Q4 explicitly mapped.
          </div>
          <Link href="/pricing" className="inline-flex items-center text-[#A78BFA] hover:text-[#F5F3FF] font-sans text-[15px] underline transition-colors">
            View full pricing breakdown →
          </Link>
        </section>

        {/* SECTION 9: CTA */}
        <section className="relative z-10 w-full py-[100px] px-[20px] flex flex-col items-center text-center bg-[#0C0118] border-t border-[#1E0A35]">
          <h2 className="font-display font-bold text-[36px] text-[#F5F3FF] mb-[24px]">
            Unlock operational efficiency entirely.
          </h2>
          <p className="font-sans font-normal text-[16px] text-[#A8A0C0] max-w-[400px] mx-auto mb-[32px]">
            Get explicitly notified instantly once the architectural structure exits private testing.
          </p>
          <Link href="/contact" className="px-[40px] py-[20px] bg-[#8B5CF6] text-white font-sans font-bold text-[18px] rounded-full shadow-[0_0_40px_rgba(139,92,246,0.25)] hover:bg-[#7C3AED] hover:-translate-y-1 transition-all">
            Join the Waitlist
          </Link>
        </section>

      </div>
    </Layout>
  );
}
