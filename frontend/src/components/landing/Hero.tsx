"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Phone, X, Loader2, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { PlasmaEnergyRing } from "./PlasmaEnergyRing";

interface GreetingWord {
  text: string;
  phonetic: string;
  lang: string;
  langName: string;
  pos: string;
  delay: number;
}

const MULTILINGUAL_GREETINGS: GreetingWord[] = [
  // Top center - prominent Hindi safely above ring
  { text: "नमस्ते", phonetic: "Namaste", lang: "hi-IN", langName: "Hindi", pos: "-top-10 sm:-top-12 left-1/2 -translate-x-1/2", delay: 0 },
  // Top left - English
  { text: "Hello", phonetic: "Hello", lang: "en-US", langName: "English", pos: "-top-3 sm:-top-6 left-[1%] sm:left-[4%]", delay: 0.3 },
  // Mid upper left - Marathi
  { text: "नमस्कार", phonetic: "Namaskar", lang: "mr-IN", langName: "Marathi", pos: "top-[24%] -left-14 sm:-left-20 md:-left-24", delay: 0.6 },
  // Mid lower left - Punjabi
  { text: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ", phonetic: "Sat Sri Akal", lang: "pa-IN", langName: "Punjabi", pos: "bottom-[24%] -left-14 sm:-left-20 md:-left-24", delay: 0.9 },
  // Bottom left - French
  { text: "Bonjour", phonetic: "Bonjour", lang: "fr-FR", langName: "French", pos: "-bottom-10 sm:-bottom-12 left-[4%] sm:left-[8%]", delay: 1.2 },
  // Top right - Tamil
  { text: "வணக்கம்", phonetic: "Vanakkam", lang: "ta-IN", langName: "Tamil", pos: "-top-3 sm:-top-6 right-[1%] sm:right-[4%]", delay: 1.5 },
  // Upper mid right - Urdu / Salaam
  { text: "Salaam", phonetic: "Salaam", lang: "ur-IN", langName: "Urdu", pos: "top-[22%] -right-14 sm:-right-20 md:-right-24", delay: 1.8 },
  // Mid right - Spanish
  { text: "Hola", phonetic: "Hola", lang: "es-ES", langName: "Spanish", pos: "top-[46%] -right-14 sm:-right-20 md:-right-24", delay: 2.1 },
  // Lower right - Japanese
  { text: "こんにちは", phonetic: "Konnichiwa", lang: "ja-JP", langName: "Japanese", pos: "bottom-[24%] -right-14 sm:-right-20 md:-right-24", delay: 2.4 },
  // Bottom right - Arabic
  { text: "مرحباً", phonetic: "Marhaban", lang: "ar-SA", langName: "Arabic", pos: "-bottom-10 sm:-bottom-12 right-[4%] sm:right-[8%]", delay: 2.7 },
];

export function Hero() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);
  const [announcementText, setAnnouncementText] = useState("How Autonomous Voice Agents handle complex Indian calls");

  // Prime speech synthesis voices
  React.useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  // Web Audio Harmonic Vocal Chime (guaranteed instant audio playback on click)
  const playAgentChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.08); // A5

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.20, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.38);
    } catch {
      // AudioContext fallback
    }
  };

  const handleSpeakGreeting = (g: GreetingWord) => {
    if (typeof window === "undefined") return;

    // 1. Play immediate pleasant agent voice chime
    playAgentChime();

    setSpeakingWord(g.text);

    // 2. Play speech synthesis with phonetic voice fallback
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.resume();
        window.speechSynthesis.cancel();

        // 35ms timeout bypasses Chrome cancel-and-speak bug
        setTimeout(() => {
          const voices = window.speechSynthesis.getVoices();
          const prefix = g.lang.split("-")[0].toLowerCase();
          const matched =
            voices.find((v) => v.lang.toLowerCase() === g.lang.toLowerCase()) ||
            voices.find((v) => v.lang.toLowerCase().startsWith(prefix));

          // If OS has native language voice (e.g. Hindi/Tamil voice installed), speak native script.
          // Otherwise, pass phonetic pronunciation (e.g. "Namaste", "Vanakkam") so default/English OS voice speaks it aloud!
          const textToSpeak = matched ? g.text : g.phonetic;
          const utterance = new SpeechSynthesisUtterance(textToSpeak);

          if (matched) {
            utterance.voice = matched;
            utterance.lang = g.lang;
          } else {
            utterance.lang = "en-US";
          }

          utterance.rate = 0.90;
          utterance.pitch = 1.05;
          utterance.volume = 1.0;

          utterance.onend = () => {
            setSpeakingWord((curr) => (curr === g.text ? null : curr));
          };
          utterance.onerror = () => {
            setSpeakingWord((curr) => (curr === g.text ? null : curr));
          };

          window.speechSynthesis.speak(utterance);
        }, 35);
      } catch (e) {
        console.error("SpeechSynthesis error:", e);
        setTimeout(() => setSpeakingWord(null), 1200);
      }
    } else {
      setTimeout(() => setSpeakingWord(null), 1200);
    }

    toast.success(`Agent speaking in ${g.langName}: "${g.text}"`, {
      icon: <Volume2 className="w-4 h-4 text-emerald-600 animate-pulse" />,
      duration: 2200,
    });
  };

  React.useEffect(() => {
    fetch("/api/public/announcement")
      .then((res) => res.json())
      .then((data) => {
        if (data?.announcement?.text) {
          setAnnouncementText(data.announcement.text);
        }
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    const handleOpen = () => setIsModalOpen(true);
    if (typeof window !== "undefined") {
      window.addEventListener("open-hero-callback-modal", handleOpen);
      return () => window.removeEventListener("open-hero-callback-modal", handleOpen);
    }
  }, []);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) {
      toast.error("Please enter a valid phone number");
      return;
    }

    let formatted = phoneInput.trim();
    if (/^\d{10}$/.test(formatted)) {
      formatted = `+91${formatted}`;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/public/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: formatted, language: "hi" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to trigger callback");

      toast.success("Call dispatched! Your phone will ring in 10 seconds.");
      setIsModalOpen(false);
      setPhoneInput("");
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger call");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative w-full bg-transparent text-[#111827] select-none pt-[112px] sm:pt-[124px] md:pt-[132px] pb-2 sm:pb-4 px-4 sm:px-8 flex flex-col items-center z-10">

      {/* ── 2. MAIN HEADING: CRISP DARK CHARCOAL (#111827), CENTERED ── */}
      <div className="relative z-10 max-w-4xl mx-auto w-full flex flex-col items-center text-center mb-8 sm:mb-10 md:mb-12">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-[40px] sm:text-[52px] md:text-[62px] lg:text-[70px] font-medium tracking-tight text-[#111827] leading-[1.06]"
          style={{ fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif' }}
        >
          Voice for all from India
        </motion.h1>
      </div>

      {/* ── 3. CENTERPIECE: PLASMA ENERGY RING SURROUNDED BY MULTILINGUAL GREETINGS (ZERO OVERLAP) ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="relative z-10 w-full max-w-[560px] sm:max-w-[620px] md:max-w-[660px] h-[360px] sm:h-[400px] md:h-[430px] flex items-center justify-center mb-4 sm:mb-6 md:mb-8"
      >
        {/* Plasma Energy Ring Portal in the Center */}
        <div className="relative flex items-center justify-center w-[340px] h-[340px] sm:w-[390px] sm:h-[390px] md:w-[420px] md:h-[420px]">
          {/* Luminous Light-Pocket behind the ring to preserve its vibrant radial glow without cover up */}
          <div
            className="pointer-events-none absolute -inset-8 rounded-full opacity-70 blur-2xl"
            style={{
              background:
                "radial-gradient(circle, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.45) 50%, transparent 80%)",
            }}
          />

          <PlasmaEnergyRing
            size={420}
            onRingClick={() => setIsModalOpen(true)}
            className="w-full h-full relative z-10"
          />

          {/* ── MULTILINGUAL GREETINGS (CLICK TO HEAR AI AGENT SPEAK IN THAT LANGUAGE) ── */}
          {MULTILINGUAL_GREETINGS.map((g, idx) => {
            const isSpeaking = speakingWord === g.text;
            return (
              <motion.div
                key={g.text}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.5,
                  delay: 0.25 + g.delay * 0.12,
                  ease: "easeOut",
                }}
                className={`absolute z-30 select-none ${g.pos} whitespace-nowrap`}
              >
                <motion.button
                  type="button"
                  onClick={() => handleSpeakGreeting(g)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    y: isSpeaking ? [0, -3, 0] : [0, -2.5, 0],
                  }}
                  transition={{
                    y: {
                      duration: isSpeaking ? 0.7 : 3 + (idx % 3) * 0.7,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: idx * 0.15,
                    },
                  }}
                  className={`group relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer shadow-xs ${
                    isSpeaking
                      ? "bg-emerald-50 text-emerald-950 border border-emerald-400 ring-2 ring-emerald-400/40 shadow-[0_0_18px_rgba(16,185,129,0.35)] scale-105"
                      : "bg-white/90 text-slate-800 border border-slate-200/80 hover:border-emerald-300 hover:bg-white hover:text-emerald-950 hover:shadow-md backdrop-blur-md"
                  }`}
                  title={`Click to hear agent speak "${g.text}" in ${g.langName}`}
                  aria-label={`Listen to ${g.text} in ${g.langName}`}
                >
                  <span className="font-semibold tracking-wide">{g.text}</span>

                  {isSpeaking ? (
                    <span className="flex items-center gap-0.5 ml-0.5 h-3">
                      <motion.span
                        animate={{ height: ["3px", "11px", "3px"] }}
                        transition={{ duration: 0.45, repeat: Infinity, ease: "easeInOut" }}
                        className="w-0.5 bg-emerald-600 rounded-full"
                      />
                      <motion.span
                        animate={{ height: ["7px", "14px", "5px"] }}
                        transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
                        className="w-0.5 bg-emerald-600 rounded-full"
                      />
                      <motion.span
                        animate={{ height: ["4px", "9px", "4px"] }}
                        transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                        className="w-0.5 bg-emerald-600 rounded-full"
                      />
                    </span>
                  ) : (
                    <Volume2 className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 opacity-60 group-hover:opacity-100 transition-colors" />
                  )}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── 6. QUICK PHONE CALLBACK MODAL ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center mb-3">
                <Phone className="w-5 h-5 text-[#0D9488]" />
              </div>

              <h3 className="text-base font-bold text-[#0B0F17]">
                Experience Trinetra Voice
              </h3>
              <p className="mt-1 text-xs text-slate-600 mb-4">
                Enter your mobile number to receive a live interactive phone call from our AI agent.
              </p>

              <form onSubmit={handlePhoneSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-mono font-medium text-slate-500">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="98765 43210"
                      className="w-full pl-11 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-[#0B0F17] placeholder-slate-400 focus:outline-none focus:border-[#0D9488] focus:bg-white"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-full bg-[#0B0F17] hover:bg-black text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0D9488]" />
                      <span>Dispatching Call...</span>
                    </>
                  ) : (
                    <span>Call Me Now →</span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </section>
  );
}
