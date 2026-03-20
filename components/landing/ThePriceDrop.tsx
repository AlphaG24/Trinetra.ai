"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";

// Reusable Animated Number Hook
const AnimatedNumber = ({ value, prefix = "", suffix = "", decimals = 0, duration = 1500 }: { value: number, prefix?: string, suffix?: string, decimals?: number, duration?: number }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTime: number;
    const startValue = 0;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCurrent(startValue + easeOut * (value - startValue));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span>{prefix}{current.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}{suffix}</span>
  );
};

export function ThePriceDrop() {
  const [inView, setInView] = useState(false);

  return (
    <section className="w-full bg-[#080010] py-[100px] relative overflow-hidden">
      <div className="relative z-10 max-w-[1100px] mx-auto px-[20px] md:px-[40px] flex flex-col items-center">
        
        {/* HEADER */}
        <div className="flex flex-col items-center text-center mb-[56px] w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-mono font-normal text-[13px] text-[#8B5CF6] tracking-[0.15em] uppercase mb-[16px]"
          >
            ✦ The Real Cost
          </motion.div>

          {/* Heading with Strike Animation */}
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-bold text-[32px] md:text-[44px] text-[#F5F3FF] tracking-[-0.02em] leading-tight flex flex-wrap justify-center items-center gap-[10px]"
          >
            Stop 
            <span className="relative text-[#EF4444] inline-block">
              Overpaying
              <motion.div 
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
                className="absolute top-1/2 left-[-5%] right-[-5%] h-[4px] bg-[#F5F3FF] origin-left rounded-full z-10 opacity-90"
              />
            </span> 
            for Basics.
          </motion.h2>
        </div>

        {/* COMPARISON CARDS */}
        <motion.div 
          onViewportEnter={() => setInView(true)}
          viewport={{ once: true, margin: "-100px" }}
          className="w-full flex flex-col md:flex-row items-stretch justify-center gap-[24px]"
        >
          {/* LEFT CARD: THE OLD WAY */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex-1 bg-[#0C0118] border border-[rgba(239,68,68,0.15)] rounded-[20px] p-[24px] md:p-[40px] relative overflow-hidden flex flex-col"
          >
            {/* Watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[200px] leading-none text-[#EF4444] opacity-[0.03] select-none pointer-events-none font-bold">
              ✗
            </div>
            
            <div className="relative z-10 w-full flex flex-col">
              <div className="inline-block self-start bg-[rgba(239,68,68,0.1)] text-[#EF4444] font-sans font-medium text-[12px] px-[12px] py-[4px] rounded-[100px] mb-[20px]">
                Traditional
              </div>

              <h3 className="font-display font-semibold text-[24px] text-[#F5F3FF] leading-tight mb-[20px]">
                Human Receptionist
              </h3>

              <div className="flex items-end gap-[8px] mb-[32px] pb-[32px] border-b border-[rgba(255,255,255,0.03)] relative">
                <span className="relative font-display font-bold text-[48px] text-[#EF4444] leading-none inline-block">
                  ₹15,000
                  {/* Strikethrough Animation triggered sequentially */}
                  <motion.div 
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: inView ? 1 : 0 }}
                    transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                    className="absolute top-1/2 left-[-5%] right-[-5%] h-[3px] bg-[#6B6088] origin-left rounded-full z-10"
                  />
                </span>
                <span className="font-sans font-normal text-[14px] text-[#6B6088] pb-[6px]">
                  /month salary
                </span>
              </div>

              <div className="flex flex-col gap-[0px]">
                {[
                  "⏰ Works 8 hours/day",
                  "🗣️ 1 language only",
                  "😷 Takes sick leaves",
                  "📚 Needs training",
                  "😤 Mood affects service",
                  "📱 Handles 1 call at a time"
                ].map((item, i) => (
                  <div key={i} className="font-sans font-normal text-[15px] text-[#6B6088] py-[10px] border-b border-[rgba(255,255,255,0.03)] last:border-0 flex items-center">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>


          {/* RIGHT CARD: THE TRINETRA WAY */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex-1 rounded-[20px] p-[24px] md:p-[40px] relative flex flex-col"
            style={{
              background: 'linear-gradient(180deg, rgba(139,92,246,0.08) 0%, #0C0118 100%)',
              border: '1px solid rgba(139,92,246,0.2)',
              boxShadow: '0 0 60px rgba(139,92,246,0.06)'
            }}
          >
            {/* Border glow pulse */}
            <motion.div 
              className="absolute inset-0 rounded-[20px] border border-[#8B5CF6] pointer-events-none z-0"
              animate={{ opacity: [0.15, 0.25, 0.15] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative z-10 w-full flex flex-col">
              <div className="inline-block self-start bg-[rgba(139,92,246,0.15)] text-[#A78BFA] font-sans font-medium text-[12px] px-[12px] py-[4px] rounded-[100px] mb-[20px]">
                AI-Powered
              </div>

              <h3 className="font-display font-semibold text-[24px] text-[#F5F3FF] leading-tight mb-[20px]">
                Trinetra AI Agent
              </h3>

              <div className="flex items-end gap-[8px] mb-[32px] pb-[32px] border-b border-[rgba(139,92,246,0.06)]">
                <span className="font-display font-bold text-[48px] text-[#FBBF24] leading-none inline-block drop-shadow-[0_0_30px_rgba(251,191,36,0.3)] min-w-[60px]">
                  {inView ? <AnimatedNumber prefix="₹" value={2} duration={1500} /> : "₹0"}
                </span>
                <span className="font-sans font-normal text-[14px] text-[#A8A0C0] pb-[6px]">
                  /per interaction
                </span>
              </div>

              <div className="flex flex-col gap-[0px]">
                {[
                  "⚡ Works 24/7/365",
                  "🌐 Hindi + English + more",
                  "🛡️ Never takes a day off",
                  "🧠 Pre-trained on your business",
                  "😊 Always polite, always consistent",
                  "📞 Handles 100 calls simultaneously"
                ].map((item, i) => (
                  <div key={i} className="font-sans font-normal text-[15px] text-[#F5F3FF] py-[10px] border-b border-[rgba(139,92,246,0.06)] last:border-0 flex items-center justify-between">
                    <span>{item}</span>
                    <Check size={16} className="text-[#10B981] ml-[10px]" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* BOTTOM SAVINGS LINE */}
        <div className="mt-[56px] flex flex-col items-center justify-center text-center">
          <p className="font-sans font-normal text-[15px] text-[#6B6088] mb-[8px]">
            At 100 calls/month, you save approximately
          </p>

          <span className="font-display font-bold text-[36px] text-[#10B981] leading-none mb-[8px] drop-shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            {inView ? <AnimatedNumber prefix="₹" value={14800} duration={2000} /> : "₹0"}
          </span>

          <p className="font-sans font-normal text-[15px] text-[#6B6088] mb-[32px]">
            every single month.
          </p>

          <Link
            href="/contact?plan=starter"
            className="inline-flex items-center justify-center px-[32px] py-[15px] bg-[#F59E0B] text-[#080010] font-sans font-semibold text-[16px] rounded-full transition-all duration-300 shadow-[0_0_30px_rgba(245,158,11,0.25)] hover:bg-[#D97706] hover:-translate-y-[2px] group"
          >
            See Your Savings <span className="ml-[8px] font-black transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>

      </div>
    </section>
  );
}
