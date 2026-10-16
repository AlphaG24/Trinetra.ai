"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Phone, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { VOICE_AGENT_NAME } from "@/lib/agent-branding";
import { HeroOrb } from "./HeroOrb";

export interface FloatingGreeting {
  id: string;
  text: string;
  phonetic: string;
  lang: string;
  script: string;
  langName: string;
  audioSrc?: string;
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

// Multilingual Greetings floating cleanly around the elevated core (completely outside the orb perimeter)
const GREETINGS: FloatingGreeting[] = [
  // Top Center - Sanskrit / Hindi "नमस्ते" (Electric Cobalt) - High above the orb
  {
    id: "namaste",
    text: "नमस्ते",
    phonetic: "Namaste",
    lang: "hi-IN",
    script: "Devanagari",
    langName: "Hindi",
    audioSrc: "/audio/greetings/hi.wav",
    color: "#2563EB",
    activeColor: "#1D4ED8",
    left: "50%",
    top: "8%",
    fontSize: "text-base sm:text-lg md:text-[18px]",
    fontClass: "font-serif font-medium",
    initialOpacity: 0.95,
    driftX: 2,
    driftY: -3,
    duration: 6,
    delay: 0,
    activeOrder: 1,
  },
  // Upper Left - English "Hello" (Obsidian Black) - Safely in upper-left quadrant
  {
    id: "hello-1",
    text: "Hello",
    phonetic: "Hello",
    lang: "en-US",
    script: "Latin",
    langName: "English",
    audioSrc: "/audio/greetings/en.wav",
    color: "#0F172A",
    activeColor: "#2563EB",
    left: "24%",
    top: "15%",
    fontSize: "text-xs sm:text-sm md:text-[14px]",
    fontClass: "font-sans font-medium",
    initialOpacity: 0.85,
    driftX: -3,
    driftY: -2,
    duration: 7,
    delay: 0.8,
    activeOrder: 2,
  },
  // Upper Right - Tamil "வணக்கம்" (Obsidian Black) - Safely in upper-right quadrant
  {
    id: "vanakkam",
    text: "வணக்கம்",
    phonetic: "Vanakkam",
    lang: "ta-IN",
    script: "Tamil",
    langName: "Tamil",
    audioSrc: "/audio/greetings/ta.wav",
    color: "#0F172A",
    activeColor: "#2563EB",
    left: "76%",
    top: "15%",
    fontSize: "text-xs sm:text-sm md:text-[14px]",
    fontClass: "font-medium",
    initialOpacity: 0.85,
    driftX: 3,
    driftY: -2,
    duration: 8,
    delay: 1.2,
    activeOrder: 3,
  },
  // Mid Left Upper - Marathi / Hindi "नमस्कार" (Deep Slate)
  {
    id: "namaskar",
    text: "नमस्कार",
    phonetic: "Namaskar",
    lang: "mr-IN",
    script: "Devanagari",
    langName: "Marathi",
    audioSrc: "/audio/greetings/mr.wav",
    color: "#1E293B",
    activeColor: "#2563EB",
    left: "14%",
    top: "32%",
    fontSize: "text-xs sm:text-sm md:text-[14px]",
    fontClass: "font-serif font-medium",
    initialOpacity: 0.88,
    driftX: -3,
    driftY: 2,
    duration: 6.5,
    delay: 0.3,
    activeOrder: 4,
  },
  // Mid Right Upper - Arabic/Urdu "Salaam" (Electric Cobalt)
  {
    id: "salaam",
    text: "Salaam",
    phonetic: "Salaam",
    lang: "ur-IN",
    script: "Latin/Urdu",
    langName: "Urdu",
    audioSrc: "/audio/greetings/ur.wav",
    color: "#2563EB",
    activeColor: "#1D4ED8",
    left: "86%",
    top: "32%",
    fontSize: "text-xs sm:text-sm md:text-[14px]",
    fontClass: "font-serif italic font-medium",
    initialOpacity: 0.88,
    driftX: 3,
    driftY: 2,
    duration: 7.2,
    delay: 1.6,
    activeOrder: 5,
  },
  // Far Left Mid - Sanskrit "हृदा" (Cobalt Cyan)
  {
    id: "hrida",
    text: "हृदा",
    phonetic: "Hrida",
    lang: "hi-IN",
    script: "Devanagari",
    langName: "Sanskrit",
    color: "#0284C7",
    activeColor: "#2563EB",
    left: "10%",
    top: "49%",
    fontSize: "text-[11px] sm:text-xs md:text-[12px]",
    fontClass: "font-serif font-medium",
    initialOpacity: 0.82,
    driftX: -2,
    driftY: -2,
    duration: 7.5,
    delay: 0.5,
    activeOrder: 6,
  },
  // Far Right Mid - Spanish "Hola" (Rich Slate)
  {
    id: "hola",
    text: "Hola",
    phonetic: "Hola",
    lang: "es-ES",
    script: "Latin",
    langName: "Spanish",
    audioSrc: "/audio/greetings/es.mp3",
    color: "#334155",
    activeColor: "#2563EB",
    left: "90%",
    top: "49%",
    fontSize: "text-xs sm:text-sm md:text-[13px]",
    fontClass: "font-sans font-medium",
    initialOpacity: 0.8,
    driftX: 2,
    driftY: -2,
    duration: 6.8,
    delay: 2.1,
    activeOrder: 7,
  },
  // Mid Left Lower - Punjabi "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ" (Obsidian Black)
  {
    id: "sat-sri-akal",
    text: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ",
    phonetic: "Sat Sri Akal",
    lang: "pa-IN",
    script: "Gurmukhi",
    langName: "Punjabi",
    audioSrc: "/audio/greetings/pa.wav",
    color: "#0F172A",
    activeColor: "#2563EB",
    left: "14%",
    top: "66%",
    fontSize: "text-xs sm:text-sm md:text-[14px]",
    fontClass: "font-medium",
    initialOpacity: 0.85,
    driftX: -2,
    driftY: 2,
    duration: 8.5,
    delay: 1.4,
    activeOrder: 8,
  },
  // Mid Right Lower - English "Hello" (Cyan Cobalt)
  {
    id: "hello-2",
    text: "Hello",
    phonetic: "Hello",
    lang: "en-US",
    script: "Latin",
    langName: "English",
    audioSrc: "/audio/greetings/en.wav",
    color: "#0284C7",
    activeColor: "#2563EB",
    left: "86%",
    top: "66%",
    fontSize: "text-xs sm:text-sm md:text-[13px]",
    fontClass: "font-sans font-medium",
    initialOpacity: 0.85,
    driftX: 2,
    driftY: -2,
    duration: 7.8,
    delay: 1.9,
    activeOrder: 9,
  },
  // Bottom Left - French "Bonjour" (Slate Charcoal)
  {
    id: "bonjour",
    text: "Bonjour",
    phonetic: "Bonjour",
    lang: "fr-FR",
    script: "Latin",
    langName: "French",
    audioSrc: "/audio/greetings/fr.mp3",
    color: "#334155",
    activeColor: "#2563EB",
    left: "24%",
    top: "83%",
    fontSize: "text-xs sm:text-sm md:text-[13px]",
    fontClass: "font-serif italic font-medium",
    initialOpacity: 0.8,
    driftX: -2,
    driftY: 2,
    duration: 6.2,
    delay: 2.5,
    activeOrder: 10,
  },
  // Bottom Right - Arabic "مرحباً" (Deep Slate)
  {
    id: "marhaban",
    text: "مرحباً",
    phonetic: "Marhaban",
    lang: "ar-SA",
    script: "Arabic",
    langName: "Arabic",
    audioSrc: "/audio/greetings/ar.mp3",
    color: "#1E293B",
    activeColor: "#2563EB",
    left: "76%",
    top: "83%",
    fontSize: "text-xs sm:text-sm md:text-[14px]",
    fontClass: "font-serif font-medium",
    initialOpacity: 0.88,
    driftX: 2,
    driftY: 2,
    duration: 7,
    delay: 0.9,
    activeOrder: 11,
  },
  // Bottom Center - Japanese "こんにちは" (Obsidian Black) - Cleared below the orb
  {
    id: "konnichiwa",
    text: "こんにちは",
    phonetic: "Konnichiwa",
    lang: "ja-JP",
    script: "Japanese",
    langName: "Japanese",
    audioSrc: "/audio/greetings/ja.mp3",
    color: "#0F172A",
    activeColor: "#2563EB",
    left: "50%",
    top: "91%",
    fontSize: "text-[11px] sm:text-xs md:text-[12px]",
    fontClass: "font-sans font-medium",
    initialOpacity: 0.82,
    driftX: 2,
    driftY: 2,
    duration: 8,
    delay: 2.2,
    activeOrder: 12,
  },
];

export function Hero() {
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [targetHeading, setTargetHeading] = useState<{ x: number; y: number } | null>(null);
  const [speakingWordId, setSpeakingWordId] = useState<string | null>(null);

  // Exact Previously Built Telephony Callback Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [language, setLanguage] = useState("hi");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeAudioElRef = useRef<HTMLAudioElement | null>(null);
  const speechIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Natural harmonic envelope for acoustic simulation (smooth, rhythmic human speech cadence)
  const startSpeechSimulation = useCallback(() => {
    if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
    let step = 0;
    speechIntervalRef.current = setInterval(() => {
      step++;
      // Smooth sinusoidal acoustic breath (gentle rise and fall)
      const cadence = Math.sin(step * 0.16) * 0.22 + 0.42;
      setAudioLevel(Math.max(0.18, Math.min(0.75, cadence)));
    }, 110);
  }, []);

  const stopSpeechSimulation = useCallback(() => {
    if (speechIntervalRef.current) {
      clearInterval(speechIntervalRef.current);
      speechIntervalRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Listen for global navbar announcement or trigger events to open Get a Call modal
  useEffect(() => {
    const handleOpenCallbackModal = () => {
      setIsModalOpen(true);
      setSuccess(false);
      setError(null);
      setPhoneInput("");
    };
    if (typeof window !== "undefined") {
      window.addEventListener("open-hero-callback-modal", handleOpenCallbackModal);
      return () => {
        window.removeEventListener("open-hero-callback-modal", handleOpenCallbackModal);
      };
    }
  }, []);

  // Prime speech synthesis voices on mount
  useEffect(() => {
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

  // Web Audio Harmonic Vocal Chime
  const playAgentChime = useCallback(() => {
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
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.38);
    } catch {}
  }, []);

  // Web Speech API fallback that always works with phonetic pronunciation
  const speakGreetingText = useCallback(
    (g: FloatingGreeting) => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.resume();
          window.speechSynthesis.cancel();

          setTimeout(() => {
            const voices = window.speechSynthesis.getVoices();
            const prefix = g.lang.split("-")[0].toLowerCase();
            const matched =
              voices.find((v) => v.lang.toLowerCase() === g.lang.toLowerCase()) ||
              voices.find((v) => v.lang.toLowerCase().startsWith(prefix));

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
              setSpeakingWordId(null);
              stopSpeechSimulation();
              setTimeout(() => setTargetHeading(null), 800);
            };
            utterance.onerror = () => {
              setSpeakingWordId(null);
              stopSpeechSimulation();
              setTimeout(() => setTargetHeading(null), 800);
            };

            window.speechSynthesis.speak(utterance);
          }, 35);
        } catch {
          setTimeout(() => {
            setSpeakingWordId(null);
            stopSpeechSimulation();
            setTimeout(() => setTargetHeading(null), 800);
          }, 1500);
        }
      } else {
        setTimeout(() => {
          setSpeakingWordId(null);
          stopSpeechSimulation();
          setTimeout(() => setTargetHeading(null), 800);
        }, 1500);
      }
    },
    [stopSpeechSimulation]
  );

