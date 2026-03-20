"use client";

import { Layout } from "@/components/layout/Layout";
import { motion } from "framer-motion";
import Link from "next/link";
import { MessageSquare, Check, X, Zap, Download, Layers } from "lucide-react";

export default function ChatAgentPage() {
  return (
    <Layout>
      <div className="flex flex-col bg-[#080010] min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 800px 500px at top center, rgba(6,182,212,0.1) 0%, transparent 70%)' }} />

        {/* SECTION 1: PRODUCT HERO */}
        <section className="relative z-10 w-full pt-[140px] pb-[80px] px-[20px] flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-[8px] bg-[rgba(16,185,129,0.1)] text-[#10B981] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[24px]">
             <span className="w-[6px] h-[6px] rounded-full bg-[#10B981] animate-pulse" /> Live
          </div>
          <div className="w-[64px] h-[64px] rounded-[16px] bg-[#130224] border border-[#2D1255] flex items-center justify-center mb-[24px] shadow-[0_0_30px_rgba(6,182,212,0.3)]">
            <MessageSquare size={32} className="text-[#06B6D4]" />
          </div>
          <h1 className="font-display font-bold text-[40px] md:text-[52px] text-[#F5F3FF] tracking-[-0.02em] leading-tight mb-[24px]">
            AI Chat Agent
          </h1>
          <p className="font-sans font-normal text-[16px] md:text-[18px] text-[#A8A0C0] max-w-[560px] leading-relaxed mb-[40px]">
            An intelligent chatbot that lives on your website. Answers questions, captures leads, and converts visitors into customers — while you sleep.
          </p>
          <div className="flex flex-col sm:flex-row gap-[16px] w-full sm:w-auto">
            <Link href="/contact" className="px-[32px] py-[16px] bg-[#FBBF24] text-[#080010] font-sans font-semibold text-[16px] rounded-full shadow-[0_0_30px_rgba(251,191,36,0.2)] hover:bg-[#F59E0B] hover:-translate-y-1 transition-all">
              Activate Your AI →
            </Link>
          </div>
        </section>

        {/* SECTION 2: PROBLEM -> SOLUTION */}
        <section className="relative z-10 w-full py-[80px] px-[20px]">
          <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-[24px]">
            <div className="bg-[#0C0118] border border-[rgba(239,68,68,0.15)] rounded-[20px] p-[40px] relative">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[150px] leading-none text-[#EF4444] opacity-[0.03] select-none pointer-events-none font-bold">✗</div>
               <h3 className="font-display font-semibold text-[20px] text-[#EF4444] mb-[24px]">Without AI Chat Agent</h3>
               <div className="flex flex-col gap-[16px]">
                 {[
                   "Website visitors leave because they can't find answers",
                   "Support team flooded with repetitive basic questions",
                   "Lead capturing is restricted to static boring forms",
                   "Missed sales opportunities during late hours"
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
                   "Instant precise answers to all website queries 24/7",
                   "Automated support freeing up human reps for complex tasks",
                   "Conversational lead capturing boosting conversion volume",
                   "Generates appointments dynamically right in the chat window!"
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
              { icon: Layers, title: "Learns Your Entire Business", desc: "Upload FAQs, documents, website content. The AI absorbs everything and answers questions with pinpoint accuracy." },
              { icon: Download, title: "Automatic Lead Capture", desc: "Collects visitor name, email, phone — naturally within conversation. Sends leads to your inbox in real-time." },
              { icon: Zap, title: "2-Minute Installation", desc: "Copy one line of code. Paste on your website. Your chat agent is live. No developer needed." }
            ].map((Feature, i) => (
              <div key={i} className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px] relative overflow-hidden group hover:border-[#06B6D4]/50 transition-colors">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#06B6D4] to-[#FBBF24] opacity-50" />
                <Feature.icon size={48} className="text-[#06B6D4] mb-[24px]" strokeWidth={1} />
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
                { step: "1", title: "Feed Core Documentation", desc: "Point us to your active sitelinks or simply mass-upload raw PDFs outlining your exact technical specifications." },
                { step: "2", title: "Vector Analysis", desc: "Trinetra shreds the unstructured data compiling it across dynamic vector graphs configuring rapid, halluciation-free retrieval mapping." },
                { step: "3", title: "Copy & Paste", desc: "Grab the finalized 2-line standard Javascript mapping output and embed it universally directly inside your site `<head>`." }
              ].map((item, i) => (
                <div key={i} className="relative z-10 flex gap-[24px]">
                  <div className="w-[48px] h-[48px] rounded-full bg-[#130224] border border-[#06B6D4] flex items-center justify-center text-[#06B6D4] font-display font-bold text-[20px] shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
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
            <div className="inline-block bg-[rgba(6,182,212,0.1)] border border-[rgba(6,182,212,0.15)] text-[#06B6D4] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[24px]">
              ✦ Built For
            </div>
            <h2 className="font-display font-bold text-[32px] text-[#F5F3FF] mb-[48px]">Use Cases by Industry</h2>
            
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-[24px] text-left">
              {[
                { icon: "🛒", name: "E-commerce", desc: "Product questions, order tracking, return policies, size guides" },
                { icon: "📚", name: "Education", desc: "Course inquiries, enrollment process, fee structure, admission deadlines" },
                { icon: "🏢", name: "Service Businesses", desc: "Service descriptions, pricing breakdowns, appointment booking" },
                { icon: "💻", name: "SaaS & Tech", desc: "Feature explanations, onboarding help, documentation search, bug reporting" }
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

        {/* SECTION 6: LIVE DEMO */}
        <section className="relative z-10 w-full py-[80px] px-[20px] bg-[#0C0118] border-y border-[#1E0A35]">
          <div className="max-w-[800px] mx-auto bg-[#130224] border border-[#06B6D4]/30 rounded-[24px] p-[48px] text-center shadow-[0_0_50px_rgba(6,182,212,0.1)]">
            <MessageSquare size={48} className="text-[#06B6D4] mx-auto mb-[24px]" strokeWidth={1} />
            <h2 className="font-display font-bold text-[28px] text-[#F5F3FF] mb-[16px]">Experience the logic right down here!</h2>
            <p className="font-sans font-normal text-[16px] text-[#A8A0C0] mb-[32px] max-w-[400px] mx-auto">
              Open the unified support module loaded in the bottom right corner of this very screen right now.
            </p>
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
                { q: "How long does it take for the AI to learn?", a: "Instantly. Once your files are successfully uploaded into the Trinetra processing array, they are vectorized within seconds natively." },
                { q: "Is there any complicated code to install?", a: "No absolute technical knowledge is required. You get one standard line of HTML mapping script that you paste into your site." },
                { q: "Can we track what customers are asking?", a: "Yes. Our ROI dashboard logs exactly what metrics the audience is continuously inquiring allowing you to dynamically tune your general website copy based natively on explicit market analytics." },
                { q: "What integrations do you natively support?", a: "We push active lead routing straight across to standard CRMs or simply fire direct mapping events universally updating any Slack channel or simple notification Email flow." },
                { q: "Can we style the chat widget natively?", a: "Yes. Core accent colors natively map back into your centralized company branding seamlessly aligning physically over standard CSS overlays." }
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
            Ready to activate your AI Chat Agent?
          </h2>
          <Link href="/contact" className="px-[40px] py-[20px] bg-[#FBBF24] text-[#080010] font-sans font-bold text-[18px] rounded-full shadow-[0_0_40px_rgba(251,191,36,0.25)] hover:bg-[#F59E0B] hover:-translate-y-1 transition-all">
            Get Started Now
          </Link>
        </section>

      </div>
    </Layout>
  );
}
