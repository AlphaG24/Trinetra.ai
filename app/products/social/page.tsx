"use client";

import { Layout } from "@/components/layout/Layout";
import { SocialAgentGallery } from "@/components/social/SocialAgentGallery";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, CalendarDays, Image as ImageIcon, TrendingUp } from "lucide-react";

export default function SocialAgentPage() {
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
              <div className="inline-flex items-center gap-[8px] bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.15)] text-[#F59E0B] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[24px]">
                <span className="w-[6px] h-[6px] rounded-full bg-[#F59E0B]" /> Beta Access
              </div>
              <h1 className="font-display font-bold text-[44px] md:text-[56px] text-[#F5F3FF] tracking-[-0.02em] leading-tight mb-[24px]">
                Automate Content. <br />
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)' }}>
                  AI Social Agent.
                </span>
              </h1>
              <p className="font-sans font-normal text-[18px] text-[#A8A0C0] max-w-[500px] leading-[1.6] mb-[40px]">
                Generate, schedule, and distribute content seamlessly across multiple channels. Our AI writes captions, suggests tags, and posts consistently.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-[16px] w-full max-w-[400px] sm:max-w-none">
                <Link 
                  href="/contact"
                  className="w-full sm:w-auto px-[32px] py-[15px] bg-[#F59E0B] text-[#080010] font-sans font-semibold text-[16px] rounded-[12px] transition-all duration-300 shadow-[0_0_30px_rgba(245,158,11,0.25)] hover:bg-[#D97706] hover:-translate-y-[2px] flex items-center justify-center gap-2"
                >
                  Join the Beta ⚡
                </Link>
                <Link 
                  href="/contact?plan=growth"
                  className="w-full sm:w-auto px-[32px] py-[15px] rounded-[12px] border border-[#2D1255] text-[#F5F3FF] font-sans font-medium text-[16px] flex items-center justify-center hover:border-[#F59E0B] hover:text-[#FBBF24] transition-all duration-300"
                >
                  Sales Contact
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
              <SocialAgentGallery />
            </motion.div>

          </div>
        </section>

        {/* FEATURES GRID */}
        <section className="w-full bg-[#0C0118] py-[100px] border-y border-[#1E0A35]">
          <div className="max-w-[1280px] mx-auto px-[20px] md:px-[60px]">
            <h2 className="font-display font-bold text-[32px] md:text-[40px] text-[#F5F3FF] text-center mb-[60px]">
              Why Choose the Social Agent?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[30px]">
              <div className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px]">
                <ImageIcon className="text-[#F59E0B] mb-[20px]" size={32} />
                <h3 className="text-[#F5F3FF] font-semibold text-[20px] mb-[12px]">Intelligent Captioning</h3>
                <p className="text-[#A8A0C0] text-[15px] leading-relaxed">It analyzes your specific brand voice styling generating high-converting captions directly mapped to specific formats natively.</p>
              </div>
              <div className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px]">
                <CalendarDays className="text-[#F59E0B] mb-[20px]" size={32} />
                <h3 className="text-[#F5F3FF] font-semibold text-[20px] mb-[12px]">Auto-Queuing</h3>
                <p className="text-[#A8A0C0] text-[15px] leading-relaxed">Simply drop your content directly into a single folder and the AI spaces it out perfectly optimizing directly for peak follower engagement.</p>
              </div>
              <div className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px]">
                <TrendingUp className="text-[#F59E0B] mb-[20px]" size={32} />
                <h3 className="text-[#F5F3FF] font-semibold text-[20px] mb-[12px]">Analytics Feedback</h3>
                <p className="text-[#A8A0C0] text-[15px] leading-relaxed">It monitors post performance consistently, reporting back and self-adjusting hashtags organically over long durations completely autonomously.</p>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="w-full text-center py-[100px] px-[20px]">
          <h2 className="font-display font-bold text-[32px] text-[#F5F3FF] mb-[24px]">Boost your engagement.</h2>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-[#F59E0B] text-[#080010] px-[32px] py-[16px] rounded-full font-semibold hover:bg-[#D97706] transition-colors shadow-lg">
            Apply to Beta <ArrowRight size={18} />
          </Link>
        </section>

      </div>
    </Layout>
  );
}
