"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Wallet, Users, Zap, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";

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
  return (
    <div className="flex flex-col min-h-screen bg-[#080010] relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 blur-[120px] rounded-full mix-blend-screen" />
      </div>
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>

      <div className="relative z-10 flex flex-col pb-[120px] pt-[160px] px-[24px] max-w-[1280px] mx-auto gap-[120px]">
        
        {/* HERO SECTION */}
        <div className="flex flex-col lg:flex-row gap-[60px] items-center">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex-1 flex flex-col gap-[28px] items-start"
          >
            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <Zap size={16} className="text-amber-400" />
              <span className="text-sm font-medium tracking-wide text-amber-50/80">Trinetra Partner Program</span>
            </motion.div>
            
            <motion.h1 variants={fadeIn} className="font-display font-bold text-[48px] md:text-[64px] lg:text-[72px] text-white tracking-tight leading-[1.1]">
              Monetize Your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-400">
                Network.
              </span>
            </motion.h1>
            
            <motion.p variants={fadeIn} className="text-[18px] md:text-[20px] text-zinc-400 leading-relaxed max-w-[540px] font-light">
              Join the ecosystem powering the next generation of autonomous businesses. 
              Earn industry-leading commissions by referring Trinetra AI infrastructure to your clients.
            </motion.p>
            
            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-[16px] mt-[12px] w-full sm:w-auto">
              <Link 
                href="/contact" 
                className="group relative px-[32px] py-[16px] bg-white text-black font-semibold rounded-full hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                Join Program
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <button 
                onClick={() => toast("Coming Soon! Partner portal is under development.")}
                className="px-[32px] py-[16px] bg-white/5 text-white font-semibold rounded-full border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 backdrop-blur-sm"
              >
                Partner Login
              </button>
            </motion.div>
            
            <motion.div variants={fadeIn} className="flex items-center gap-6 mt-8 text-sm text-zinc-500 font-medium">
              <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> 20% Recurring</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Real-time tracking</div>
            </motion.div>
          </motion.div>

          {/* DYNAMIC DASHBOARD PREVIEW */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
            className="flex-1 w-full relative perspective-1000"
          >
            <div className="absolute -inset-1 bg-gradient-to-tr from-violet-600/30 to-amber-500/30 blur-2xl rounded-3xl" />
            
            <div className="relative bg-[#0C0A15]/90 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden">
              {/* Header Mock */}
              <div className="h-12 border-b border-white/10 flex items-center px-6 gap-2 bg-white/5">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                <div className="ml-4 h-4 w-32 bg-white/10 rounded-full" />
              </div>
              
              <div className="p-6 md:p-8 grid grid-cols-2 gap-4">
                <div className="col-span-2 bg-white/5 border border-white/5 rounded-xl p-5 flex justify-between items-center group cursor-pointer hover:bg-white/10 transition">
                  <div>
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Your Unique Link</div>
                    <div className="text-amber-400 font-mono text-sm md:text-base">trinetra.ai/?ref=TRIN-20XK</div>
                  </div>
                  <Copy size={20} className="text-zinc-600 group-hover:text-white transition" />
                </div>
                
                <div className="bg-white/5 border border-white/5 rounded-xl p-5">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Earnings</div>
                  <div className="text-2xl font-bold text-emerald-400">$4,250.00</div>
                  <div className="text-xs text-zinc-500 mt-1">+12% this month</div>
                </div>
                
                <div className="bg-white/5 border border-white/5 rounded-xl p-5">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Conversions</div>
                  <div className="text-2xl font-bold text-white">24</div>
                  <div className="text-xs text-amber-400 mt-1">3 pending</div>
                </div>
              </div>
              
              {/* Abstract Chart */}
              <div className="px-6 md:px-8 pb-8">
                <div className="h-32 w-full flex items-end gap-2">
                  {[40, 25, 60, 30, 80, 45, 90].map((h, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-violet-500/20 to-violet-500 rounded-t-sm" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Floating badge */}
            <motion.div 
              animate={{ y: [0, -10, 0] }} 
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-6 -bottom-6 bg-amber-500 text-black px-6 py-4 rounded-2xl shadow-xl shadow-amber-500/20 rotate-3 border border-amber-400"
            >
              <div className="font-bold text-xl">20% Tier</div>
              <div className="text-sm font-medium opacity-80">Unlocked</div>
            </motion.div>
          </motion.div>
        </div>

        {/* HOW IT WORKS */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="flex flex-col gap-16 mt-16"
        >
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display font-bold text-3xl md:text-5xl text-white mb-6">How It Works</h2>
            <p className="text-zinc-400 text-lg">Three simple steps to start earning recurring revenue by introducing businesses to the future of AI infrastructure.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-[60px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
            
            <motion.div variants={fadeIn} className="relative flex flex-col items-center text-center gap-6">
              <div className="w-20 h-20 rounded-full bg-[#1A1525] border-2 border-violet-500/30 flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
                <span className="text-2xl font-bold text-violet-400">01</span>
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-white mb-3">Join & Setup</h3>
                <p className="text-zinc-400 leading-relaxed text-sm">Create your partner account instantly. Upon signing up, you'll immediately receive your unique tracking links and dashboard access.</p>
              </div>
            </motion.div>

            <motion.div variants={fadeIn} className="relative flex flex-col items-center text-center gap-6">
              <div className="w-20 h-20 rounded-full bg-[#1A1525] border-2 border-amber-500/30 flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                <span className="text-2xl font-bold text-amber-400">02</span>
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-white mb-3">Share & Track</h3>
                <p className="text-zinc-400 leading-relaxed text-sm">Distribute your code to clients, followers, or your network. Every single click, sign-up, and contract is transparently tracked.</p>
              </div>
            </motion.div>

            <motion.div variants={fadeIn} className="relative flex flex-col items-center text-center gap-6">
              <div className="w-20 h-20 rounded-full bg-[#1A1525] border-2 border-emerald-500/30 flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <span className="text-2xl font-bold text-emerald-400">03</span>
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-white mb-3">Earn Monthly</h3>
                <p className="text-zinc-400 leading-relaxed text-sm">Take home 20% commission on every qualified deal you close. Payouts drop reliably on the 1st of every month.</p>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* BENTO GRID FEATURES */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="mt-16 flex flex-col gap-12"
        >
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white text-center">Built for Scale</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={fadeIn} className="md:col-span-2 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-8 hover:bg-white/[0.07] transition-colors relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform duration-700">
                <BarChart3 size={120} />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-center w-2/3">
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center mb-6">
                  <BarChart3 size={24} />
                </div>
                <h3 className="font-display font-bold text-2xl text-white mb-3">Real-Time Revenue Analytics</h3>
                <p className="text-zinc-400 leading-relaxed">Stop guessing about your conversions. Your dashboard updates the exact moment a lead converts, showing your pipeline, pending commissions, and historical payouts with complete clarity.</p>
              </div>
            </motion.div>

            <motion.div variants={fadeIn} className="bg-gradient-to-bl from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-8 hover:bg-white/[0.07] transition-colors">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-6">
                <Wallet size={24} />
              </div>
              <h3 className="font-display font-bold text-xl text-white mb-3">Ironclad Payouts</h3>
              <p className="text-zinc-400 leading-relaxed text-sm">We process commissions efficiently and securely. Funds route directly to your nominated account in INR, reliably on schedule, every month without fail.</p>
            </motion.div>

            <motion.div variants={fadeIn} className="bg-gradient-to-tr from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-8 hover:bg-white/[0.07] transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
                <Users size={24} />
              </div>
              <h3 className="font-display font-bold text-xl text-white mb-3">Partner Support</h3>
              <p className="text-zinc-400 leading-relaxed text-sm">You're not selling alone. Trinetra partners get priority access to our sales engineering team to help close complex deals and craft custom proposals.</p>
            </motion.div>

            <motion.div variants={fadeIn} className="md:col-span-2 bg-gradient-to-tl from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-8 flex items-center justify-between hover:bg-white/[0.07] transition-colors group">
              <div>
                <h3 className="font-display font-bold text-3xl text-white mb-2">Ready to start earning?</h3>
                <p className="text-zinc-400">Join top agencies and integrators partnering with Trinetra.</p>
              </div>
              <Link href="/contact" className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform group-hover:bg-amber-400">
                <ArrowRight size={24} />
              </Link>
            </motion.div>
          </div>
        </motion.section>

      </div>
    </div>
  );
}