  // Play greeting audio reliably through speakers & animate 3D particle sphere
  const handleGreetingClick = (g: FloatingGreeting) => {
    if (typeof window === "undefined") return;

    playAgentChime();
    setSpeakingWordId(g.id);

    const xCoord = parseFloat(g.left) / 100 || 0.5;
    const yCoord = parseFloat(g.top) / 100 || 0.5;
    setTargetHeading({ x: xCoord, y: yCoord });
    startSpeechSimulation();

    if (activeAudioElRef.current) {
      try {
        activeAudioElRef.current.pause();
        activeAudioElRef.current.currentTime = 0;
      } catch {}
      activeAudioElRef.current = null;
    }

    if (g.audioSrc) {
      try {
        const audio = new Audio(g.audioSrc);
        audio.volume = 1.0;
        activeAudioElRef.current = audio;

        audio.onended = () => {
          setSpeakingWordId(null);
          stopSpeechSimulation();
          setTimeout(() => setTargetHeading(null), 800);
        };

        audio.onerror = () => {
          speakGreetingText(g);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            speakGreetingText(g);
          });
        }
      } catch {
        speakGreetingText(g);
      }
    } else {
      speakGreetingText(g);
    }

    toast.success(`Agent speaks: "${g.phonetic || g.text}" (${g.langName})`, {
      duration: 2500,
    });
  };

  // Clicking on the 3D sphere orb opens the previously-built "Get a Call" modal
  const handleSphereClick = () => {
    setIsModalOpen(true);
    setSuccess(false);
    setError(null);
    setPhoneInput("");
  };

  // Exact callback submission logic from previous implementation
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
          language,
        }),
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
    <section className="relative w-full min-h-screen flex flex-col justify-between overflow-hidden bg-[#FAFAFA] select-none pt-24 sm:pt-28 md:pt-30 pb-0 transition-colors duration-500">
      
      {/* ── 1. LUMINOUS AMBIENT VOLUMETRIC BACKDROP ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 select-none opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 42%, rgba(37,99,235,0.07) 0%, rgba(2,132,199,0.03) 40%, rgba(250,250,250,0) 80%)",
        }}
      />

      {/* ── 2. ELEVATED HERO CENTER STAGE (OBJECT & GREETINGS MOVED A BIT ABOVE) ── */}
      <div className="relative z-20 flex-1 flex items-center justify-center -translate-y-8 sm:-translate-y-12 md:-translate-y-14">
        
        {/* Floating Multilingual Words (Pure Floating Typography - No boxes, No icons, Spaced cleanly outside the orb) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {GREETINGS.map((g) => {
            const isIlluminated = speakingWordId === g.id;
            return (
              <motion.button
                key={g.id}
                type="button"
                onClick={() => handleGreetingClick(g)}
                title={`Click to hear agent speak "${g.text}" (${g.phonetic}) in ${g.langName}`}
                aria-label={`Listen to ${g.text} in ${g.langName}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${g.fontSize} ${g.fontClass} select-none transition-all duration-300 pointer-events-auto cursor-pointer focus:outline-none hover:scale-110 active:scale-95 z-30 group p-1 ${
                  isIlluminated
                    ? "text-[#2563EB] font-bold drop-shadow-[0_0_12px_rgba(37,99,235,0.7)] scale-110"
                    : "text-[#0F172A]/70 hover:text-[#2563EB] hover:drop-shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                }`}
                style={{
                  left: g.left,
                  top: g.top,
                }}
                animate={{
                  x: [0, g.driftX, 0],
                  y: [0, g.driftY, 0],
                }}
                transition={{
                  duration: g.duration,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: g.delay,
                }}
              >
                <span className="tracking-wide font-medium">{g.text}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Pure 3D Acoustic Particle Sphere (Click opens modal, Hover excites particles, Voice flows whole object) */}
        <HeroOrb
          isActive={isModalOpen}
          audioLevel={audioLevel}
          targetHeading={targetHeading}
          onActivate={handleSphereClick}
        />
      </div>

      {/* ── 3. SEAMLESS ORGANIC CLOUD / MIST FLOW (NO HORIZONTAL BORDER, FULL BLEED TO BOTTOM) ── */}
      {/* Zero clipping, zero border line: color slowly fades and mixes seamlessly into #FAFAFA */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none">
        
        {/* Layer 1: Seamless Vertical Diffusion (Zero hard lines; starts transparent at 32%, gently mixes down to rich blue) */}
        <div
          className="absolute inset-x-0 bottom-0 top-1/4"
          style={{
            background:
              "linear-gradient(180deg, rgba(250,250,250,0) 0%, rgba(219,234,254,0.12) 40%, rgba(191,219,254,0.32) 68%, rgba(147,197,253,0.60) 88%, rgba(147,197,253,0.88) 100%)",
          }}
        />

        {/* Layer 2: Left Flank Organic Billowing Cloud Mist (covers half the section height on the left, soft blur) */}
        <div
          className="absolute -bottom-24 -left-20 w-[500px] sm:w-[650px] lg:w-[820px] h-[480px] sm:h-[620px] lg:h-[750px] rounded-full blur-[100px] opacity-75"
          style={{
            background:
              "radial-gradient(circle at 30% 75%, rgba(37,99,235,0.28) 0%, rgba(2,132,199,0.16) 40%, rgba(219,234,254,0.06) 65%, transparent 80%)",
          }}
        />

        {/* Layer 3: Right Flank Organic Billowing Cloud Mist (covers half the section height on the right, soft blur) */}
        <div
          className="absolute -bottom-24 -right-20 w-[500px] sm:w-[650px] lg:w-[820px] h-[480px] sm:h-[620px] lg:h-[750px] rounded-full blur-[100px] opacity-75"
          style={{
            background:
              "radial-gradient(circle at 70% 75%, rgba(37,99,235,0.28) 0%, rgba(2,132,199,0.16) 40%, rgba(219,234,254,0.06) 65%, transparent 80%)",
          }}
        />

        {/* Layer 4: Bottom Ambient Anchor (ensures 100% full-bleed coverage with zero bottom white gap) */}
        <div
          className="absolute inset-x-0 bottom-0 h-28 sm:h-36"
          style={{
            background:
              "linear-gradient(180deg, rgba(147,197,253,0) 0%, rgba(147,197,253,0.50) 60%, rgba(147,197,253,0.85) 100%)",
          }}
        />
      </div>

      {/* ── 4. PREVIOUSLY BUILT TELEPHONY CALLBACK MODAL (RESTORED EXACTLY) ── */}
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


