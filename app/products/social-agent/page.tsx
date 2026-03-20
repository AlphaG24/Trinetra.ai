"use client";

import { Layout } from "@/components/layout/Layout";
import { motion } from "framer-motion";
import Link from "next/link";
import { Instagram, Check, X, Wand2, Calendar, TrendingUp } from "lucide-react";

export default function SocialAgentPage() {
  return (
    <Layout>
      <div className="flex flex-col bg-[#080010] min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 800px 500px at top center, rgba(236,72,153,0.1) 0%, transparent 70%)' }} />

        {/* SECTION 1: PRODUCT HERO */}
        <section className="relative z-10 w-full pt-[140px] pb-[80px] px-[20px] flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-[8px] bg-[rgba(245,158,11,0.1)] text-[#F59E0B] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[24px]">
             <span className="w-[6px] h-[6px] rounded-full bg-[#F59E0B] animate-pulse" /> Beta
          </div>
          <div className="w-[64px] h-[64px] rounded-[16px] bg-[#130224] border border-[#2D1255] flex items-center justify-center mb-[24px] shadow-[0_0_30px_rgba(245,158,11,0.3)]">
            <Instagram size={32} className="text-[#F59E0B]" />
          </div>
          <h1 className="font-display font-bold text-[40px] md:text-[52px] text-[#F5F3FF] tracking-[-0.02em] leading-tight mb-[24px]">
            AI Social Media Agent
          </h1>
          <p className="font-sans font-normal text-[16px] md:text-[18px] text-[#A8A0C0] max-w-[560px] leading-relaxed mb-[40px]">
            Generate captions, create content calendars, and schedule posts across Instagram — automatically. Your AI content team.
          </p>
          <div className="flex flex-col sm:flex-row gap-[16px] w-full sm:w-auto">
            <Link href="/contact" className="px-[32px] py-[16px] bg-[#FBBF24] text-[#080010] font-sans font-semibold text-[16px] rounded-full shadow-[0_0_30px_rgba(251,191,36,0.2)] hover:bg-[#F59E0B] hover:-translate-y-1 transition-all">
              Activate Your AI →
            </Link>
            <button className="px-[32px] py-[16px] border border-[#2D1255] bg-[rgba(19,2,36,0.5)] text-[#F59E0B] font-sans font-medium text-[16px] rounded-full hover:bg-[#2D1255] hover:text-[#F5F3FF] hover:-translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer">
              See It Work ▶
            </button>
          </div>
        </section>

        {/* SECTION 2: PROBLEM -> SOLUTION */}
        <section className="relative z-10 w-full py-[80px] px-[20px]">
          <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-[24px]">
            <div className="bg-[#0C0118] border border-[rgba(239,68,68,0.15)] rounded-[20px] p-[40px] relative">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[150px] leading-none text-[#EF4444] opacity-[0.03] select-none pointer-events-none font-bold">✗</div>
               <h3 className="font-display font-semibold text-[20px] text-[#EF4444] mb-[24px]">Without AI Social Agent</h3>
               <div className="flex flex-col gap-[16px]">
                 {[
                   "Staring at a blank screen trying to write captions daily",
                   "Inconsistent posting schedules killing your reach",
                   "Paying thousands to external social media marketing agencies",
                   "Engaging with comments manually taking up hours"
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
                   "High-converting copy natively adapting to your unique voice",
                   "Posts are scheduled entirely on autopilot automatically",
                   "A full creative team working inside a unified subscription",
                   "Dynamic engagement scaling naturally without manual limits"
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
              { icon: Wand2, title: "Content Generation", desc: "Provide your brand voice and topics. The AI generates captions, hashtags, and content ideas tailored to your audience." },
              { icon: Calendar, title: "Smart Scheduling", desc: "AI picks optimal posting times based on your audience activity. Set it and forget it." },
              { icon: TrendingUp, title: "Performance Learning", desc: "Analyzes which posts perform best and adapts future content strategy automatically." }
            ].map((Feature, i) => (
              <div key={i} className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px] relative overflow-hidden group hover:border-[#F59E0B]/50 transition-colors">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] opacity-50" />
                <Feature.icon size={48} className="text-[#F59E0B] mb-[24px]" strokeWidth={1} />
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
                { step: "1", title: "Establish Your Voice", desc: "Input 5-10 of your best previous posts alongside a short description of your company values to calibrate the neural model." },
                { step: "2", title: "Load Primary Assets", desc: "Drop your raw photos or generic video cuts straight into the primary dashboard pipeline securely." },
                { step: "3", title: "Approve & Evolve", desc: "Trinetra builds the full scheduled calendar instantly. You hit 'Approve' and watch the metrics aggregate iteratively." }
              ].map((item, i) => (
                <div key={i} className="relative z-10 flex gap-[24px]">
                  <div className="w-[48px] h-[48px] rounded-full bg-[#130224] border border-[#F59E0B] flex items-center justify-center text-[#F59E0B] font-display font-bold text-[20px] shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
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

        {/* SECTION 5: USE CASES BY INDUSTRY */}
        <section className="relative z-10 w-full py-[100px] px-[20px]">
          <div className="max-w-[1200px] mx-auto flex flex-col items-center text-center">
            <div className="inline-block bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.15)] text-[#F59E0B] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[24px]">
              ✦ Built For
            </div>
            <h2 className="font-display font-bold text-[32px] text-[#F5F3FF] mb-[48px]">Use Cases by Industry</h2>
            
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-[24px] text-left">
              {[
                { icon: "🛍️", name: "D2C Brands", desc: "New product drop campaigns, user generated content resharing, discount promo loops" },
                { icon: "🎙️", name: "Podcasters / Creators", desc: "Snippet highlight formatting, dynamic engagement polls, guest announcement series" },
                { icon: "🏢", name: "Agencies", desc: "Multi-client social management mapping automatically over unique brand voices natively" },
                { icon: "👨‍🍳", name: "Restaurants", desc: "Daily special visual pushes, behind the scenes chef highlights, weekend event drops" }
              ].map((ind, i) => (
                <div key={i} className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[24px] flex gap-[16px]">
                  <div className="text-[32px] leading-none">{ind.icon}</div>
                  <div>
                    <h4 className="font-display font-semibold text-[18px] text-[#F5F3FF] mb-[8px]">{ind.name}</h4>
                    <p className="font-sans font-normal text-[14px] text-[#A8A0C0]">{ind.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 6: LIVE DEMO / PREVIEW */}
        <section className="relative z-10 w-full py-[80px] px-[20px] bg-[#0C0118] border-y border-[#1E0A35]">
          <div className="max-w-[1000px] mx-auto bg-[#130224] border border-[#F59E0B]/20 rounded-[24px] p-[0px] shadow-[0_0_80px_rgba(245,158,11,0.05)] overflow-hidden flex flex-col md:flex-row">
            <div className="p-[48px] flex-1 flex flex-col justify-center">
              <h2 className="font-display font-bold text-[28px] text-[#F5F3FF] mb-[16px]">Generate 30 Days of Content in 3 Minutes.</h2>
              <p className="font-sans font-normal text-[16px] text-[#A8A0C0] mb-[32px] leading-relaxed">
                Connect your core accounts and let the internal Trinetra visual matrix dynamically pull your highest performing historical styles to construct the upcoming pipeline purely autonomously.
              </p>
              <div className="flex gap-[8px]">
                <div className="h-[8px] w-[8px] rounded-full bg-[#EF4444]" />
                <div className="h-[8px] w-[8px] rounded-full bg-[#F59E0B]" />
                <div className="h-[8px] w-[8px] rounded-full bg-[#10B981]" />
              </div>
            </div>
            <div className="bg-[#1E0A35] flex-1 p-[32px] relative flex items-center justify-center">
              {/* Mockup visual block */}
              <div className="w-[80%] max-w-[280px] bg-[#0C0118] border border-[#2D1255] rounded-[16px] overflow-hidden shadow-2xl">
                <div className="w-full aspect-square bg-[#2D1255] relative flex items-center justify-center">
                  <Instagram className="text-[rgba(255,255,255,0.1)]" size={64} />
                </div>
                <div className="p-[16px]">
                  <div className="h-[12px] w-[60%] bg-[#2D1255] rounded-full mb-[8px]" />
                  <div className="h-[12px] w-[90%] bg-[#2D1255] rounded-full mb-[8px]" />
                  <div className="h-[12px] w-[40%] bg-[#2D1255] rounded-full mb-[16px]" />
                  <div className="flex gap-[8px]">
                    <div className="px-[8px] py-[4px] bg-[rgba(245,158,11,0.1)] text-[#F59E0B] text-[10px] rounded-[4px] font-sans">#Trending</div>
                    <div className="px-[8px] py-[4px] bg-[rgba(245,158,11,0.1)] text-[#F59E0B] text-[10px] rounded-[4px] font-sans">#Automation</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7: PRICING SNIPPET */}
        <section className="relative z-10 w-full py-[80px] px-[20px] text-center">
          <div className="font-sans font-medium text-[16px] text-[#A8A0C0] mb-[24px]">
            Starts at <span className="text-[#FBBF24]">₹4,999/month</span> as part of our Starter plan
          </div>
          <Link href="/pricing" className="inline-flex items-center text-[#A78BFA] hover:text-[#F5F3FF] font-sans text-[15px] underline transition-colors">
            View full pricing breakdown →
          </Link>
        </section>

        {/* SECTION 8: FAQ */}
        <section className="relative z-10 w-full py-[80px] px-[20px] bg-[#0C0118] border-t border-[#1E0A35]">
          <div className="max-w-[800px] mx-auto">
            <h2 className="font-display font-bold text-[32px] text-[#F5F3FF] text-center mb-[48px]">Frequently Asked Questions</h2>
            <div className="flex flex-col gap-[16px]">
              {[
                { q: "Does it post directly or just create drafts?", a: "Trinetra integrates officially through the Instagram/Facebook Graph APIs mapping complete direct publishing directly. You just approve the sequence." },
                { q: "Can I manually edit captions before publishing?", a: "Absolutely. Everything routes strictly through your unified dashboard where you can physically override any specific word natively before the automated drop." },
                { q: "Does it understand my brand voice?", a: "Yes. We specifically fine-tune the LLM sequence based precisely on your prior highly-engaged content alongside your master instruction prompt." },
                { q: "Can it reply to comments?", a: "Yes! The Social Agent natively drops into any comment threads executing polite, dynamic responses driving user retention loops upward actively." }
              ].map((faq, i) => (
                <div key={i} className="bg-[#130224] border border-[#1E0A35] rounded-[12px] overflow-hidden">
                  <details className="group">
                    <summary className="font-sans font-medium text-[16px] text-[#F5F3FF] p-[20px] cursor-pointer list-none flex justify-between items-center hover:text-[#A78BFA] transition-colors">
                      {faq.q}
                      <span className="text-[#6B6088] group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="px-[20px] pb-[20px] pt-[0px] font-sans text-[15px] text-[#A8A0C0] leading-relaxed">
                      {faq.a}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 9: CTA */}
        <section className="relative z-10 w-full py-[100px] px-[20px] flex flex-col items-center text-center">
          <h2 className="font-display font-bold text-[36px] text-[#F5F3FF] mb-[32px]">
            Ready to activate your AI Social Agent?
          </h2>
          <Link href="/contact" className="px-[40px] py-[20px] bg-[#FBBF24] text-[#080010] font-sans font-bold text-[18px] rounded-full shadow-[0_0_40px_rgba(251,191,36,0.25)] hover:bg-[#F59E0B] hover:-translate-y-1 transition-all">
            Get Started Now
          </Link>
        </section>

      </div>
    </Layout>
  );
}
