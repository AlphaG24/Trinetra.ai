"use client";

import { Layout } from "@/components/layout/Layout";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Bot, Workflow, Database, Zap, GitCommit, Mail, Briefcase, Split, Network } from "lucide-react";

export default function WorkflowAgentPage() {
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
              <div className="inline-flex items-center gap-[8px] bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.15)] text-[#A78BFA] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[24px]">
                <span className="w-[6px] h-[6px] rounded-full bg-[#A78BFA] animate-pulse" /> B2B Infrastructure
              </div>
              <h1 className="font-display font-bold text-[44px] md:text-[56px] text-[#F5F3FF] tracking-[-0.02em] leading-tight mb-[24px]">
                Automate Everything. <br />
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #10B981 0%, #8B5CF6 100%)' }}>
                  AI Workflow Agent.
                </span>
              </h1>
              <p className="font-sans font-normal text-[18px] text-[#A8A0C0] max-w-[500px] leading-[1.6] mb-[40px]">
                Connect multiple tools together to automate multi-step business processes natively. Data extraction, intelligent routing, and pipeline reporting done autonomously.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-[16px] w-full max-w-[400px] sm:max-w-none">
                <Link 
                  href="/contact?plan=enterprise"
                  className="w-full sm:w-auto px-[32px] py-[15px] bg-[#8B5CF6] text-white font-sans font-semibold text-[16px] rounded-[12px] transition-all duration-300 shadow-[0_0_30px_rgba(139,92,246,0.25)] hover:bg-[#7C3AED] hover:-translate-y-[2px] flex items-center justify-center gap-2"
                >
                  Schedule Solution 💻
                </Link>
                <Link 
                  href="/contact"
                  className="w-full sm:w-auto px-[32px] py-[15px] rounded-[12px] border border-[#2D1255] text-[#F5F3FF] font-sans font-medium text-[16px] flex items-center justify-center hover:border-[#8B5CF6] hover:text-[#A78BFA] transition-all duration-300"
                >
                  Contact Sales
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
              <div className="w-full max-w-[400px] mx-auto bg-[#130224] border border-[#1E0A35] rounded-[20px] shadow-[0_20px_60px_rgba(139,92,246,0.1)] overflow-hidden flex flex-col relative p-[24px]">
                <div className="flex items-center justify-between border-b border-[#2D1255] pb-[16px] mb-[20px]">
                  <div className="flex items-center gap-[10px]">
                    <div className="w-[36px] h-[36px] rounded-[10px] bg-[#8B5CF6]/20 flex items-center justify-center text-[#A78BFA]">
                      <Workflow size={20} />
                    </div>
                    <div>
                      <div className="text-[#F5F3FF] font-medium text-[15px]">Lead Pipeline</div>
                      <div className="text-[#10B981] text-[12px] flex items-center gap-[4px] mt-[2px]">
                        <div className="w-[6px] h-[6px] rounded-full bg-[#10B981] animate-pulse" /> Live Now
                      </div>
                    </div>
                  </div>
                  <button className="bg-[#2D1255] text-[#A8A0C0] px-[12px] py-[6px] rounded-[6px] text-[12px] flex items-center gap-[6px] font-sans">
                    <Zap size={14} className="text-[#F59E0B]" /> Running
                  </button>
                </div>

                <div className="flex flex-col gap-[16px] relative z-10 w-full pl-[8px]">
                  <div className="flex items-center gap-[16px] bg-[#1A0530] p-[14px] rounded-[12px] border border-[#2D1255] relative overflow-hidden shadow-sm">
                    <div className="w-[4px] h-full bg-[#8B5CF6] absolute left-0 top-0" />
                    <Mail size={22} className="text-[#A78BFA] shrink-0 ml-[4px]" />
                    <div className="flex-1 truncate">
                      <div className="text-[#F5F3FF] font-medium text-[14px] truncate">1. Read Incoming App</div>
                      <div className="text-[#6B6088] text-[13px] truncate">Triggered on lead@...</div>
                    </div>
                  </div>

                  <div className="w-[2px] h-[16px] bg-[#2D1255] ml-[36px] relative opacity-50" />

                  <div className="flex items-center gap-[16px] bg-[#1A0530] p-[14px] rounded-[12px] border border-[#8B5CF6]/40 relative overflow-hidden shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                    <div className="w-[4px] h-full bg-gradient-to-b from-[#8B5CF6] to-[#FBBF24] absolute left-0 top-0" />
                    <Bot size={22} className="text-[#FBBF24] shrink-0 ml-[4px]" />
                    <div className="flex-1 truncate">
                      <div className="text-[#F5F3FF] font-medium text-[14px] truncate">2. AI Parsing Node</div>
                      <div className="text-[#A8A0C0] text-[13px] truncate">Extracting User Budget</div>
                    </div>
                  </div>

                  <div className="w-[2px] h-[16px] bg-[#2D1255] ml-[36px] relative opacity-50">
                    <GitCommit size={14} className="text-[#A8A0C0] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#130224] rounded-full p-[1px]" />
                  </div>

                  <div className="flex items-center gap-[16px] bg-[#1A0530] p-[14px] rounded-[12px] border border-[#2D1255] relative overflow-hidden shadow-sm">
                    <div className="w-[4px] h-full bg-[#10B981] absolute left-0 top-0" />
                    <Database size={22} className="text-[#10B981] shrink-0 ml-[4px]" />
                    <div className="flex-1 truncate">
                      <div className="text-[#F5F3FF] font-medium text-[14px] truncate">3. SQL Insert Match</div>
                      <div className="text-[#6B6088] text-[13px] truncate">Commit row to Database</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </section>

        {/* FEATURES GRID */}
        <section className="w-full bg-[#0C0118] py-[100px] border-y border-[#1E0A35]">
          <div className="max-w-[1280px] mx-auto px-[20px] md:px-[60px]">
            <h2 className="font-display font-bold text-[32px] md:text-[40px] text-[#F5F3FF] text-center mb-[60px]">
              Why Choose the Workflow Agent?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[30px]">
              <div className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px]">
                <Network className="text-[#8B5CF6] mb-[20px]" size={32} />
                <h3 className="text-[#F5F3FF] font-semibold text-[20px] mb-[12px]">API Native</h3>
                <p className="text-[#A8A0C0] text-[15px] leading-relaxed">It talks directly to existing databases securely fetching and posting data bridging isolated internal silos automatically.</p>
              </div>
              <div className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px]">
                <Split className="text-[#8B5CF6] mb-[20px]" size={32} />
                <h3 className="text-[#F5F3FF] font-semibold text-[20px] mb-[12px]">Smart Branching</h3>
                <p className="text-[#A8A0C0] text-[15px] leading-relaxed">Allows intelligent pipeline routing logic natively. If lead budget is high, push to Slack. If low, push to email nurturing sequence.</p>
              </div>
              <div className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px]">
                <Briefcase className="text-[#8B5CF6] mb-[20px]" size={32} />
                <h3 className="text-[#F5F3FF] font-semibold text-[20px] mb-[12px]">Strict Logging</h3>
                <p className="text-[#A8A0C0] text-[15px] leading-relaxed">Maintains meticulous real-time logs parsing out individual failures explicitly while attempting 5x error retries locally.</p>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="w-full text-center py-[100px] px-[20px]">
          <h2 className="font-display font-bold text-[32px] text-[#F5F3FF] mb-[24px]">Link and scale infrastructure</h2>
          <Link href="/contact?plan=enterprise" className="inline-flex items-center gap-2 bg-[#8B5CF6] text-white px-[32px] py-[16px] rounded-full font-semibold hover:bg-[#7C3AED] transition-colors shadow-lg">
            Schedule a Demo <ArrowRight size={18} />
          </Link>
        </section>

      </div>
    </Layout>
  );
}
