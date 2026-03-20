"use client";

import { Layout } from "@/components/layout/Layout";
import { motion } from "framer-motion";
import Link from "next/link";
import { Phone, Check, X, Clock, Brain, Ear, Play, Loader2, PhoneOff } from "lucide-react";
import { useVapi } from "@/hooks/use-vapi";

export default function VoiceAgentPage() {
  const { toggleCall, isConnecting, isConnected } = useVapi();

  return (
    <Layout>
      <div className="flex flex-col bg-[#080010] min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 800px 500px at top center, rgba(139,92,246,0.1) 0%, transparent 70%)' }} />

        {/* SECTION 1: PRODUCT HERO */}
        <section className="relative z-10 w-full pt-[140px] pb-[80px] px-[20px] flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-[8px] bg-[rgba(16,185,129,0.1)] text-[#10B981] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[24px]">
             <span className="w-[6px] h-[6px] rounded-full bg-[#10B981] animate-pulse" /> Live
          </div>
          <div className="w-[64px] h-[64px] rounded-[16px] bg-[#130224] border border-[#2D1255] flex items-center justify-center mb-[24px] shadow-[0_0_30px_rgba(139,92,246,0.3)]">
            <Phone size={32} className="text-[#A78BFA]" />
          </div>
          <h1 className="font-display font-bold text-[40px] md:text-[52px] text-[#F5F3FF] tracking-[-0.02em] leading-tight mb-[24px]">
            AI Voice Agent
          </h1>
          <p className="font-sans font-normal text-[16px] md:text-[18px] text-[#A8A0C0] max-w-[560px] leading-relaxed mb-[40px]">
            Your AI receptionist that answers calls, books appointments, and handles inquiries — in Hindi and English. 24 hours a day. 365 days a year.
          </p>
          <div className="flex flex-col sm:flex-row gap-[16px] w-full sm:w-auto">
            <button onClick={toggleCall} className="px-[32px] py-[16px] bg-[#FBBF24] text-[#080010] font-sans font-semibold text-[16px] rounded-full shadow-[0_0_30px_rgba(251,191,36,0.2)] hover:bg-[#F59E0B] hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
              {isConnecting ? <><Loader2 size={18} className="animate-spin" /> Connecting...</> : isConnected ? <><PhoneOff size={18} /> End Call</> : "Talk to Sales AI →"}
            </button>
            <button onClick={toggleCall} className="px-[32px] py-[16px] border border-[#2D1255] bg-[rgba(19,2,36,0.5)] text-[#A78BFA] font-sans font-medium text-[16px] rounded-full hover:bg-[#2D1255] hover:text-[#F5F3FF] hover:-translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer">
              {isConnected ? "Agent Active" : "Test Live Voice"} <Play size={16} fill="currentColor" />
            </button>
          </div>
        </section>

        {/* SECTION 2: PROBLEM -> SOLUTION */}
        <section className="relative z-10 w-full py-[80px] px-[20px]">
          <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-[24px]">
            <div className="bg-[#0C0118] border border-[rgba(239,68,68,0.15)] rounded-[20px] p-[40px] relative">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[150px] leading-none text-[#EF4444] opacity-[0.03] select-none pointer-events-none font-bold">✗</div>
               <h3 className="font-display font-semibold text-[20px] text-[#EF4444] mb-[24px]">Without AI Voice Agent</h3>
               <div className="flex flex-col gap-[16px]">
                 {[
                   "Missed calls during lunch breaks and after hours",
                   "Customers waiting on hold for 5+ minutes",
                   "Receptionist can only handle 1 call at a time",
                   "₹15,000+/month salary for basic phone handling"
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
                   "Every call answered within 2 seconds, always",
                   "Zero hold time — AI picks up instantly",
                   "Handles 100+ simultaneous calls",
                   "Starts at ₹2 per interaction"
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
              { icon: Ear, title: "Natural Hindi + English", desc: "Switches between languages mid-conversation. Callers genuinely can't tell it's AI." },
              { icon: Clock, title: "Smart Appointment Booking", desc: "Checks real-time availability, books slots, sends confirmations. Integrated with Google Calendar." },
              { icon: Brain, title: "Intelligent Escalation", desc: "Knows exactly when to transfer to a human. Never leaves a customer stranded." }
            ].map((Feature, i) => (
              <div key={i} className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px] relative overflow-hidden group hover:border-[#8B5CF6]/50 transition-colors">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#8B5CF6] to-[#FBBF24] opacity-50" />
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
                { step: "1", title: "Share Your Business Info", desc: "Tell us about your services, hours, pricing, FAQs. We train the AI on everything." },
                { step: "2", title: "We Build Your Agent", desc: "Custom voice, personality, and conversation flows designed for your business. Ready in under 24 hours." },
                { step: "3", title: "Go Live", desc: "Connect to your existing business number. The AI starts handling calls immediately. Monitor everything from your dashboard." }
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

        {/* SECTION 5: USE CASES BY INDUSTRY */}
        <section className="relative z-10 w-full py-[100px] px-[20px]">
          <div className="max-w-[1200px] mx-auto flex flex-col items-center text-center">
            <div className="inline-block bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.15)] text-[#A78BFA] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[24px]">
              ✦ Built For
            </div>
            <h2 className="font-display font-bold text-[32px] text-[#F5F3FF] mb-[48px]">Use Cases by Industry</h2>
            
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-[24px] text-left">
              {[
                { icon: "🏥", name: "Healthcare", desc: "Patient calls: appointments, prescription refills, clinic hours, doctor availability" },
                { icon: "🍽️", name: "Restaurants", desc: "Reservations, menu inquiries, delivery status, operating hours" },
                { icon: "🏠", name: "Real Estate", desc: "Property inquiries, site visit scheduling, price and availability" },
                { icon: "💇", name: "Salons & Spas", desc: "Appointment booking, service pricing, stylist availability, cancellations" },
                { icon: "🏋️", name: "Gyms & Studios", desc: "Class schedules, membership inquiries, trainer booking" },
                { icon: "🏢", name: "Professional Services", desc: "Consultation booking, service explanations, lead qualification" }
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
          <div className="max-w-[800px] mx-auto bg-[#130224] border border-[#8B5CF6]/30 rounded-[24px] p-[48px] text-center shadow-[0_0_50px_rgba(139,92,246,0.1)]">
            <Phone size={48} className="text-[#8B5CF6] mx-auto mb-[24px]" strokeWidth={1} />
            <h2 className="font-display font-bold text-[28px] text-[#F5F3FF] mb-[16px]">Want to test it out?</h2>
            <p className="font-sans font-normal text-[16px] text-[#A8A0C0] mb-[32px] max-w-[400px] mx-auto">
              Call our live demo agent right now to experience the latency and natural language capability firsthand.
            </p>
            <div className="inline-flex flex-col items-center">
              <button onClick={toggleCall} className="text-[24px] font-display font-bold text-[#080010] bg-[#FBBF24] px-[32px] py-[16px] rounded-full shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:bg-[#F59E0B] hover:-translate-y-[2px] transition-all mb-[16px] flex items-center gap-[12px]">
                {isConnecting ? <Loader2 size={24} className="animate-spin" /> : isConnected ? <PhoneOff size={24} /> : <Phone size={24} fill="currentColor" />}
                {isConnecting ? "Connecting to Agent..." : isConnected ? "Disconnect Call" : "Call the AI Agent Now"}
              </button>
              <span className="font-sans text-[13px] text-[#6B6088] px-[16px] py-[4px] bg-[rgba(255,255,255,0.05)] rounded-[6px]">Works 24/7</span>
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
                { q: "How natural does the AI voice sound?", a: "Extremely natural. We use advanced neural voice synthesis. In blind tests, 87% of callers couldn't distinguish our AI from a human receptionist." },
                { q: "Can it handle angry or confused callers?", a: "Yes. The AI is trained to remain calm, empathetic, and solution-oriented. If a situation requires human intervention, it escalates immediately." },
                { q: "What happens if the AI can't answer something?", a: "It gracefully acknowledges the limitation and offers to connect the caller with a human team member or take a message for callback." },
                { q: "Can I use my existing business phone number?", a: "Absolutely. We integrate with your existing number. No need to change anything your customers already know." },
                { q: "How quickly can I set it up?", a: "Most businesses are live within 24 hours. Complex setups with multiple departments may take 48 hours." },
                { q: "What if I want to change what the AI says?", a: "You get a dashboard where you can update your business info, FAQs, and conversation guidelines anytime. Changes reflect within minutes." }
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
            Ready to activate your AI Voice Agent?
          </h2>
          <button onClick={toggleCall} className="px-[40px] py-[20px] bg-[#FBBF24] text-[#080010] font-sans font-bold text-[18px] rounded-full shadow-[0_0_40px_rgba(251,191,36,0.25)] hover:bg-[#F59E0B] hover:-translate-y-1 transition-all flex items-center gap-[12px]">
            {isConnecting ? <><Loader2 size={20} className="animate-spin"/> Initializing Voice...</> : isConnected ? <><PhoneOff size={20} /> End Current Session</> : "Schedule via AI Agent"}
          </button>
        </section>

      </div>
    </Layout>
  );
}
