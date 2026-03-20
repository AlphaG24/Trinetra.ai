"use client";

import { Layout } from "@/components/layout/Layout";
import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Phone, ArrowRight, Bot, Mic, Clock, Shield } from "lucide-react";
import { useVapi } from "@/hooks/use-vapi";

export default function VoiceAgentPage() {
  const { toggleCall, isConnecting, isConnected } = useVapi();

  return (
    <Layout>
      <div className="flex flex-col bg-[#080010] min-h-screen pt-[140px] pb-[100px]">
        
        {/* HERO */}
        <section className="relative px-[20px] md:px-[60px] max-w-[1280px] mx-auto w-full mb-[100px]">
          <div className="flex flex-col md:flex-row gap-[60px] items-center">
            
            {/* Text Content */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              className="flex-1 flex flex-col items-start text-left"
            >
              <div className="inline-flex items-center gap-[8px] bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.15)] text-[#10B981] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[24px]">
                <span className="w-[6px] h-[6px] rounded-full bg-[#10B981] animate-pulse" /> Live Now
              </div>
              <h1 className="font-display font-bold text-[44px] md:text-[56px] text-[#F5F3FF] tracking-[-0.02em] leading-tight mb-[24px]">
                Never Miss a Call. <br />
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #A78BFA 0%, #FBBF24 100%)' }}>
                  AI Voice Agent.
                </span>
              </h1>
              <p className="font-sans font-normal text-[18px] text-[#A8A0C0] max-w-[500px] leading-[1.6] mb-[40px]">
                Deploy an autonomous human-like receptionist that answers calls instantly, books appointments directly into your calendar, and speaks natively in Hindi and English.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-[16px] w-full max-w-[400px] sm:max-w-none">
                <button 
                  onClick={toggleCall}
                  className="w-full sm:w-auto px-[32px] py-[15px] bg-[#F59E0B] text-[#080010] font-sans font-semibold text-[16px] rounded-[12px] transition-all duration-300 shadow-[0_0_30px_rgba(245,158,11,0.25)] hover:bg-[#D97706] hover:-translate-y-[2px] flex items-center justify-center gap-2"
                >
                  {isConnecting ? "Connecting..." : isConnected ? "End Call" : "Try Live Demo 📞"}
                </button>
                <Link 
                  href="/contact?plan=starter"
                  className="w-full sm:w-auto px-[32px] py-[15px] rounded-[12px] border border-[#2D1255] text-[#F5F3FF] font-sans font-medium text-[16px] flex items-center justify-center hover:border-[#8B5CF6] hover:text-[#A78BFA] transition-all duration-300"
                >
                  Get Pricing
                </Link>
              </div>
            </motion.div>

            {/* Visual Mockup */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex-1 w-full max-w-[500px]"
            >
              <div className="w-full bg-[#130224] border border-[#1E0A35] rounded-[20px] p-[40px] shadow-[0_20px_60px_rgba(139,92,246,0.1)] flex flex-col items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#8B5CF6_0%,transparent_40%)] opacity-10" />
                <div className="w-[80px] h-[80px] rounded-full bg-[#1A0530] border border-[#2D1255] flex items-center justify-center mb-[24px] shadow-[0_0_30px_rgba(139,92,246,0.2)]">
                  <Mic size={32} className="text-[#A78BFA] animate-pulse" />
                </div>
                <div className="text-[14px] text-[#A8A0C0] mb-[8px] uppercase tracking-wider font-semibold">Incoming Caller</div>
                <div className="text-[32px] font-display font-medium text-[#F5F3FF] mb-[8px]">Rahul Sharma</div>
                <div className="text-[16px] font-mono text-[#10B981] mb-[32px] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"/> 02:34 Active
                </div>
                <div className="w-full bg-[#1A0530] rounded-[16px] rounded-tl-sm p-[20px] text-[#A8A0C0] text-[15px] leading-relaxed border border-[#2D1255]">
                  "Namaste. Dr. Patel is available tomorrow at 3 PM. Shall I confirm your slot?"
                </div>
              </div>
            </motion.div>

          </div>
        </section>

        {/* FEATURES GRID */}
        <section className="w-full bg-[#0C0118] py-[100px] border-y border-[#1E0A35]">
          <div className="max-w-[1280px] mx-auto px-[20px] md:px-[60px]">
            <h2 className="font-display font-bold text-[32px] md:text-[40px] text-[#F5F3FF] text-center mb-[60px]">
              Why Choose the Voice Agent?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[30px]">
              <div className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px]">
                <Clock className="text-[#8B5CF6] mb-[20px]" size={32} />
                <h3 className="text-[#F5F3FF] font-semibold text-[20px] mb-[12px]">24/7 Availability</h3>
                <p className="text-[#A8A0C0] text-[15px] leading-relaxed">Answers 100% of calls instantly. Nights, weekends, and holidays. Never lose a lead to voicemail again.</p>
              </div>
              <div className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px]">
                <Bot className="text-[#F59E0B] mb-[20px]" size={32} />
                <h3 className="text-[#F5F3FF] font-semibold text-[20px] mb-[12px]">Multilingual Fluidity</h3>
                <p className="text-[#A8A0C0] text-[15px] leading-relaxed">Switches naturally between English and Hindi mid-sentence. Understands heavy regional accents effortlessly.</p>
              </div>
              <div className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px]">
                <Shield className="text-[#10B981] mb-[20px]" size={32} />
                <h3 className="text-[#F5F3FF] font-semibold text-[20px] mb-[12px]">Instant Escalation</h3>
                <p className="text-[#A8A0C0] text-[15px] leading-relaxed">If a caller sounds frustrated or requires a human manager, the AI seamlessly patches the call to your real team.</p>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="w-full text-center py-[100px] px-[20px]">
          <h2 className="font-display font-bold text-[32px] text-[#F5F3FF] mb-[24px]">Ready to automate your inbound lines?</h2>
          <Link href="/contact?plan=starter" className="inline-flex items-center gap-2 bg-[#8B5CF6] text-white px-[32px] py-[16px] rounded-full font-semibold hover:bg-[#7C3AED] transition-colors shadow-lg">
            Deploy Now <ArrowRight size={18} />
          </Link>
        </section>

      </div>
    </Layout>
  );
}
