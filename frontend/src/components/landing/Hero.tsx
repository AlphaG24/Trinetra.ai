"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { HeroOrb } from "./HeroOrb";

// Multilingual Greetings System Floating Freely (95% Reference Fidelity)
interface FloatingGreeting {
  id: string;
  text: string;
  script: string;
  color: string;
  activeColor: string;
  left: string;
  top: string;
  fontSize: string;
  fontClass: string;
  initialOpacity: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
  activeOrder: number;
}

const GREETINGS: FloatingGreeting[] = [
  // Top Center - Sanskrit / Hindi "नमस्ते" (Highlighted Muted Terracotta in reference)
  {
    id: "namaste",
    text: "नमस्ते",
    script: "Devanagari",
    color: "#C65B32",
    activeColor: "#D9481E",
    left: "50%",
    top: "14%",
    fontSize: "text-xl sm:text-2xl md:text-[26px]",
    fontClass: "font-serif font-medium",
    initialOpacity: 0.85,
    driftX: 2,
    driftY: -4,
    duration: 6,
    delay: 0,
    activeOrder: 1,
  },
  // Upper Left - English "Hello"
  {
    id: "hello-1",
    text: "Hello",
    script: "Latin",
    color: "#4A4036",
    activeColor: "#171513",
    left: "35%",
    top: "14%",
    fontSize: "text-lg sm:text-xl md:text-[22px]",
    fontClass: "font-sans font-normal",
    initialOpacity: 0.5,
    driftX: -3,
    driftY: -3,
    duration: 7,
    delay: 0.8,
    activeOrder: 2,
  },
  // Upper Left - Marathi / Hindi "नमस्कार"
  {
    id: "namaskar",
    text: "नमस्कार",
    script: "Devanagari",
    color: "#C65B32",
    activeColor: "#D9481E",
    left: "29%",
    top: "26%",
    fontSize: "text-lg sm:text-xl md:text-[22px]",
    fontClass: "font-serif font-normal",
    initialOpacity: 0.75,
    driftX: -4,
    driftY: 2,
    duration: 6.5,
    delay: 0.3,
    activeOrder: 3,
  },
  // Upper Right - Tamil "வணக்கம்"
  {
    id: "vanakkam",
    text: "வணக்கம்",
    script: "Tamil",
    color: "#171513",
    activeColor: "#C65B32",
    left: "67%",
    top: "15%",
    fontSize: "text-lg sm:text-xl md:text-[22px]",
    fontClass: "font-medium",
    initialOpacity: 0.75,
    driftX: 3,
    driftY: -3,
    duration: 8,
    delay: 1.2,
    activeOrder: 4,
  },
  // Upper Right - Arabic/Urdu "Salaam"
  {
    id: "salaam",
    text: "Salaam",
    script: "Latin/Urdu",
    color: "#5C70A8",
    activeColor: "#2B4C7E",
    left: "72%",
    top: "23%",
    fontSize: "text-base sm:text-lg md:text-[20px]",
    fontClass: "font-serif italic",
    initialOpacity: 0.55,
    driftX: 4,
    driftY: 3,
    duration: 7.2,
    delay: 1.6,
    activeOrder: 5,
  },
  // Upper Right - Spanish "Hola"
  {
    id: "hola",
    text: "Hola",
    script: "Latin",
    color: "#4A4036",
    activeColor: "#171513",
    left: "81%",
    top: "27%",
    fontSize: "text-base sm:text-lg md:text-[19px]",
    fontClass: "font-sans",
    initialOpacity: 0.5,
    driftX: 2,
    driftY: -2,
    duration: 6.8,
    delay: 2.1,
    activeOrder: 6,
  },
  // Left Mid - Sanskrit "हृदा"
  {
    id: "hrida",
    text: "हृदा",
    script: "Devanagari",
    color: "#8C7A68",
    activeColor: "#C65B32",
    left: "27%",
    top: "41%",
    fontSize: "text-sm sm:text-base md:text-[17px]",
    fontClass: "font-serif",
    initialOpacity: 0.6,
    driftX: -3,
    driftY: -2,
    duration: 7.5,
    delay: 0.5,
    activeOrder: 7,
  },
  // Left Lower - Punjabi "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ"
  {
    id: "sat-sri-akal",
    text: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ",
    script: "Gurmukhi",
    color: "#171513",
    activeColor: "#C65B32",
    left: "28%",
    top: "54%",
    fontSize: "text-sm sm:text-base md:text-[18px]",
    fontClass: "font-medium",
    initialOpacity: 0.7,
    driftX: -2,
    driftY: 3,
    duration: 8.5,
    delay: 1.4,
    activeOrder: 8,
  },
  // Left Lower - French "Bonjour"
  {
    id: "bonjour",
    text: "Bonjour",
    script: "Latin",
    color: "#4A4036",
    activeColor: "#171513",
    left: "35%",
    top: "66%",
    fontSize: "text-base sm:text-lg md:text-[20px]",
    fontClass: "font-serif italic",
    initialOpacity: 0.55,
    driftX: -3,
    driftY: 2,
    duration: 6.2,
    delay: 2.5,
    activeOrder: 9,
  },
  // Right Mid - English "Hello"
  {
    id: "hello-2",
    text: "Hello",
    script: "Latin",
    color: "#5C70A8",
    activeColor: "#2B4C7E",
    left: "74%",
    top: "43%",
    fontSize: "text-base sm:text-lg md:text-[20px]",
    fontClass: "font-sans",
    initialOpacity: 0.5,
    driftX: 3,
    driftY: -3,
    duration: 7.8,
    delay: 1.9,
    activeOrder: 10,
  },
  // Right Mid - Japanese "こんにちは"
  {
    id: "konnichiwa",
    text: "こんにちは",
    script: "Japanese",
    color: "#171513",
    activeColor: "#C65B32",
    left: "75%",
    top: "52%",
    fontSize: "text-sm sm:text-base md:text-[17px]",
    fontClass: "font-sans",
    initialOpacity: 0.65,
    driftX: 2,
    driftY: 2,
    duration: 8,
    delay: 2.2,
    activeOrder: 11,
  },
  // Right Lower - Arabic "مرحباً"
  {
    id: "marhaban",
    text: "مرحباً",
    script: "Arabic",
    color: "#171513",
    activeColor: "#C65B32",
    left: "66%",
    top: "67%",
    fontSize: "text-lg sm:text-xl md:text-[23px]",
    fontClass: "font-serif",
    initialOpacity: 0.75,
    driftX: 3,
    driftY: 3,
    duration: 7,
    delay: 0.9,
    activeOrder: 12,
  },
];

