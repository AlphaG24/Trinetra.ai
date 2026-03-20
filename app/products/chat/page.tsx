"use client";

import { Layout } from "@/components/layout/Layout";
import { motion } from "framer-motion";
import Link from "next/link";
import { Check, ArrowRight, Bot, Clock, Sparkles, MessageCircle } from "lucide-react";

export default function ChatAgentPage() {
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
                Convert Traffic. <br />
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)' }}>
                  AI Chat Agent.
                </span>
              </h1>
              <p className="font-sans font-normal text-[18px] text-[#A8A0C0] max-w-[500px] leading-[1.6] mb-[40px]">
                Embed an intelligent chatbot on your website that understands your business natively, captures specific leads, and answers deep customer support queries 24/7.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-[16px] w-full max-w-[400px] sm:max-w-none">
                <Link 
                  href="/contact"
                  className="w-full sm:w-auto px-[32px] py-[15px] bg-[#10B981] text-[#080010] font-sans font-semibold text-[16px] rounded-[12px] transition-all duration-300 shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:bg-[#059669] hover:-translate-y-[2px] flex items-center justify-center gap-2"
                >
                  Schedule Demo 💻
                </Link>
                <Link 
                  href="/contact?plan=starter"
                  className="w-full sm:w-auto px-[32px] py-[15px] rounded-[12px] border border-[#2D1255] text-[#F5F3FF] font-sans font-medium text-[16px] flex items-center justify-center hover:border-[#10B981] hover:text-[#34D399] transition-all duration-300"
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
              <div className="w-full max-w-[420px] mx-auto bg-[#130224] border border-[#1E0A35] rounded-[20px] shadow-[0_20px_60px_rgba(16,185,129,0.1)] overflow-hidden flex flex-col">
                <div className="bg-[#1A0530] p-[20px] border-b border-[#1E0A35] flex items-center gap-[14px]">
                  <div className="w-[44px] h-[44px] rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                    <Bot size={24} />
                  </div>
                  <div>
                    <div className="text-[#F5F3FF] font-medium text-[16px]">Trinetra Support</div>
                    <div className="text-[#10B981] text-[13px] flex items-center gap-[6px]">
                      <span className="w-[8px] h-[8px] rounded-full bg-[#10B981] animate-pulse" /> Online actively
                    </div>
                  </div>
                </div>
                <div className="p-[24px] flex flex-col gap-[20px] min-h-[300px]">
                  <div className="self-end bg-[#10B981]/10 border border-[#10B981]/20 text-[#E5E7EB] text-[15px] py-[12px] px-[16px] rounded-[14px] rounded-tr-sm max-w-[85%]">
                    Do you integrate with Salesforce?
                  </div>
                  <div className="self-start bg-[#1E0A35] border border-[#2D1255] text-[#A8A0C0] text-[15px] py-[12px] px-[16px] rounded-[14px] rounded-tl-sm max-w-[85%] leading-relaxed">
                    Yes! We natively integrate with Salesforce instantly out of the box. Would you like to see the documentation?
                  </div>
                </div>
                <div className="p-[16px] border-t border-[#1E0A35] bg-[#10021E]">
                  <div className="w-full bg-[#080010] rounded-full py-[12px] px-[20px] text-[#6B6088] text-[14px] flex items-center justify-between border border-[#2D1255]">
                    Type a message... <Sparkles size={16} className="text-[#10B981]" />
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
              Why Choose the Chat Agent?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[30px]">
              <div className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px]">
                <Clock className="text-[#10B981] mb-[20px]" size={32} />
                <h3 className="text-[#F5F3FF] font-semibold text-[20px] mb-[12px]">Instant Resolution</h3>
                <p className="text-[#A8A0C0] text-[15px] leading-relaxed">Most customer queries can be solved immediately by our AI consulting your private knowledge base dynamically.</p>
              </div>
              <div className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px]">
                <MessageCircle className="text-[#10B981] mb-[20px]" size={32} />
                <h3 className="text-[#F5F3FF] font-semibold text-[20px] mb-[12px]">Seamless Hand-off</h3>
                <p className="text-[#A8A0C0] text-[15px] leading-relaxed">When users request an agent, the AI forwards the full chat thread into your live operator's dashboard seamlessly.</p>
              </div>
              <div className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px]">
                <Check className="text-[#10B981] mb-[20px]" size={32} />
                <h3 className="text-[#F5F3FF] font-semibold text-[20px] mb-[12px]">Automated Lead Capture</h3>
                <p className="text-[#A8A0C0] text-[15px] leading-relaxed">It qualifies visitors and captures critical contact information passing it right into your CRM without clicking any forms.</p>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="w-full text-center py-[100px] px-[20px]">
          <h2 className="font-display font-bold text-[32px] text-[#F5F3FF] mb-[24px]">Ready to capture more leads?</h2>
          <Link href="/contact?plan=growth" className="inline-flex items-center gap-2 bg-[#10B981] text-[#080010] px-[32px] py-[16px] rounded-full font-semibold hover:bg-[#059669] transition-colors shadow-lg">
            Deploy Now <ArrowRight size={18} />
          </Link>
        </section>

      </div>
    </Layout>
  );
}
