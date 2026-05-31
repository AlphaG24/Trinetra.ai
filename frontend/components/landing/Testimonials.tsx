"use client";

import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

// Set to empty array to trigger the "Coming Soon" state.
// When real testimonials are added, the grid will automatically render.
const testimonials: Array<any> = [];

export function Testimonials() {
  return (
    <section className="w-full relative py-[100px] bg-[#080010] overflow-hidden">
      {/* Subtle radial gradient background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(139,92,246,0.03) 0%, transparent 60%)'
        }}
      />

      <div className="relative z-10 w-full flex flex-col items-center">
        
        {/* HEADER */}
        <div className="flex flex-col items-center text-center mb-[56px] px-[20px] md:px-[40px] lg:px-[80px]">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-block bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.15)] text-[#D7C4F7] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[20px]"
          >
            ✦ Client Stories
          </motion.div>

          {/* Heading */}
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-bold text-[32px] md:text-[42px] text-[#FAF7FF] tracking-[-0.02em] leading-tight"
          >
            Real Results. Real Businesses.
          </motion.h2>
        </div>

        {testimonials.length > 0 ? (
          <>
            {/* HORIZONTAL SCROLLING ROW */}
            <div className="w-full overflow-x-auto snap-x snap-mandatory flex gap-[24px] px-[20px] md:px-[40px] lg:px-[80px] scroll-pl-[20px] md:scroll-pl-[40px] lg:scroll-pl-[80px] pb-[40px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {testimonials.map((t, idx) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 * idx }}
                  className="w-[85vw] md:w-[380px] shrink-0 bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px] snap-start flex flex-col relative"
                >
                  <div className="absolute top-[20px] left-[24px] leading-none select-none pointer-events-none" style={{ fontFamily: 'Georgia, serif', fontSize: '56px', color: 'rgba(139,92,246,0.15)' }}>"</div>
                  <div className="flex gap-[2px] text-[16px] mb-[20px] leading-none relative z-10">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={i < t.stars ? "text-[#FBBF24]" : "text-[#6B6088]"}>{i < t.stars ? "★" : "☆"}</span>
                    ))}
                  </div>
                  <p className="font-sans font-normal text-[15px] text-[#B8B0D1] leading-[1.7] relative z-10 flex-grow">{t.quote}</p>
                  <div className="flex items-center gap-[14px] mt-[24px] relative z-10">
                    <div className="w-[48px] h-[48px] rounded-full shrink-0" style={{ background: t.avatarBg, boxShadow: t.avatarShadow, border: '2px solid rgba(255,255,255,0.1)' }} />
                    <div className="flex flex-col">
                      <div className="font-sans font-semibold text-[15px] text-[#FAF7FF] leading-tight mb-[2px]">{t.name}</div>
                      <div className="font-sans font-normal text-[13px] text-[#6B6088] leading-tight mb-[6px]">{t.role} &bull; {t.location}</div>
                      <div className="font-sans font-normal text-[11px] text-[#10B981] flex items-center gap-[4px] leading-none">✓ Verified Client</div>
                    </div>
                  </div>
                </motion.div>
              ))}
              <div className="w-[1px] md:w-[40px] lg:w-[80px] shrink-0" />
            </div>

            <div className="text-center mt-[12px] px-[20px]">
              <p className="font-sans font-normal italic text-[12px] text-[#6B6088]">
                These are results from our pilot program. Individual results may vary.
              </p>
            </div>
          </>
        ) : (
          /* COMING SOON STATE */
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-[600px] mx-auto bg-[#130224] border border-[#1E0A35] rounded-[16px] px-[20px] py-[48px] text-center flex flex-col items-center"
          >
            <MessageSquare size={32} className="text-[#8B5CF6] mb-[16px]" />
            <h3 className="font-display font-semibold text-[20px] text-[#FAF7FF]">
              We're onboarding our first clients now.
            </h3>
            <p className="font-sans font-normal text-[15px] text-[#B8B0D1] mt-[12px] max-w-[420px] leading-relaxed">
              Real testimonials from real businesses will appear here soon. We believe in showing genuine results, not manufactured praise.
            </p>
            <p className="font-sans font-medium text-[14px] text-[#D7C4F7] mt-[24px]">
              Want to be our first featured client?
            </p>
            <Link 
              href="/contact" 
              className="mt-[12px] inline-flex items-center justify-center px-[24px] py-[10px] bg-[#8B5CF6] text-white font-sans font-medium text-[14px] rounded-full transition-colors hover:bg-[#7C3AED]"
            >
              Get Early Access →
            </Link>
          </motion.div>
        )}

      </div>
    </section>
  );
}