export function Hero() {
  const [isActive, setIsActive] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Trigger interactive "Hear Vaakriti" activation
  const handleActivateVoice = () => {
    setIsActive(true);
    setActiveStep(1);

    // Sequential illumination of greetings
    let step = 1;
    const interval = setInterval(() => {
      step++;
      if (step > 12) {
        clearInterval(interval);
      } else {
        setActiveStep(step);
      }
    }, 280);

    // Audio preview via Web Speech API
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        "Namaste. Main Vaakriti hoon. The creation of voice."
      );
      utterance.rate = 0.95;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const indianVoice = voices.find(
        (v) =>
          v.lang.includes("hi") ||
          v.lang.includes("en-IN") ||
          v.name.toLowerCase().includes("india")
      );
      if (indianVoice) utterance.voice = indianVoice;

      utterance.onend = () => {
        setIsActive(false);
        setActiveStep(0);
      };
      utterance.onerror = () => {
        setIsActive(false);
        setActiveStep(0);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        setIsActive(false);
        setActiveStep(0);
      }, 4000);
    }
  };

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
    <section className="relative w-full h-screen min-h-[780px] max-h-[1100px] flex flex-col justify-between overflow-hidden bg-[#F7F3EA] text-[#171513] select-none pt-[72px]">
      
      {/* ── 1. BACKGROUND: WARM IVORY WITH EXTREMELY SUBTLE GRAIN ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(#9C8E7E 0.6px, transparent 0.6px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* ── 2. LEFT SIDE ARCHITECTURAL ILLUSTRATION (ROOT: "BORN IN INDIA") ── */}
      {/* (Fine ink illustration / architectural sketch / old engraving, very low contrast, fading into ivory) */}
      <div className="pointer-events-none absolute left-0 bottom-0 top-[72px] w-[46%] sm:w-[40%] md:w-[35%] lg:w-[30%] z-0 overflow-hidden">
        <div className="relative w-full h-full opacity-22 grayscale contrast-80 sepia-[0.35] mix-blend-multiply">
          <Image
            src="/images/varanasi-ghats.jpg"
            alt="Ancient Indian Architectural Roots"
            fill
            className="object-cover object-left-bottom"
            priority
          />
          {/* Smooth feather mask to blend into warm ivory */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#F7F3EA]/30 to-[#F7F3EA]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#F7F3EA] via-transparent to-[#F7F3EA]/70" />
        </div>
      </div>

      {/* ── 3. RIGHT SIDE EXPANSIVE WHITESPACE & ORBITAL TRAJECTORIES (REACH) ── */}
      <div className="pointer-events-none absolute right-0 top-[72px] bottom-0 w-[45%] z-0 hidden md:block opacity-25">
        <svg
          viewBox="0 0 600 600"
          className="w-full h-full text-[#A89886]"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.65"
        >
          {/* Subtle orbital trajectories extending right */}
          <ellipse cx="260" cy="300" rx="220" ry="240" strokeDasharray="3 5" />
          <ellipse cx="260" cy="300" rx="300" ry="320" strokeDasharray="2 7" />
          <path d="M 80 280 Q 260 220 520 310" strokeDasharray="4 6" />
          {/* Tiny orbital nodes */}
          <circle cx="340" cy="240" r="2.5" fill="currentColor" />
          <circle cx="480" cy="305" r="3" fill="currentColor" />
        </svg>
      </div>

      {/* ── 4. MICROCOPY ANNOTATIONS ── */}
      {/* Upper-Right Microcopy: "From India / To Everywhere" */}
      <div className="absolute right-8 sm:right-12 md:right-20 top-24 sm:top-28 z-10 text-right select-none">
        <p className="font-sans text-[12px] sm:text-[13px] md:text-[14px] font-normal text-[#574B3E] leading-tight">
          From India
        </p>
        <p className="font-sans text-[12px] sm:text-[13px] md:text-[14px] font-normal text-[#574B3E] leading-tight">
          To Everywhere
        </p>
      </div>

      {/* Far-Right Edge Microcopy: "The world speaks. / We listen." */}
      <div className="absolute right-6 sm:right-10 md:right-16 top-1/2 -translate-y-1/2 z-10 hidden lg:flex flex-col items-end gap-1.5 select-none text-right">
        <span className="w-1.5 h-1.5 rounded-full bg-[#171513] mb-1" />
        <p className="font-sans text-[11px] sm:text-[12px] text-[#6E6050] leading-snug">
          The world speaks.
        </p>
        <p className="font-sans text-[11px] sm:text-[12px] text-[#6E6050] leading-snug">
          We listen.
        </p>
      </div>

      {/* ── 5. LANGUAGE SYSTEM: FLOATING FREELY AROUND THE ORB ── */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {GREETINGS.map((g) => {
          const isIlluminated = isActive && activeStep === g.activeOrder;
          return (
            <motion.div
              key={g.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 ${g.fontSize} ${g.fontClass} select-none transition-colors duration-300`}
              style={{
                left: g.left,
                top: g.top,
                color: isIlluminated ? g.activeColor : g.color,
                opacity: isIlluminated ? 1 : g.initialOpacity,
              }}
              animate={{
                x: [0, g.driftX, 0],
                y: [0, g.driftY, 0],
                opacity: isIlluminated
                  ? [1, 0.9, 1]
                  : [g.initialOpacity, g.initialOpacity * 1.15, g.initialOpacity],
              }}
              transition={{
                duration: g.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: g.delay,
              }}
            >
              {g.text}
            </motion.div>
          );
        })}
      </div>

      {/* ── 6. VISUAL CENTER: DOMINANT CENTRAL HERO ORB (420–520px) ── */}
      <div className="relative z-20 flex-1 flex items-center justify-center">
        <HeroOrb
          isActive={isActive}
          onActivate={handleActivateVoice}
        />
      </div>

      {/* ── 7. BOTTOM CTA & SCROLL CUE ── */}
      <div className="relative z-20 flex flex-col items-center justify-center pb-5 sm:pb-7">
        {/* ONE Elegant Primary Pill Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="group flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#F5EFEB] border border-[#DDD3C2] hover:border-[#171513] text-xs sm:text-[13px] font-medium text-[#29231D] shadow-[0_2px_8px_rgba(23,21,19,0.04)] hover:shadow-[0_4px_16px_rgba(23,21,19,0.08)] transition-all duration-200 cursor-pointer"
        >
          <Phone className="w-3.5 h-3.5 text-[#C65B32] group-hover:scale-110 transition-transform" />
          <span>Test a live call on your phone</span>
          <span className="text-[#8C7D6D] group-hover:text-[#171513] group-hover:translate-x-0.5 transition-all">
            →
          </span>
        </button>

        {/* Scroll To Explore with tiny animated downward indicator */}
        <div
          onClick={() => {
            window.scrollTo({
              top: window.innerHeight * 0.95,
              behavior: "smooth",
            });
          }}
          className="mt-4 flex flex-col items-center gap-1 cursor-pointer text-[#8C7D6D] hover:text-[#171513] transition-colors"
        >
          <div className="w-3.5 h-6 rounded-full border border-[#C5B7A5] flex items-start justify-center p-1">
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="w-1 h-1 rounded-full bg-[#8C7D6D]"
            />
          </div>
          <span className="text-[10px] tracking-[0.2em] uppercase font-medium">
            Scroll to explore
          </span>
        </div>
      </div>

      {/* ── 8. LIVE CALL DISPATCH MODAL ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-[2px]">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative w-full max-w-sm rounded-2xl bg-[#FAF7F0] border border-[#E2D8C9] p-6 shadow-2xl text-[#171513]"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-[#8C7D6D] hover:text-[#171513] p-1"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#C65B32]" />
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#C65B32]">
                  Live Voice Dispatch
                </span>
              </div>

              <h3 className="font-serif text-2xl font-normal text-[#171513]">
                Test a Live Call
              </h3>
              <p className="text-xs text-[#6B5E50] mt-1 mb-4 leading-relaxed">
                Enter your mobile number. Arika from Vaakriti will dial you in Hinglish with sub-400ms latency.
              </p>

              <form onSubmit={handlePhoneSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#4A4036] mb-1">
                    Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-medium text-[#7D7060]">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="98765 43210"
                      className="w-full pl-11 pr-3 py-2 rounded-xl border border-[#DDD3C2] bg-white text-xs text-[#171513] placeholder-[#A89C8E] focus:outline-none focus:border-[#C65B32]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-[#171513] hover:bg-[#C65B32] text-[#FAF7F0] font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispatching Call...</span>
                    </>
                  ) : (
                    <span>Call Me Now</span>
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
