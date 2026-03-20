"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, X, Phone, PhoneOff } from "lucide-react";
import { useVapi } from "@/hooks/use-vapi";

const FORMSPREE_ENDPOINT = process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT || "https://formspree.io/f/placeholder";

export function CallToAction() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState("");
  const [isCallbackSubmitting, setIsCallbackSubmitting] = useState(false);
  const [callbackStatus, setCallbackStatus] = useState<"idle" | "success" | "error">("idle");
  const { toggleCall, isConnecting, isConnected } = useVapi();

  const handleCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callbackPhone) return;
    
    setIsCallbackSubmitting(true);
    setCallbackStatus("idle");

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ formType: "Callback Request", phone: callbackPhone })
      });
      if (response.ok) {
        setCallbackStatus("success");
        setTimeout(() => {
          setIsModalOpen(false);
          setCallbackStatus("idle");
          setCallbackPhone("");
        }, 3000);
      } else {
        setCallbackStatus("error");
      }
    } catch (err) {
      setCallbackStatus("error");
    } finally {
      setIsCallbackSubmitting(false);
    }
  };

  return (
    <section className="relative w-full py-[120px] text-center overflow-hidden bg-[#080010]">
      {/* Background Radial Atmosphere */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 800px 500px at center, rgba(139,92,246,0.12) 0%, rgba(251,191,36,0.04) 40%, transparent 70%)'
        }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-[20px] md:px-[80px] flex flex-col items-center">
        
        {/* Glowing Orb */}
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-[16px] h-[16px] rounded-full mb-[32px]"
          style={{
            background: 'radial-gradient(circle, #FBBF24, #8B5CF6)',
            boxShadow: '0 0 40px rgba(251,191,36,0.4), 0 0 80px rgba(139,92,246,0.2)'
          }}
        />

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-display font-bold text-[32px] md:text-[44px] text-[#F5F3FF] tracking-[-0.02em] mb-[16px] leading-tight"
        >
          Your Next Employee Costs <span className="text-[#FBBF24]">₹2</span>.
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-sans font-normal text-[16px] md:text-[18px] text-[#A8A0C0] max-w-[500px] mb-[40px] leading-[1.6]"
        >
          No salary. No sick days. No drama. Just results.
        </motion.p>

        {/* Interacting Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-[16px] w-full max-w-[400px] sm:max-w-none"
        >
          {/* Gold Accent Button */}
          <Link
            href="/contact"
            className="w-full sm:w-auto flex items-center justify-center px-[32px] py-[15px] bg-[#F59E0B] text-[#080010] font-sans font-semibold text-[16px] rounded-[12px] transition-all duration-300 shadow-[0_0_30px_rgba(245,158,11,0.25)] hover:bg-[#D97706] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:-translate-y-[2px] group"
          >
            Deploy Agent
            <span className="ml-[8px] font-black transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>

          {/* Outline Secondary Button - MOBILE */}
          <button
            onClick={toggleCall}
            className="md:hidden w-full px-[32px] py-[15px] rounded-[12px] border border-[#2D1255] text-[#F5F3FF] font-sans font-medium text-[16px] flex items-center justify-center hover:border-[#8B5CF6] hover:text-[#A78BFA] transition-all duration-300 gap-2"
          >
            {isConnecting ? <><Loader2 size={16} className="animate-spin" /> Connecting...</> : isConnected ? <><PhoneOff size={16} /> End Call</> : <><Phone size={16} /> Talk to Sales AI</>}
          </button>

          {/* Outline Secondary Button - DESKTOP */}
          <button
            onClick={toggleCall}
            className="hidden md:flex flex-1 sm:flex-none px-[32px] py-[15px] rounded-[12px] border border-[#2D1255] text-[#F5F3FF] font-sans font-medium text-[16px] items-center justify-center hover:border-[#8B5CF6] hover:text-[#A78BFA] transition-all duration-300 gap-2"
          >
            {isConnecting ? <><Loader2 size={16} className="animate-spin" /> Connecting...</> : isConnected ? <><PhoneOff size={16} /> End Call</> : <><Phone size={16} /> Talk to Sales AI</>}
          </button>
        </motion.div>

        {/* Micro-Text Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-[20px] font-sans font-normal text-[13px] text-[#6B6088] tracking-wide"
        >
          Free pilot available &bull; No credit card required &bull; Setup in 24 hours
        </motion.div>

      </div>

      {/* CALLBACK MODAL OVERLAY */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[rgba(8,0,16,0.8)] backdrop-blur-md">
            <motion.div 
              initial={{opacity: 0, scale: 0.95}} 
              animate={{opacity: 1, scale: 1}} 
              exit={{opacity: 0, scale: 0.95}} 
              className="bg-[#130224] border border-[#2D1255] rounded-[20px] p-[32px] max-w-[400px] w-full relative shadow-2xl text-left"
            >
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="absolute top-4 right-4 text-[#6B6088] hover:text-[#F5F3FF] transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
              
              <h3 className="font-display font-semibold text-[22px] text-[#F5F3FF] mb-2">
                Schedule a Demo Call
              </h3>
              <p className="font-sans text-[15px] text-[#A8A0C0] mb-6 leading-[1.6]">
                Prefer to speak? Click "Talk to Sales AI" or leave your number and our AI agent will call you back within minutes.
              </p>
              
              <form onSubmit={handleCallbackSubmit} className="flex flex-col gap-4">
                <input 
                  type="tel" 
                  placeholder="Your phone number" 
                  value={callbackPhone} 
                  onChange={e => setCallbackPhone(e.target.value)} 
                  className="w-full bg-[#0C0118] border border-[#2D1255] rounded-[10px] px-[16px] py-[14px] text-[#F5F3FF] placeholder:text-[#6B6088] focus:border-[#8B5CF6] outline-none transition-colors" 
                  required 
                />
                <button 
                  type="submit" 
                  disabled={isCallbackSubmitting} 
                  className="w-full py-[14px] bg-[#8B5CF6] text-white rounded-[10px] font-semibold hover:bg-[#7C3AED] transition-colors flex justify-center items-center shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isCallbackSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Request Callback"}
                </button>
              </form>

              {callbackStatus === "success" && (
                <p className="mt-4 text-[#10B981] font-medium text-[14px] text-center flex justify-center items-center gap-2">
                  <CheckCircle2 size={16} /> Request Received
                </p>
              )}
              {callbackStatus === "error" && (
                <p className="mt-4 text-[#EF4444] font-medium text-[14px] text-center flex justify-center items-center gap-2">
                  <AlertCircle size={16} /> System error occurred.
                </p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </section>
  );
}
