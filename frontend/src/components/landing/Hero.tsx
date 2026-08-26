"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NextImage from "next/image";
import { ChevronDown, GraduationCap, X, Loader2, Phone, Globe } from "lucide-react";
import { toast } from "sonner";

import { VOICE_AGENT_NAME } from "@/lib/agent-branding";
import { getConfigString, useSiteConfig } from "@/lib/site-content";

export function Hero() {
  const { data: siteConfig } = useSiteConfig();
  const demoPhoneNumber = getConfigString(siteConfig, "demo_phone_number");
  const voiceStatusTone = "border-[rgba(139,92,246,0.24)] bg-[rgba(45,18,85,0.32)] text-[#FAF7FF]";

  // Callback Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [language, setLanguage] = useState("hi");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemoClick = () => {
    setIsModalOpen(true);
    setSuccess(false);
    setError(null);
    setPhoneInput("");
  };

  const handleCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    // Clean phone number format: ensure it has +91 prefix if it looks like an Indian number
    let formattedPhone = phoneInput.trim();
    if (/^\d{10}$/.test(formattedPhone)) {
      formattedPhone = `+91${formattedPhone}`;
    } else if (/^\d{12}$/.test(formattedPhone) && formattedPhone.startsWith("91")) {
      formattedPhone = `+${formattedPhone}`;
    } else if (!formattedPhone.startsWith("+")) {
      // General fallback
      formattedPhone = `+${formattedPhone}`;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/public/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: formattedPhone,
          language
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to trigger callback.");
      }

      setSuccess(true);
      toast.success("Call dispatched successfully!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
      toast.error(err.message || "Failed to trigger callback.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative flex h-[100vh] w-full flex-col items-center justify-center overflow-hidden bg-[#080010] pt-[72px] text-center">
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 600px 600px at center 40%, rgba(139,92,246,0.12) 0%, rgba(251,191,36,0.03) 40%, transparent 70%)",
        }}
      />

      <div className="relative z-10 -mt-[100px] flex w-full flex-col items-center justify-center px-6 md:-mt-[140px]">
        <div className="relative mb-[24px] flex h-[220px] w-full max-w-[500px] items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <motion.div
              className="h-[500px] w-[500px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(139,92,246,0.2) 0%, rgba(251,191,36,0.05) 50%, transparent 70%)",
              }}
              animate={{
                opacity: [0.5, 1, 0.5],
                scale: [0.95, 1.05, 0.95],
              }}
              transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10"
          >
            <motion.div
              animate={{ y: [-6, 6, -6] }}
              transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
            >
              <NextImage
                src="/trident.png"
                alt="Trinetra Trident"
                width={350}
                height={160}
                className="relative z-10 h-[100px] w-auto md:h-[130px] lg:h-[160px] drop-shadow-[0_0_60px_rgba(139,92,246,0.5)]"
                priority
              />
            </motion.div>
          </motion.div>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
          className="mb-[20px] font-display text-[38px] font-bold leading-tight tracking-[-0.02em] text-[#FAF7FF] sm:text-[46px] md:text-[64px] lg:text-[76px]"
        >
          The{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, #D7C4F7 0%, #FBBF24 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Divine
          </span>{" "}
          Vision.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6, ease: "easeOut" }}
          className="mx-auto mb-[36px] max-w-[580px] font-sans text-[16px] font-normal leading-[1.7] text-[#B8B0D1] md:text-[18px]"
        >
          Trinetra bridges autonomous operations and cognitive learning — powering self-healing workflows and AI-driven education.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
          className="flex w-full max-w-[400px] flex-col justify-center gap-[16px] sm:max-w-none sm:flex-row"
        >
          <a
            href="https://shiksha.trinetraedu-ai.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center justify-center font-sans text-[19px] font-bold bg-[#0C0118] text-white rounded-full px-[42px] py-[18px] shadow-[0_0_25px_rgba(139,92,246,0.25)] transition-all duration-200 ease-out hover:-translate-y-[2px] hover:shadow-[0_0_45px_rgba(139,92,246,0.45)]"
          >
            <div className="absolute inset-0 rounded-full border border-[rgba(139,92,246,0.25)] transition-colors duration-200 ease-out group-hover:border-[#A78BFA]" />
            <span className="relative z-10">Trinetra Shiksha</span>
            <span className="relative z-10 ml-[10px] font-normal text-[#8B5CF6] transition-all duration-200 ease-out group-hover:text-[#FAF7FF] group-hover:translate-x-1">
              {"->"}
            </span>
          </a>

          <button
            type="button"
            onClick={handleDemoClick}
            className="group relative cursor-pointer rounded-full bg-[#0C0118] px-[36px] py-[16px] font-sans text-[18px] font-medium text-[#B8B0D1] shadow-[0_0_20px_rgba(139,92,246,0.1)] transition-all duration-300 hover:-translate-y-[2px] hover:text-[#FAF7FF] hover:shadow-[0_0_35px_rgba(139,92,246,0.25)]"
          >
            <div className="absolute inset-0 rounded-full border border-[rgba(139,92,246,0.2)] transition-colors duration-300 group-hover:border-[#8B5CF6]" />
            <span className="mr-2 translate-y-[-1px] leading-none text-[#8B5CF6]">{">"}</span>
            Talk to {VOICE_AGENT_NAME}
          </button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 0.5, delay: 1.2 }}
        className="absolute bottom-[32px] left-1/2 -translate-x-1/2 text-[#6B6088]"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
        >
          <ChevronDown size={28} strokeWidth={2} />
        </motion.div>
      </motion.div>

      {/* --- TELEPHONY CALLBACK MODAL --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="relative w-full max-w-md border border-white/10 bg-[#0C0118]/95 p-6 md:p-8 rounded-3xl shadow-2xl space-y-6 text-left"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Header */}
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold font-display text-white tracking-tight">
                  Receive a Live Call
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  Experience {VOICE_AGENT_NAME}&apos;s real-time sales and service conversation directly on your phone.
                </p>
              </div>

              {success ? (
                <div className="space-y-4 text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                    <Phone className="w-6 h-6 animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">Calling you now!</h4>
                    <p className="text-xs text-zinc-400">
                      Answer the call on your phone to start the live demonstration.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-4 px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Close Sandbox
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCallbackSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-medium">
                      {error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Your Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="tel"
                        required
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="e.g. +91 99999 88888 or 10-digit number"
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Converse in Language
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[#130224] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500 transition cursor-pointer appearance-none"
                      >
                        <option value="hi">Hindi (Indian Accent)</option>
                        <option value="en-IN">English (Indian Accent)</option>
                        <option value="en-US">English (US Accent)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3.5 bg-violet-600 hover:bg-violet-750 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-lg shadow-violet-500/10"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Dialing sandbox...</span>
                      </>
                    ) : (
                      <span>Call Me Now</span>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
