"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Wallet, Users, Zap, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Layout } from "@/components/layout/Layout";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function PartnersLandingPage() {
  const copyLink = () => {
    navigator.clipboard?.writeText("https://vaakriti.com/?ref=VAAK-20XK");
    toast.success("Referral link copied to clipboard!");
  };

  return (
    <Layout theme="vaakriti">
      <div className="flex flex-col min-h-screen bg-[#FAFAFA] text-[#0F172A] relative overflow-hidden font-sans">
        {/* Subtle Ambient Background Gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] opacity-40 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-100/60 via-indigo-50/40 to-transparent blur-[120px] rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col pb-24 pt-28 sm:pt-36 px-4 sm:px-6 lg:px-8 max-w-[1280px] mx-auto gap-20 sm:gap-28 w-full">
          
          {/* HERO SECTION */}
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="flex-1 flex flex-col gap-6 items-start text-left"
            >

              
              <motion.h1 
                variants={fadeIn} 
                className="font-sans font-black text-4xl sm:text-5xl lg:text-6xl text-slate-900 tracking-tight leading-[1.12]"
              >
                Monetize Your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500">
                  Network.
                </span>
              </motion.h1>
              
              <motion.p 
                variants={fadeIn} 
                className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-[540px]"
              >
                Join the ecosystem powering the next generation of autonomous businesses. 
                Earn industry-leading commissions by referring Vaakriti AI infrastructure to your clients.
              </motion.p>
              
              <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-3.5 mt-2 w-full sm:w-auto">
                <Link 
                  href="/contact" 
                  className="px-8 py-3.5 bg-[#2563EB] text-white font-semibold rounded-xl hover:bg-[#1D4ED8] transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md cursor-pointer text-sm"
                >
                  Join Program
                  <ArrowRight size={16} />
                </Link>
                <button 
                  type="button"
                  onClick={() => toast.info("Partner portal is launching soon! Join the waitlist via contact.")}
                  className="px-8 py-3.5 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer text-sm"
                >
                  Partner Login
                </button>
              </motion.div>
              
              <motion.div variants={fadeIn} className="flex flex-wrap items-center gap-5 mt-4 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>20% Recurring Lifetime</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Real-time Attribution & Tracking</span>
                </div>
              </motion.div>
            </motion.div>

            {/* DYNAMIC DASHBOARD PREVIEW CARD */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-1 w-full relative"
            >
              <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden">
                {/* Header Mock */}
                <div className="h-11 border-b border-slate-100 flex items-center px-4 gap-2 bg-slate-50/80">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <div className="ml-3 h-3.5 w-32 bg-slate-200 rounded-full" />
                </div>
                
                <div className="p-5 sm:p-6 grid grid-cols-2 gap-3.5">
                  <div 
                    onClick={copyLink}
                    className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center group cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition-all"
                  >
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Your Unique Partner Link
                      </div>
                      <div className="text-blue-600 font-mono text-xs sm:text-sm font-semibold">
                        vaakriti.com/?ref=VAAK-20XK
                      </div>
                    </div>
                    <Copy size={16} className="text-slate-400 group-hover:text-blue-600 transition" />
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Earnings (INR)
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900">
                      ₹42,500
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-600 mt-1">
                      +18% this month
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Conversions
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900">
                      24
                    </div>
                    <div className="text-[11px] font-semibold text-blue-600 mt-1">
                      3 pending activation
                    </div>
                  </div>
                </div>
                
                {/* Volume Trend Chart */}
                <div className="px-5 sm:px-6 pb-6">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Attribution Activity
                  </div>
                  <div className="h-28 w-full flex items-end gap-2 pt-2 border-b border-slate-100">
                    {[35, 25, 55, 30, 75, 45, 95].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-blue-100 to-blue-600 rounded-t-sm" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Floating Tier Pill */}
              <motion.div 
                animate={{ y: [0, -6, 0] }} 
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-3 -bottom-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-2xl shadow-lg shadow-blue-500/25 border border-blue-400/30"
              >
                <div className="font-extrabold text-sm sm:text-base leading-tight">20% Tier</div>
                <div className="text-[11px] font-medium opacity-90 leading-tight">Unlocked & Active</div>
              </motion.div>
            </motion.div>
          </div>

          {/* HOW IT WORKS */}
          <motion.section 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="flex flex-col gap-12 sm:gap-14"
          >
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-mono font-bold tracking-widest text-[#2563EB] uppercase">
                ONBOARDING TIMELINE
              </span>
              <h2 className="font-sans font-black text-3xl sm:text-4xl text-slate-900 tracking-tight">
                How It Works
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Three simple steps to start earning recurring revenue by introducing businesses to production AI voice agents.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              <motion.div variants={fadeIn} className="relative flex flex-col items-center text-center gap-4 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xs hover:border-blue-200 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shadow-xs">
                  <span className="text-lg font-black text-blue-600 font-mono">01</span>
                </div>
                <div>
                  <h3 className="font-sans font-bold text-lg text-slate-900 mb-2">Join & Setup</h3>
                  <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
                    Create your partner profile instantly. Upon acceptance, you immediately receive unique tracking links, promo codes, and dashboard access.
                  </p>
                </div>
              </motion.div>

              <motion.div variants={fadeIn} className="relative flex flex-col items-center text-center gap-4 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xs hover:border-blue-200 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shadow-xs">
                  <span className="text-lg font-black text-blue-600 font-mono">02</span>
                </div>
                <div>
                  <h3 className="font-sans font-bold text-lg text-slate-900 mb-2">Share & Track</h3>
                  <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
                    Distribute your affiliate link or embed our demo widgets on client pitches. Every click, demo call, and paid activation is tracked with 90-day cookie persistence.
                  </p>
                </div>
              </motion.div>

              <motion.div variants={fadeIn} className="relative flex flex-col items-center text-center gap-4 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xs hover:border-blue-200 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shadow-xs">
                  <span className="text-lg font-black text-blue-600 font-mono">03</span>
                </div>
                <div>
                  <h3 className="font-sans font-bold text-lg text-slate-900 mb-2">Earn Monthly</h3>
                  <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
                    Take home 20% recurring commission on every active subscriber. Direct payout via NEFT/UPI or international wire on the 1st of every month.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.section>

          {/* BUILT FOR SCALE BENTO GRID */}
          <motion.section 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="flex flex-col gap-10"
          >
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-mono font-bold tracking-widest text-[#2563EB] uppercase">
                PARTNER INFRASTRUCTURE
              </span>
              <h2 className="font-sans font-black text-3xl sm:text-4xl text-slate-900 tracking-tight">
                Built for Scale
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div variants={fadeIn} className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-7 sm:p-8 shadow-xs hover:border-blue-200 hover:shadow-md transition-all relative overflow-hidden group">
                <div className="relative z-10 flex flex-col h-full justify-center">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 border border-blue-100">
                    <BarChart3 size={22} />
                  </div>
                  <h3 className="font-sans font-bold text-xl sm:text-2xl text-slate-900 mb-2.5">
                    Real-Time Revenue Analytics
                  </h3>
                  <p className="text-slate-600 leading-relaxed text-sm max-w-xl">
                    Stop guessing about conversion milestones. Your affiliate dashboard updates the moment a customer signs up, displaying trial conversions, pipeline health, and recurring MRR attribution.
                  </p>
                </div>
              </motion.div>

              <motion.div variants={fadeIn} className="bg-white border border-slate-200 rounded-2xl p-7 sm:p-8 shadow-xs hover:border-blue-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 border border-emerald-100">
                  <Wallet size={22} />
                </div>
                <h3 className="font-sans font-bold text-lg sm:text-xl text-slate-900 mb-2">
                  Ironclad Payouts
                </h3>
                <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
                  We process commissions directly to your nominated Indian or global account in INR/USD without delays or minimum hurdle thresholds.
                </p>
              </motion.div>

              <motion.div variants={fadeIn} className="bg-white border border-slate-200 rounded-2xl p-7 sm:p-8 shadow-xs hover:border-blue-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 border border-indigo-100">
                  <Users size={22} />
                </div>
                <h3 className="font-sans font-bold text-lg sm:text-xl text-slate-900 mb-2">
                  Dedicated Partner Support
                </h3>
                <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
                  Receive direct line access to our solution engineering desk to help close enterprise pilots, create RFPs, and configure telephony routes.
                </p>
              </motion.div>

              <motion.div variants={fadeIn} className="md:col-span-2 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] rounded-2xl p-7 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-md text-white">
                <div className="space-y-1">
                  <h3 className="font-sans font-black text-2xl sm:text-3xl">
                    Ready to start earning?
                  </h3>
                  <p className="text-blue-100 text-xs sm:text-sm">
                    Join high-growth agencies, consultants, and telecom resellers partnering with Vaakriti.
                  </p>
                </div>
                <Link 
                  href="/contact" 
                  className="px-6 py-3 rounded-xl bg-white text-blue-600 font-bold text-sm hover:bg-blue-50 transition-colors shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  Apply Now
                  <ArrowRight size={16} />
                </Link>
              </motion.div>
            </div>
          </motion.section>

        </div>
      </div>
    </Layout>
  );
}
