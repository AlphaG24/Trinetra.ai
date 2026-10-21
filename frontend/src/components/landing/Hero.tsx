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
  sentence: string;
  sentencePhonetic?: string;
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
  // Top Center - Sanskrit / Hindi "नमस्ते" (Electric Cobalt) - High above the orb, ample breathing clearance
  {
    id: "namaste",
    text: "नमस्ते",
    phonetic: "Namaste",
    sentence: "नमस्ते! मैं वाकृति एआई से आपकी वॉयस असिस्टेंट बोल रही हूँ, आज मैं आपकी क्या सहायता कर सकती हूँ?",
    sentencePhonetic: "Namaste! Main Vaakriti AI se aapki voice assistant bol rahi hoon, aaj main aapki kya sahayata kar sakti hoon?",
    lang: "hi-IN",
    script: "Devanagari",
    langName: "Hindi",
    audioSrc: "/audio/greetings/hi.wav",
    color: "#2563EB",
    activeColor: "#1D4ED8",
    left: "50%",
    top: "7%",
    fontSize: "text-base sm:text-lg md:text-[18px]",
    fontClass: "font-serif font-bold",
    initialOpacity: 0.95,
    driftX: 0,
    driftY: 1,
    duration: 6,
    delay: 0,
    activeOrder: 1,
  },
  // Upper Left - English "Hello" (Obsidian Black) - Balanced diagonal
  {
    id: "hello-1",
    text: "Hello",
    phonetic: "Hello",
    sentence: "Hello! Welcome to Vaakriti. How can our autonomous voice agent empower your business today?",
    sentencePhonetic: "Hello! Welcome to Vaakriti. How can our autonomous voice agent empower your business today?",
    lang: "en-US",
    script: "Latin",
    langName: "English",
    audioSrc: "/audio/greetings/en.wav",
    color: "#0F172A",
    activeColor: "#2563EB",
    left: "27%",
    top: "18%",
    fontSize: "text-xs sm:text-sm md:text-[14px]",
    fontClass: "font-sans font-bold",
    initialOpacity: 0.85,
    driftX: -1,
    driftY: 0,
    duration: 7,
    delay: 0.8,
    activeOrder: 2,
  },
  // Upper Right - Tamil "வணக்கம்" (Obsidian Black) - Balanced diagonal
  {
    id: "vanakkam",
    text: "வணக்கம்",
    phonetic: "Vanakkam",
    sentence: "வணக்கம்! நான் வாக்ரிதி ஏஐ குரல் உதவியாளர் பேசுகிறேன், இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?",
    sentencePhonetic: "Vanakkam! Naan Vaakriti AI kural udhaviyaalar pesugiren, indru naan ungalukku evvaru udhava mudiyum?",
    lang: "ta-IN",
    script: "Tamil",
    langName: "Tamil",
    audioSrc: "/audio/greetings/ta.wav",
    color: "#0F172A",
    activeColor: "#2563EB",
    left: "73%",
    top: "18%",
    fontSize: "text-xs sm:text-sm md:text-[14px]",
    fontClass: "font-bold",
    initialOpacity: 0.85,
    driftX: 1,
    driftY: 0,
    duration: 8,
    delay: 1.2,
    activeOrder: 3,
  },
  // Mid Left Upper - Marathi / Hindi "नमस्कार" (Deep Slate) - Balanced flank
  {
    id: "namaskar",
    text: "नमस्कार",
    phonetic: "Namaskar",
    sentence: "नमस्कार! मी वाकृति एआय वॉयस असिस्टंट बोलतेय, आज मी तुम्हाला कशी मदत करू शकते?",
    sentencePhonetic: "Namaskar! Me Vaakriti AI voice assistant boltey, aaj me tumhala kashi madat karu shakte?",
    lang: "mr-IN",
    script: "Devanagari",
    langName: "Marathi",
    audioSrc: "/audio/greetings/mr.wav",
    color: "#1E293B",
    activeColor: "#2563EB",
    left: "18%",
    top: "33%",
    fontSize: "text-xs sm:text-sm md:text-[14px]",
    fontClass: "font-serif font-bold",
    initialOpacity: 0.88,
    driftX: -1,
    driftY: 0,
    duration: 6.5,
    delay: 0.3,
    activeOrder: 4,
  },
  // Mid Right Upper - Arabic/Urdu "Salaam" (Electric Cobalt) - Balanced flank
  {
    id: "salaam",
    text: "Salaam",
    phonetic: "Salaam",
    sentence: "السلام علیکم! میں واکریتی اے آئی سے آپ کی وائس اسسٹنٹ ہوں، آج آپ کی کیا خدمت کر سکتی ہوں؟",
    sentencePhonetic: "Assalam-o-Alaikum! Main Vaakriti AI se aapki voice assistant बोल रही हूँ, आज आपकी क्या ख़िदमत कर सकती हूँ?",
    lang: "ur-IN",
    script: "Latin/Urdu",
    langName: "Urdu",
    audioSrc: "/audio/greetings/ur.wav",
    color: "#2563EB",
    activeColor: "#1D4ED8",
    left: "82%",
    top: "33%",
    fontSize: "text-xs sm:text-sm md:text-[14px]",
    fontClass: "font-serif italic font-bold",
    initialOpacity: 0.88,
    driftX: 1,
    driftY: 0,
    duration: 7.2,
    delay: 1.6,
    activeOrder: 5,
  },
  // Far Left Mid - Sanskrit "हृदा" (Cobalt Cyan) - Balanced outer equator
  {
    id: "hrida",
    text: "हृदा",
    phonetic: "Hrida",
    sentence: "हृदा स्वागतम्! वाकृति एआई वाग्-सहायके भवतां स्वागतम्, कथम् अहं साहाय्यं कर्तुं शक्नोमि?",
    sentencePhonetic: "Hrida swagatam! Vaakriti AI vaak-sahayake bhavatam swagatam, katham aham saahayyam kartum shaknomi?",
    lang: "hi-IN",
    script: "Devanagari",
    langName: "Sanskrit",
    audioSrc: "/audio/greetings/sa.wav",
    color: "#0284C7",
    activeColor: "#2563EB",
    left: "14%",
    top: "50%",
    fontSize: "text-[11px] sm:text-xs md:text-[12px]",
    fontClass: "font-serif font-bold",
    initialOpacity: 0.82,
    driftX: -1,
    driftY: 0,
    duration: 7.5,
    delay: 0.5,
    activeOrder: 6,
  },
  // Far Right Mid - Spanish "Hola" (Rich Slate) - Balanced outer equator
  {
    id: "hola",
    text: "Hola",
    phonetic: "Hola",
    sentence: "¡Hola! Bienvenido a Vaakriti AI. ¿En qué podemos ayudarte el día de hoy?",
    sentencePhonetic: "¡Hola! Bienvenido a Vaakriti AI. ¿En qué podemos ayudarte el día de hoy?",
    lang: "es-ES",
    script: "Latin",
    langName: "Spanish",
    audioSrc: "/audio/greetings/es.mp3",
    color: "#334155",
    activeColor: "#2563EB",
    left: "86%",
    top: "50%",
    fontSize: "text-xs sm:text-sm md:text-[13px]",
    fontClass: "font-sans font-bold",
    initialOpacity: 0.8,
    driftX: 1,
    driftY: 0,
    duration: 6.8,
    delay: 2.1,
    activeOrder: 7,
  },
  // Mid Left Lower - Punjabi "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ" (Obsidian Black) - Balanced lower-left
  {
    id: "sat-sri-akal",
    text: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ",
    phonetic: "Sat Sri Akal",
    sentence: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ਮੈਂ ਵਾਕ੍ਰਿਤੀ ਏਆਈ ਤੋਂ ਬੋਲ ਰਹੀ ਹਾਂ, ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਸੇਵਾ ਕਰ ਸਕਦੀ ਹਾਂ?",
    sentencePhonetic: "Sat Sri Akal ji! Main Vaakriti AI ton bol rahi haan, ajj main tuhadi ki sewa kar sakdi haan?",
    lang: "pa-IN",
    script: "Gurmukhi",
    langName: "Punjabi",
    audioSrc: "/audio/greetings/pa.wav",
    color: "#0F172A",
    activeColor: "#2563EB",
    left: "18%",
    top: "67%",
    fontSize: "text-xs sm:text-sm md:text-[14px]",
    fontClass: "font-bold",
    initialOpacity: 0.85,
    driftX: -1,
    driftY: 0,
    duration: 8.5,
    delay: 1.4,
    activeOrder: 8,
  },
  // Mid Right Lower - English "Hello" (Cyan Cobalt) - Balanced lower-right
  {
    id: "hello-2",
    text: "Hello",
    phonetic: "Hello",
    sentence: "Hello! Thank you for connecting with Vaakriti. Let's transform your customer experience with intelligent voice automation.",
    sentencePhonetic: "Hello! Thank you for connecting with Vaakriti. Let's transform your customer experience with intelligent voice automation.",
    lang: "en-US",
    script: "Latin",
    langName: "English",
    audioSrc: "/audio/greetings/en2.wav",
    color: "#0284C7",
    activeColor: "#2563EB",
    left: "82%",
    top: "67%",
    fontSize: "text-xs sm:text-sm md:text-[13px]",
    fontClass: "font-sans font-bold",
    initialOpacity: 0.85,
    driftX: 1,
    driftY: 0,
    duration: 7.8,
    delay: 1.9,
    activeOrder: 9,
  },
  // Bottom Left - French "Bonjour" (Slate Charcoal) - Balanced bottom-left
  {
    id: "bonjour",
    text: "Bonjour",
    phonetic: "Bonjour",
    sentence: "Bonjour! Bienvenue chez Vaakriti AI. Comment puis-je vous aider aujourd'hui?",
    sentencePhonetic: "Bonjour! Bienvenue chez Vaakriti AI. Comment puis-je vous aider aujourd'hui?",
    lang: "fr-FR",
    script: "Latin",
    langName: "French",
    audioSrc: "/audio/greetings/fr.mp3",
    color: "#334155",
    activeColor: "#2563EB",
    left: "27%",
    top: "82%",
    fontSize: "text-xs sm:text-sm md:text-[13px]",
    fontClass: "font-serif italic font-bold",
    initialOpacity: 0.8,
    driftX: -1,
    driftY: 0,
    duration: 6.2,
    delay: 2.5,
    activeOrder: 10,
  },
  // Bottom Right - Arabic "مرحباً" (Deep Slate) - Balanced bottom-right
  {
    id: "marhaban",
    text: "مرحباً",
    phonetic: "Marhaban",
    sentence: "مرحباً بكم في واكريتي للذكاء الاصطناعي، كيف يمكنني مساعدتكم اليوم؟",
    sentencePhonetic: "Marhaban bikum fi Vaakriti lil-dhaka' al-istina'i, kayfa yumkinuni musa'adatukum al-yawm?",
    lang: "ar-SA",
    script: "Arabic",
    langName: "Arabic",
    audioSrc: "/audio/greetings/ar.mp3",
    color: "#1E293B",
    activeColor: "#2563EB",
    left: "73%",
    top: "82%",
    fontSize: "text-xs sm:text-sm md:text-[14px]",
    fontClass: "font-serif font-bold",
    initialOpacity: 0.88,
    driftX: 1,
    driftY: 0,
    duration: 7,
    delay: 0.9,
    activeOrder: 11,
  },
  // Bottom Center - Japanese "こんにちは" (Obsidian Black) - Centered safely below orb
  {
    id: "konnichiwa",
    text: "こんにちは",
    phonetic: "Konnichiwa",
    sentence: "こんにちは！ヴァクリティAIへようこそ。本日はどのようなご用件でしょうか？",
    sentencePhonetic: "Konnichiwa! Vaakriti AI he yokoso. Honjitsu wa dono yona go-yoken desho ka?",
    lang: "ja-JP",
    script: "Japanese",
    langName: "Japanese",
    audioSrc: "/audio/greetings/ja.mp3",
    color: "#0F172A",
    activeColor: "#2563EB",
    left: "50%",
    top: "93%",
    fontSize: "text-[11px] sm:text-xs md:text-[12px]",
    fontClass: "font-sans font-bold",
    initialOpacity: 0.82,
    driftX: 0,
    driftY: -1,
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

            const textToSpeak = matched
              ? (g.sentence || g.text)
              : (g.sentencePhonetic || g.sentence || g.phonetic || g.text);
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

    window.speechSynthesis?.cancel();

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

    // Cancel any pending browser speech synthesis immediately to avoid overlapping speech
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
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

        audio.onerror = (e) => {
          console.warn("[Hero] Greeting audio playback error, falling back to speech synthesis:", e);
          speakGreetingText(g);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err: any) => {
            // Ignore AbortError / NotAllowedError caused by rapid clicking or pause
            if (err?.name === "AbortError" || err?.name === "NotAllowedError") return;
            console.warn("[Hero] Greeting audio play notice:", err?.message);
          });
        }
      } catch (audioErr) {
        console.warn("[Hero] Greeting audio creation error:", audioErr);
        speakGreetingText(g);
      }
    } else {
      speakGreetingText(g);
    }

    toast.success(`Agent speaks (${g.langName}): "${g.sentence || g.phonetic || g.text}"`, {
      duration: 3500,
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
    <section className="relative w-full h-[100dvh] min-h-[660px] max-h-[1080px] flex flex-col overflow-hidden bg-[#FAFAFA] select-none pt-[104px] sm:pt-[112px] md:pt-[116px] transition-colors duration-500">
      
      {/* ── 1. LUMINOUS AMBIENT VOLUMETRIC BACKDROP ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 select-none opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 48%, rgba(37,99,235,0.07) 0%, rgba(2,132,199,0.03) 40%, rgba(250,250,250,0) 80%)",
        }}
      />

      {/* ── 2. HERO CENTER STAGE & 3D ACOUSTIC ORB (CENTERED NATURALLY WITHIN REMAINING VIEWPORT) ── */}
      <div className="relative z-20 flex-1 flex items-center justify-center pb-6 sm:pb-8">
        
        {/* Floating Multilingual Words (Pure Floating Typography - No boxes, No icons, Spaced cleanly outside the orb) */}
        <div className="absolute inset-0 max-w-[860px] mx-auto overflow-visible pointer-events-none px-4">
          {GREETINGS.map((g) => {
            const isIlluminated = speakingWordId === g.id;
            return (
              <motion.button
                key={g.id}
                type="button"
                onClick={() => handleGreetingClick(g)}
                title={`${g.text} (${g.langName})`}
                aria-label={`Listen to ${g.langName} greeting: "${g.sentence}"`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${g.fontSize} ${g.fontClass} select-none transition-all duration-300 pointer-events-auto cursor-pointer focus:outline-none hover:scale-110 active:scale-95 z-30 group p-1 ${
                  isIlluminated
                    ? "text-[#2563EB] font-extrabold drop-shadow-[0_0_14px_rgba(37,99,235,0.75)] scale-110"
                    : "text-[#0F172A] font-bold drop-shadow-[0_1px_2px_rgba(15,23,42,0.12)] hover:text-[#2563EB]"
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
                <span className="tracking-wide font-bold sm:font-extrabold">{g.text}</span>
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
          className="absolute inset-x-0 bottom-0 h-20 sm:h-24"
          style={{
            background:
              "linear-gradient(180deg, rgba(147,197,253,0) 0%, rgba(147,197,253,0.40) 60%, rgba(147,197,253,0.75) 100%)",
          }}
        />
      </div>

      {/* ── 4. PREVIOUSLY BUILT TELEPHONY CALLBACK MODAL (UPDATED TO LUMINOUS SOVEREIGN AI THEME) ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-[#080810]/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="relative w-full max-w-md border border-white/10 bg-[#0C101A] p-6 md:p-8 rounded-3xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.7),0_0_40px_rgba(37,99,235,0.2)] space-y-6 text-left text-white overflow-hidden"
            >
              {/* Subtle top atmospheric glow */}
              <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-24 bg-[#2563EB]/25 blur-3xl rounded-full" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer z-20"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>

              {/* Header */}
              <div className="space-y-1.5 relative z-10">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-[#2563EB]/15 border border-[#2563EB]/30 text-[#60A5FA] mb-1">
                  <span>Live Sandbox Demonstration</span>
                </div>
                <h3 className="text-xl font-bold font-sans text-white tracking-tight">
                  Receive a Live Call
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Experience {VOICE_AGENT_NAME}&apos;s real-time sales and service conversation directly on your phone.
                </p>
              </div>

              {success ? (
                <div className="space-y-4 text-center py-6 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.2)]">
                    <Phone className="w-7 h-7 animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-white">Calling you now!</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Answer the incoming call on your phone to start the live interactive demonstration.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-4 px-6 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Close Sandbox
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCallbackSubmit} className="space-y-4 relative z-10">
                  {error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl font-medium">
                      {error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 font-sans">
                      Your Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="e.g. +91 99999 88888 or 10-digit number"
                        className="w-full pl-10 pr-4 py-3 bg-[#131926] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:bg-[#182236] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 focus:border-[#2563EB] transition font-sans"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 font-sans">
                      Converse in Language
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[#131926] border border-white/10 rounded-xl text-xs text-white focus:bg-[#182236] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 focus:border-[#2563EB] transition cursor-pointer appearance-none font-sans"
                      >
                        <option value="hi" className="bg-[#131926] text-white">Hindi (Indian Accent)</option>
                        <option value="en-IN" className="bg-[#131926] text-white">English (Indian Accent)</option>
                        <option value="en-US" className="bg-[#131926] text-white">English (US Accent)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:shadow-[0_6px_26px_rgba(37,99,235,0.55)] active:scale-[0.99] font-sans"
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


