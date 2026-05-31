"use client";

import { motion } from "framer-motion";

const steps = [
  {
    num: "1",
    title: "Tell Us About Your Business",
    desc: "Answer 5 quick questions about your business, services, and typical customer queries.",
    color: "#8B5CF6",
    shadow: "rgba(139,92,246,0.2)",
  },
  {
    num: "2",
    title: "We Configure Your AI Agent",
    desc: "Our team trains and configures your AI agent with your specific knowledge base in under 24 hours.",
    color: "#F59E0B",
    shadow: "rgba(245,158,11,0.2)",
  },
  {
    num: "3",
    title: "Go Live & Start Saving",
    desc: "Your AI agent goes live. Monitor performance, see ROI, and scale as you grow.",
    color: "#06B6D4",
    shadow: "rgba(6,182,212,0.2)",
  }
];

export function HowItWorks() {
  return (
    <section 
      className="relative w-full py-[100px] overflow-hidden" 
      style={{
        background: 'radial-gradient(ellipse at bottom center, rgba(139,92,246,0.05) 0%, #080010 60%)',
        backgroundColor: '#080010'
      }}
    >
      <div className="max-w-[1280px] mx-auto px-[20px] md:px-[80px]">
        
        {/* HEADER */}
        <div className="flex flex-col items-center text-center mb-[72px]">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-block bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.15)] text-[#D7C4F7] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[20px]"
          >
            ✦ How It Works
          </motion.div>

          {/* Heading */}
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-bold text-[34px] md:text-[42px] text-[#FAF7FF] tracking-[-0.02em] mb-[16px] leading-tight"
          >
            From Zero to AI-Powered in <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #8B5CF6 0%, #FBBF24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>24 Hours.</span>
          </motion.h2>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-sans font-normal text-[16px] md:text-[18px] text-[#B8B0D1] max-w-[500px] mx-auto leading-[1.6]"
          >
            No complex setup. No coding required. Just three simple steps.
          </motion.p>
        </div>

        {/* STEPS TIMELINE */}
        <div className="relative w-full pb-[40px] md:pb-0">
          
          {/* Desktop Connecting Line */}
          <div className="hidden md:block absolute top-[27px] h-[2px] z-0" style={{ left: '16.666%', right: '16.666%' }}>
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeInOut", delay: 0.4 }}
              className="h-full relative overflow-hidden"
              style={{ background: 'linear-gradient(90deg, #8B5CF6, #F59E0B, #06B6D4)' }}
            >
              <motion.div 
                animate={{ left: ["-5%", "105%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/2 -translate-y-1/2 w-[6px] h-[6px] bg-white rounded-full shadow-[0_0_8px_white]"
              />
            </motion.div>
          </div>

          {/* Mobile Connecting Line */}
          <div className="md:hidden absolute top-[28px] bottom-[120px] left-[27px] w-[2px] z-0">
            <motion.div 
              initial={{ height: 0 }}
              whileInView={{ height: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeInOut", delay: 0.4 }}
              className="w-full relative overflow-hidden"
              style={{ background: 'linear-gradient(180deg, #8B5CF6, #F59E0B, #06B6D4)' }}
            >
              <motion.div 
                animate={{ top: ["-5%", "105%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute left-1/2 -translate-x-1/2 w-[6px] h-[6px] bg-white rounded-full shadow-[0_0_8px_white]"
              />
            </motion.div>
          </div>

          {/* Cards Flexbox */}
          <div className="flex flex-col md:flex-row w-full gap-[60px] md:gap-0 relative z-10">
            {steps.map((step, idx) => (
              <motion.div 
                key={step.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 * idx }}
                className="flex-1 flex flex-row md:flex-col gap-[20px] md:gap-0 items-start md:items-center text-left md:text-center"
              >
                {/* Circle */}
                <div 
                  className="w-[56px] h-[56px] rounded-full bg-[#130224] shrink-0 flex items-center justify-center mb-0 md:mb-[28px] border-[2px]"
                  style={{ 
                    borderColor: step.color,
                    boxShadow: `0 0 20px ${step.shadow}`
                  }}
                >
                  <span className="font-display font-bold text-[20px]" style={{ color: step.color }}>
                    {step.num}
                  </span>
                </div>

                {/* Text Content */}
                <div className="flex flex-col items-start md:items-center md:max-w-[280px]">
                  <h3 className="font-display font-semibold text-[18px] md:text-[20px] text-[#FAF7FF] mb-[12px] leading-snug">
                    {step.title}
                  </h3>
                  <p className="font-sans font-normal text-[14px] md:text-[15px] text-[#B8B0D1] leading-[1.6]">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
