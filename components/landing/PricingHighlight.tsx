"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

const AnimatedNumber = ({ value, prefix = "", suffix = "", decimals = 0 }: { value: number, prefix?: string, suffix?: string, decimals?: number }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTime: number;
    const duration = 1500; // 1.5 seconds
    const startValue = 0;
    
    // Using requestAnimationFrame for smooth counting
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Use ease-out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCurrent(startValue + easeOut * (value - startValue));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span>{prefix}{current.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}{suffix}</span>
  );
};

export function PricingHighlight() {
  const [inView, setInView] = useState(false);

  return (
    <section className="w-full py-[80px] text-center relative overflow-hidden bg-[#080010]">
      {/* Background Radial Atmosphere */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 800px 500px at center, rgba(251,191,36,0.04) 0%, transparent 70%)'
        }}
      />
      
      <div className="relative z-10 max-w-[1280px] mx-auto px-[20px] flex flex-col items-center">
        
        {/* Line 1: The big number */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          onViewportEnter={() => setInView(true)}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="font-display font-bold text-[80px] md:text-[120px] text-[#FBBF24] leading-none"
          style={{ letterSpacing: "-0.02em", textShadow: "0 0 60px rgba(251,191,36,0.3)" }}
        >
          {inView ? <AnimatedNumber prefix="₹" value={2} /> : "₹0"}
        </motion.div>

        {/* Line 2 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display font-medium text-[20px] md:text-[28px] text-[#F5F3FF] mt-[8px]"
        >
          AI agents from ₹2 per interaction.
        </motion.div>

        {/* Line 3 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-sans font-normal text-[14px] text-[#6B6088] mt-[16px]"
        >
          Chat from ₹2. Voice from ₹10/min. Social from ₹15/post.
        </motion.div>

        {/* Line 4 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="font-sans font-medium text-[15px] text-[#A8A0C0] mt-[32px]"
        >
          Your receptionist: <span className="line-through text-[#EF4444]">₹15,000/month</span>. Our AI: <span className="text-[#FBBF24]">₹2/call</span>.
        </motion.div>

        {/* Line 5: CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-[32px]"
        >
          <Link
            href="/contact?plan=starter"
            className="inline-flex items-center justify-center px-[32px] py-[15px] bg-[#F59E0B] text-[#080010] font-sans font-semibold text-[16px] rounded-[100px] transition-all duration-300 shadow-[0_0_30px_rgba(245,158,11,0.25)] hover:bg-[#D97706] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:-translate-y-[2px] group"
          >
            Start Saving Now <span className="ml-[8px] font-black transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </motion.div>

      </div>
    </section>
  );
}
