"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Phone } from "lucide-react";

const AnimatedNumber = ({ value, prefix = "", suffix = "", decimals = 0 }: { value: number, prefix?: string, suffix?: string, decimals?: number }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTime: number;
    const duration = 2000; // 2 seconds
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

export function RoiDashboardPreview() {
  const [inView, setInView] = useState(false);
  
  return (
    <section className="w-full bg-[#080010] py-[100px] relative overflow-hidden">
      {/* Subtle background glow mimicking the dashboard perspective */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none" 
        style={{ 
          background: 'radial-gradient(ellipse 600px 400px at bottom center, rgba(139,92,246,0.05) 0%, transparent 60%)' 
        }} 
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-[20px] md:px-[60px] flex flex-col items-center">
        
        {/* HEADER */}
        <div className="flex flex-col items-center text-center mb-[56px]">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-block bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.15)] text-[#D7C4F7] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[20px]"
          >
            ROI Dashboard
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-bold text-[34px] md:text-[42px] text-[#FAF7FF] tracking-[-0.02em] leading-tight mb-[16px]"
          >
            See <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #D7C4F7 0%, #FBBF24 100%)' }}>Exactly</span> What Your AI Is Doing.
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-sans font-normal text-[16px] md:text-[18px] text-[#B8B0D1] max-w-[500px] leading-[1.6]"
          >
            Real-time metrics. Real savings. No guesswork.
          </motion.p>
        </div>

        {/* DASHBOARD MOCKUP */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          onViewportEnter={() => setInView(true)}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-[900px] bg-[#130224] border border-[#1E0A35] rounded-[20px] p-[24px] md:p-[32px] shadow-[0_20px_60px_rgba(139,92,246,0.08)] group cursor-pointer relative"
          style={{ transform: 'perspective(1000px) rotateX(2deg)', transition: 'transform 0.5s ease' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'perspective(1000px) rotateX(2deg)'}
        >
          {/* Live Preview Label */}
          <div className="absolute top-[-14px] left-[32px] bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.3)] text-[#D7C4F7] font-mono font-medium text-[11px] px-[12px] py-[4px] rounded-[6px] z-20 shadow-[0_0_15px_rgba(139,92,246,0.15)] backdrop-blur-sm tracking-wide">
            LIVE PREVIEW — SAMPLE DATA
          </div>

          {/* Card Row */}
          <div className="flex flex-col md:flex-row gap-[16px] mb-[32px] mt-[12px]">
            {/* Card 1 */}
            <div className="flex-1 bg-[#0C0118] border border-[#1E0A35] rounded-[12px] p-[20px] flex flex-col justify-between items-start relative overflow-hidden transition-all duration-300 hover:border-[#8B5CF6]/50">
              <div className="absolute right-[20px] top-[20px]">
                <Phone size={18} className="text-[#8B5CF6]" />
              </div>
              <div className="text-[13px] font-sans font-normal text-[#6B6088] mb-[8px]">Calls Handled</div>
              <div className="font-display font-bold text-[36px] text-[#FAF7FF] leading-none mb-[8px]">
                {inView ? <AnimatedNumber value={800} suffix="+" /> : "0+"}
              </div>
              <div className="text-[#10B981] font-sans font-medium text-[13px]">+12% ↑</div>
            </div>

            {/* Card 2 */}
            <div className="flex-1 bg-[#0C0118] border border-[#1E0A35] rounded-[12px] p-[20px] flex flex-col justify-between items-start relative overflow-hidden transition-all duration-300 hover:border-[#8B5CF6]/50">
              <div className="text-[13px] font-sans font-normal text-[#6B6088] mb-[8px]">Appointments Booked</div>
              <div className="font-display font-bold text-[36px] text-[#FAF7FF] leading-none mb-[8px]">
                {inView ? <AnimatedNumber value={200} suffix="+" /> : "0+"}
              </div>
              <div className="text-[#10B981] font-sans font-medium text-[13px]">+8% ↑</div>
            </div>

            {/* Card 3 */}
            <div className="flex-1 bg-[#0C0118] border border-[#1E0A35] rounded-[12px] p-[20px] flex flex-col justify-between items-start relative overflow-hidden shadow-[inset_0_0_20px_rgba(251,191,36,0.05)] transition-all duration-300 hover:border-[#FBBF24]/50">
              <div className="w-[4px] h-full bg-[#FBBF24] absolute left-0 top-0" />
              <div className="text-[13px] font-sans font-normal text-[#6B6088] mb-[8px]">Money Saved This Month</div>
              <div className="font-display font-bold text-[36px] text-[#FBBF24] leading-none mb-[8px]">
                {inView ? <AnimatedNumber prefix="₹" value={40000} suffix="+" /> : "₹0+"}
              </div>
              <div className="text-[#10B981] font-sans font-medium text-[13px]">+15% ↑</div>
            </div>

            {/* Card 4 */}
            <div className="flex-1 bg-[#0C0118] border border-[#1E0A35] rounded-[12px] p-[20px] flex flex-col justify-between items-start relative overflow-hidden transition-all duration-300 hover:border-[#8B5CF6]/50">
              <div className="text-[13px] font-sans font-normal text-[#6B6088] mb-[8px]">Hours Saved</div>
              <div className="font-display font-bold text-[36px] text-[#FAF7FF] leading-none mb-[8px]">
                {inView ? <AnimatedNumber value={150} suffix="+" /> : "0+"}
              </div>
              <div className="text-[#10B981] font-sans font-medium text-[13px]">+18% ↑</div>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="w-full bg-[#0C0118] border border-[#1E0A35] rounded-[12px] p-[20px] flex flex-col relative h-[240px]">
            <div className="flex items-center justify-between mb-[24px]">
              <div className="text-[13px] font-sans font-medium text-[#B8B0D1]">This Week's Call Volume</div>
            </div>

            <div className="flex-1 flex items-end justify-between px-[10px] md:px-[20px] relative pb-[24px]">
              {/* Fake Y Axis Guide Lines */}
              <div className="absolute left-[10px] md:left-[20px] top-0 bottom-[24px] flex flex-col justify-between text-[11px] font-sans text-[#6B6088] z-0">
                <span className="opacity-0 lg:opacity-100">Top</span>
                <span className="mb-[10px] absolute bottom-0 left-0 whitespace-nowrap">Daily Calls</span>
              </div>
              
              <div className="absolute left-[40px] md:left-[80px] right-[10px] md:right-[20px] top-[10px] h-[1px] bg-[#1E0A35] border-dashed border-b border-[#1E0A35] z-0" />
              <div className="absolute left-[40px] md:left-[80px] right-[10px] md:right-[20px] top-1/2 h-[1px] bg-[#1E0A35] border-dashed border-b border-[#1E0A35] z-0" />
              <div className="absolute left-[40px] md:left-[80px] right-[10px] md:right-[20px] bottom-[24px] h-[1px] bg-[#1E0A35] z-0" />
              
              {/* Bars */}
              <div className="w-full ml-[60px] md:ml-[90px] flex items-end justify-between h-full relative z-10">
                {[60, 80, 45, 90, 100, 70, 55].map((height, i) => {
                  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                  return (
                    <div key={i} className="flex flex-col items-center justify-end h-full w-[20px] sm:w-[30px] md:w-[40px] group relative">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: inView ? `${height}%` : 0 }}
                        transition={{ duration: 1.5, delay: 0.1 * i, ease: "easeOut" }}
                        className={`w-full ${height === 100 ? 'bg-gradient-to-t from-[#8B5CF6]/50 to-[#8B5CF6]/100' : 'bg-[#8B5CF6]/60'} rounded-t-[4px] group-hover:bg-[#8B5CF6] transition-colors`}
                      />
                      <div className="absolute -bottom-[24px] text-[11px] font-sans text-[#6B6088]">{days[i]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer text */}
        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center font-sans font-normal italic text-[13px] text-[#6B6088] mt-[32px] leading-relaxed"
        >
          Sample data shown. Your dashboard shows YOUR real numbers from day one.
        </motion.p>

      </div>
    </section>
  );
}
