"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Globe,
  ChevronDown,
  Menu,
  X,
  Zap,
  Clock,
  Layers,
  BookOpen,
  ShieldCheck,
  Languages,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   VAAKRITI HERO SECTION
   - Dashboard Font Style: Space Grotesk (font-heading / font-display) & Inter (font-sans)
   - Central half-reflecting glassy orb with dual-side flowing ribbons
   - Left: Orange flowing silk ribbon structure
   - Right: Blue flowing silk ribbon structure
   - Mid of orb: "vaakriti" & meaning line "वाक् · कृति"
   - Dual-color brightened background aura (Orange left, Blue right)
   - No swipe/scroll button
   ═══════════════════════════════════════════════════════════════════════════ */

interface HeroProps {
  hideNavbar?: boolean;
}

interface GreetingItem {
  id: string;
  text: string;
  color: string;
  left: string;
  top: string;
  size: string;
  fontFamily?: string;
  fontStyle?: string;
  tier: 1 | 2 | 3;
}

const GREETINGS: GreetingItem[] = [
  {
    id: "hello-1",
    text: "Hello",
    color: "#5A4E44",
    left: "36%",
    top: "13%",
    size: "text-[18px] lg:text-[22px]",
    fontFamily: "var(--font-heading, 'Space Grotesk', sans-serif)",
    tier: 2,
  },
  {
    id: "namaste",
    text: "नमस्ते",
    color: "#C8321E",
    left: "51.5%",
    top: "13%",
    size: "text-[22px] lg:text-[28px]",
    fontFamily: "'Noto Serif Devanagari', Georgia, serif",
    fontStyle: "font-semibold",
    tier: 1,
  },
  {
    id: "vanakkam",
    text: "வணக்கம்",
    color: "#1C1410",
    left: "69%",
    top: "15%",
    size: "text-[18px] lg:text-[23px]",
    fontFamily: "'Noto Sans Tamil', system-ui, sans-serif",
    tier: 1,
  },
  {
    id: "namaskar",
    text: "नमस्कार",
    color: "#C8321E",
    left: "30%",
    top: "27%",
    size: "text-[19px] lg:text-[24px]",
    fontFamily: "'Noto Serif Devanagari', Georgia, serif",
    tier: 1,
  },
  {
    id: "salaam",
    text: "Salaam",
    color: "#4A6382",
    left: "73.5%",
    top: "23%",
    size: "text-[18px] lg:text-[22px]",
    fontFamily: "var(--font-heading, 'Space Grotesk', sans-serif)",
    fontStyle: "italic",
    tier: 2,
  },
  {
    id: "hrida",
    text: "हृदा",
    color: "#7D6B5C",
    left: "28%",
    top: "42%",
    size: "text-[15px] lg:text-[18px]",
    fontFamily: "'Noto Serif Devanagari', Georgia, serif",
    tier: 3,
  },
  {
    id: "hola",
    text: "Hola",
    color: "#5A4E44",
    left: "81.5%",
    top: "28%",
    size: "text-[16px] lg:text-[19px]",
    fontFamily: "var(--font-heading, 'Space Grotesk', sans-serif)",
    tier: 3,
  },
  {
    id: "sat-sri-akal",
    text: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ",
    color: "#1C1410",
    left: "29%",
    top: "55%",
    size: "text-[16px] lg:text-[19px]",
    fontFamily: "'Noto Sans Gurmukhi', system-ui, sans-serif",
    tier: 2,
  },
  {
    id: "bonjour",
    text: "Bonjour",
    color: "#5A4E44",
    left: "36%",
    top: "68%",
    size: "text-[17px] lg:text-[21px]",
    fontFamily: "var(--font-heading, 'Space Grotesk', sans-serif)",
    fontStyle: "italic",
    tier: 3,
  },
  {
    id: "hello-2",
    text: "Hello",
    color: "#5C7AA6",
    left: "75%",
    top: "45%",
    size: "text-[17px] lg:text-[21px]",
    fontFamily: "var(--font-heading, 'Space Grotesk', sans-serif)",
    tier: 2,
  },
  {
    id: "konnichiwa",
    text: "こんにちは",
    color: "#1C1410",
    left: "77%",
    top: "54%",
    size: "text-[15px] lg:text-[18px]",
    fontFamily: "'Noto Sans JP', system-ui, sans-serif",
    tier: 3,
  },
  {
    id: "marhaban",
    text: "مرحباً",
    color: "#1C1410",
    left: "67%",
    top: "68%",
    size: "text-[20px] lg:text-[25px]",
    fontFamily: "'Noto Sans Arabic', system-ui, sans-serif",
    tier: 2,
  },
];

const FEATURE_ITEMS = [
  {
    icon: Languages,
    title: "Multilingual & code-switch",
    subtitle: "native voice understanding",
  },
  {
    icon: Zap,
    title: "Deploy in 60 seconds",
    subtitle: "zero setup turnaround",
  },
  {
    icon: Clock,
    title: "Works 24/7 on calls",
    subtitle: "uninterrupted operations",
  },
  {
    icon: Layers,
    title: "Industry-ready templates",
    subtitle: "pre-configured workflows",
  },
  {
    icon: BookOpen,
    title: "Knowledge from your business",
    subtitle: "grounded domain intelligence",
  },
  {
    icon: ShieldCheck,
    title: "Secure, reliable and compliant",
    subtitle: "enterprise-grade governance",
  },
];

/* ───────────────────────────────────────────────────────────────────────────
   CENTRAL HALF-REFLECTING ORB WITH DUAL-SIDE FLOWING RIBBONS
   ─────────────────────────────────────────────────────────────────────────── */
interface OrbProps {
  isPlayingAudio: boolean;
  onPlayClick: () => void;
}

function HalfReflectingOrbWithRibbons({ isPlayingAudio, onPlayClick }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const isVisibleRef = useRef<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);

    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const startTime = performance.now();
    const ribbonCount = 38;

    const render = (now: number) => {
      if (!canvas || !ctx) return;

      if (!isVisibleRef.current) {
        animFrameId.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const elapsed = (now - startTime) / 1000;
      const time = reducedMotion ? 0 : elapsed;
      const ampMultiplier = isPlayingAudio ? 1.75 : isHovered ? 1.25 : 1.0;

      const centerX = width * 0.5;
      const centerY = height * 0.5;
      const orbRadius = Math.min(width, height) * 0.285;

      // ── LEFT SIDE: ORANGE FLOWING RIBBON STRUCTURE ──
      for (let i = 0; i < ribbonCount; i++) {
        const t = i / (ribbonCount - 1);
        const phase = i * 0.19;
        const waveSpeed = 0.65 + (i % 4) * 0.05;
        const currentPhase = time * waveSpeed + phase;

        const alpha = 0.45 + Math.sin(t * Math.PI) * 0.45;
        let strokeColor = `rgba(232, 116, 30, ${alpha})`;
        if (t < 0.38) {
          strokeColor = `rgba(245, 158, 11, ${alpha})`;
        } else if (t > 0.72) {
          strokeColor = `rgba(200, 50, 30, ${alpha})`;
        }

        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.1;

        const startX = width * 0.02;
        const endX = centerX - orbRadius * 0.96;
        const steps = 45;

        for (let s = 0; s <= steps; s++) {
          const p = s / steps;
          const x = startX + (endX - startX) * p;

          const verticalSpread = Math.pow(1 - p, 1.4) * (height * 0.28);
          const baseOffset = (t - 0.5) * verticalSpread;

          const waveAmp = (16 + (i % 6) * 3) * Math.sin(p * Math.PI) * ampMultiplier;
          const sineWave =
            Math.sin(p * 4.6 + currentPhase) * waveAmp +
            Math.sin(p * 2.2 - currentPhase * 0.4) * (waveAmp * 0.45);

          const y = centerY + baseOffset + sineWave;

          if (s === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // ── RIGHT SIDE: BLUE FLOWING RIBBON STRUCTURE ──
      for (let j = 0; j < ribbonCount; j++) {
        const t = j / (ribbonCount - 1);
        const phase = j * 0.18 + 1.15;
        const waveSpeed = 0.62 + (j % 4) * 0.05;
        const currentPhase = time * waveSpeed + phase;

        const alpha = 0.45 + Math.sin(t * Math.PI) * 0.45;
        let strokeColor = `rgba(62, 111, 176, ${alpha})`;
        if (t < 0.35) {
          strokeColor = `rgba(56, 189, 248, ${alpha})`;
        } else if (t > 0.7) {
          strokeColor = `rgba(31, 63, 122, ${alpha})`;
        }

        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.1;

        const startX = centerX + orbRadius * 0.96;
        const endX = width * 0.98;
        const steps = 45;

        for (let s = 0; s <= steps; s++) {
          const p = s / steps;
          const x = startX + (endX - startX) * p;

          const verticalSpread = Math.pow(p, 1.35) * (height * 0.3);
          const baseOffset = (t - 0.5) * verticalSpread;

          const waveAmp = (16 + (j % 6) * 3) * Math.sin(p * Math.PI) * ampMultiplier;
          const sineWave =
            Math.sin(p * 4.4 + currentPhase) * waveAmp +
            Math.sin(p * 2.0 - currentPhase * 0.4) * (waveAmp * 0.4);

          const y = centerY + baseOffset + sineWave;

          if (s === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [reducedMotion, isPlayingAudio, isHovered]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex items-center justify-center w-[360px] h-[360px] sm:w-[480px] sm:h-[480px] md:w-[560px] md:h-[560px] lg:w-[640px] lg:h-[640px] select-none"
    >
      {/* ── BACKGROUND COLOR BRIGHTENING RADIANCE (ORANGE LEFT, BLUE RIGHT) ── */}
      <div
        className="pointer-events-none absolute left-[-22%] top-1/2 -translate-y-1/2 w-[65%] h-[75%] rounded-full opacity-60 blur-3xl z-0"
        style={{
          background:
            "radial-gradient(circle, rgba(232, 116, 30, 0.28) 0%, rgba(245, 158, 11, 0.16) 45%, transparent 75%)",
        }}
      />
      <div
        className="pointer-events-none absolute right-[-22%] top-1/2 -translate-y-1/2 w-[65%] h-[75%] rounded-full opacity-60 blur-3xl z-0"
        style={{
          background:
            "radial-gradient(circle, rgba(62, 111, 176, 0.3) 0%, rgba(56, 189, 248, 0.16) 45%, transparent 75%)",
        }}
      />

      {/* ── DUAL FLOWING RIBBONS CANVAS ── */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute -inset-24 sm:-inset-32 md:-inset-40 w-[calc(100%+192px)] sm:w-[calc(100%+256px)] md:w-[calc(100%+320px)] h-[calc(100%+192px)] sm:h-[calc(100%+256px)] md:h-[calc(100%+320px)] z-0"
      />

      {/* ── CELESTIAL SATELLITE NETWORK (RIGHT SIDE) ── */}
      <div className="pointer-events-none absolute right-[-24%] sm:right-[-28%] top-[-4%] w-[80%] h-[110%] z-0 opacity-40">
        <svg viewBox="0 0 400 400" className="w-full h-full text-[#3E6FB0]" fill="none">
          <ellipse
            cx="240"
            cy="210"
            rx="135"
            ry="105"
            stroke="currentColor"
            strokeWidth="0.6"
            strokeDasharray="4 6"
            transform="rotate(-12 240 210)"
          />
          <circle cx="160" cy="155" r="2.5" fill="#3E6FB0" />
          <circle cx="240" cy="135" r="2" fill="#7FA6D8" />
          <circle cx="310" cy="180" r="3" fill="#E8741E" />
          <circle cx="210" cy="225" r="2.2" fill="#3E6FB0" />
          <circle cx="290" cy="245" r="2.5" fill="#7FA6D8" />
          <circle cx="350" cy="230" r="2" fill="#3E6FB0" />
        </svg>
      </div>

      {/* ── CENTRAL HALF-REFLECTING GLASSY ORB ── */}
      <div className="relative z-10 w-[290px] h-[290px] sm:w-[390px] sm:h-[390px] md:w-[450px] md:h-[450px] lg:w-[510px] lg:h-[510px] rounded-full flex items-center justify-center p-4">
        {/* Spherical Glass Body */}
        <div
          className="absolute inset-0 rounded-full border border-white/60 shadow-[0_12px_48px_rgba(28,20,16,0.12),inset_0_0_40px_rgba(255,255,255,0.7)] backdrop-blur-[2px]"
          style={{
            background:
              "radial-gradient(circle at 45% 40%, rgba(255, 255, 255, 0.94) 0%, rgba(248, 241, 231, 0.82) 48%, rgba(235, 224, 208, 0.65) 75%, rgba(210, 195, 178, 0.45) 100%)",
          }}
        />

        {/* Outer Watercolor Ink Spatter Ring Atmosphere */}
        <div
          className={`absolute -inset-4 sm:-inset-6 md:-inset-8 rounded-full pointer-events-none mix-blend-multiply opacity-55 ${
            reducedMotion ? "" : "vaakriti-orb-rotate"
          }`}
        >
          <svg viewBox="0 0 500 500" className="w-full h-full" fill="none">
            <defs>
              <radialGradient id="outerAuraGrad" cx="50%" cy="50%" r="50%">
                <stop offset="65%" stopColor="#4A3E36" stopOpacity="0" />
                <stop offset="82%" stopColor="#8C7A6B" stopOpacity="0.3" />
                <stop offset="90%" stopColor="#3C2E24" stopOpacity="0.75" />
                <stop offset="98%" stopColor="#F8F1E7" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle
              cx="250"
              cy="250"
              r="230"
              stroke="url(#outerAuraGrad)"
              strokeWidth="28"
              strokeDasharray="60 12 120 18 40 22"
            />
            <circle
              cx="250"
              cy="250"
              r="244"
              stroke="#6B5A4E"
              strokeWidth="1.5"
              strokeDasharray="8 20 4 35"
              opacity="0.4"
            />
          </svg>
        </div>

        {/* Half-Reflecting Curvature Overlay (Glass Luster / Specular Crescent) */}
        <div
          className="pointer-events-none absolute inset-2 sm:inset-3 rounded-full opacity-80"
          style={{
            background:
              "linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.3) 36%, transparent 60%)",
          }}
        />

        {/* Equatorial Glass Caustic Horizon Arc */}
        <div
          className="pointer-events-none absolute inset-x-4 top-[48%] h-[32%] rounded-full opacity-35 blur-[1px]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.9) 0%, rgba(248, 241, 231, 0.4) 55%, transparent 80%)",
          }}
        />

        {/* Dual Side Accent Reflections */}
        <div
          className="pointer-events-none absolute left-3 top-1/4 bottom-1/4 w-8 rounded-full opacity-45 blur-sm"
          style={{
            background: "linear-gradient(to right, rgba(232, 116, 30, 0.6), transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute right-3 top-1/4 bottom-1/4 w-8 rounded-full opacity-45 blur-sm"
          style={{
            background: "linear-gradient(to left, rgba(62, 111, 176, 0.6), transparent)",
          }}
        />

        {/* ── MID OF ORB: "vaakriti" & MEANING LINE "वाक् · कृति" IN DASHBOARD TYPOGRAPHY ── */}
        <div className="relative z-20 flex flex-col items-center justify-center text-center px-4 pointer-events-auto">
          {/* Category Header */}
          <p className="font-heading text-[10px] sm:text-[11px] font-bold tracking-[0.34em] text-[#8C7A6B] uppercase mb-1 sm:mb-2 select-none">
            THE CREATION OF VOICE
          </p>

          {/* Brand Wordmark in Dashboard Typography (Space Grotesk / font-heading) */}
          <h1
            className="font-heading font-black text-[64px] sm:text-[88px] md:text-[102px] lg:text-[116px] leading-[0.88] text-[#1C1410] tracking-[-0.035em] select-none"
          >
            vaakriti
          </h1>

          {/* Meaning line directly beneath wordmark */}
          <p
            className="text-[24px] sm:text-[30px] md:text-[34px] lg:text-[38px] font-semibold text-[#1C1410] tracking-[0.18em] mt-1 sm:mt-1.5 mb-4 sm:mb-5 select-none"
            style={{
              fontFamily: "'Noto Serif Devanagari', 'Rozha One', var(--font-heading), Georgia, serif",
            }}
          >
            वाक् · कृति
          </p>

          {/* Center Circular Play Button */}
          <div className="relative flex flex-col items-center">
            <div
              className={`absolute -inset-2.5 rounded-full border border-[#E8741E] pointer-events-none ${
                reducedMotion ? "opacity-0" : "vaakriti-ripple-1"
              }`}
            />
            <div
              className={`absolute -inset-2.5 rounded-full border border-[#E8741E] pointer-events-none ${
                reducedMotion ? "opacity-0" : "vaakriti-ripple-2"
              }`}
            />

            <button
              onClick={onPlayClick}
              aria-label="Hear Vaakriti voice sample"
              className="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#1A1A1A] hover:bg-[#28221D] p-0 flex items-center justify-center border-2 border-[#E8741E] shadow-[0_4px_22px_rgba(232,116,30,0.3)] hover:shadow-[0_4px_30px_rgba(232,116,30,0.5)] transition-all duration-300 cursor-pointer transform hover:scale-105 active:scale-95"
            >
              <div className="flex items-center justify-center gap-[3px] h-6 w-7">
                <span
                  className={`w-[2.5px] rounded-full bg-white ${
                    reducedMotion ? "h-2" : "vaakriti-eq-bar-1"
                  } ${isPlayingAudio ? "h-4" : ""}`}
                />
                <span
                  className={`w-[2.5px] rounded-full bg-white ${
                    reducedMotion ? "h-3.5" : "vaakriti-eq-bar-2"
                  } ${isPlayingAudio ? "h-5" : ""}`}
                />
                <span
                  className={`w-[2.5px] rounded-full bg-white ${
                    reducedMotion ? "h-5" : "vaakriti-eq-bar-3"
                  } ${isPlayingAudio ? "h-6" : ""}`}
                />
                <span
                  className={`w-[2.5px] rounded-full bg-white ${
                    reducedMotion ? "h-3.5" : "vaakriti-eq-bar-4"
                  } ${isPlayingAudio ? "h-5" : ""}`}
                />
                <span
                  className={`w-[2.5px] rounded-full bg-white ${
                    reducedMotion ? "h-2" : "vaakriti-eq-bar-5"
                  } ${isPlayingAudio ? "h-3" : ""}`}
                />
              </div>
            </button>

            <span className="font-heading text-[12px] sm:text-[13px] font-semibold text-[#4A3E36] mt-2 select-none group-hover:text-[#1C1410] transition-colors">
              {isPlayingAudio ? "Speaking..." : "Hear Vaakriti"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN HERO COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export function Hero({ hideNavbar = false }: HeroProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleHearVaakriti = useCallback(() => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        "Namaste! Main Vaakriti hoon. The creation of voice."
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

      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsPlayingAudio(false), 3500);
    }
  }, [isPlayingAudio]);

  return (
    <section className="relative w-full min-h-screen flex flex-col justify-between bg-[#F8F1E7] text-[#1C1410] overflow-hidden select-none">
      <style jsx global>{`
        @keyframes vaakritiSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .vaakriti-orb-rotate {
          animation: vaakritiSpin 60s linear infinite;
        }

        @keyframes vaakritiRipple {
          0% {
            transform: scale(1);
            opacity: 0.55;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
        .vaakriti-ripple-1 {
          animation: vaakritiRipple 2.4s cubic-bezier(0.2, 0.8, 0.4, 1) infinite;
        }
        .vaakriti-ripple-2 {
          animation: vaakritiRipple 2.4s cubic-bezier(0.2, 0.8, 0.4, 1) 1.2s infinite;
        }

        @keyframes eqBounce {
          0%, 100% {
            height: 6px;
          }
          50% {
            height: 18px;
          }
        }
        .vaakriti-eq-bar-1 {
          animation: eqBounce 0.9s ease-in-out infinite 0.1s;
        }
        .vaakriti-eq-bar-2 {
          animation: eqBounce 0.9s ease-in-out infinite 0.3s;
        }
        .vaakriti-eq-bar-3 {
          animation: eqBounce 0.9s ease-in-out infinite 0s;
        }
        .vaakriti-eq-bar-4 {
          animation: eqBounce 0.9s ease-in-out infinite 0.4s;
        }
        .vaakriti-eq-bar-5 {
          animation: eqBounce 0.9s ease-in-out infinite 0.2s;
        }

        @media (prefers-reduced-motion: reduce) {
          .vaakriti-orb-rotate,
          .vaakriti-ripple-1,
          .vaakriti-ripple-2,
          .vaakriti-eq-bar-1,
          .vaakriti-eq-bar-2,
          .vaakriti-eq-bar-3,
          .vaakriti-eq-bar-4,
          .vaakriti-eq-bar-5 {
            animation: none !important;
          }
        }
      `}</style>

      {/* ── 1. BACKGROUND LAYER: PAPER GRAIN & WATERCOLOR VARANASI GHATS ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-25"
        style={{
          backgroundImage: "radial-gradient(#8C7A6B 0.65px, transparent 0.65px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="relative w-full h-full">
          <Image
            src="/assets/hero-bg.png"
            alt="Varanasi Ghats & Watercolor Ink Background"
            fill
            priority
            className="object-cover object-center mix-blend-multiply opacity-85"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#F8F1E7]/25 via-transparent to-[#F8F1E7]/75" />
        </div>
      </div>

      {/* ── 2. NAVBAR (DASHBOARD FONT STYLE) ── */}
      {!hideNavbar && (
        <header className="relative z-30 w-full h-[80px] px-6 sm:px-10 md:px-12 flex items-center justify-between">
          <Link href="/" className="flex flex-col group select-none">
            <span
              className="font-heading text-[28px] sm:text-[34px] font-black text-[#1C1410] tracking-tight leading-none group-hover:opacity-90 transition-opacity"
            >
              vaakriti
            </span>
            <span
              className="text-[11px] sm:text-[12px] tracking-[0.24em] text-[#6B5A4E] font-semibold leading-none mt-1"
              style={{ fontFamily: "'Noto Serif Devanagari', serif" }}
            >
              वाक् · कृति
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 lg:gap-9 text-[13px] font-semibold font-heading text-[#4A3E36]">
            <Link href="#platform" className="hover:text-[#1C1410] transition-colors">
              Platform
            </Link>
            <Link href="#solutions" className="hover:text-[#1C1410] transition-colors">
              Solutions
            </Link>
            <Link href="#industries" className="hover:text-[#1C1410] transition-colors">
              Industries
            </Link>
            <Link href="#resources" className="hover:text-[#1C1410] transition-colors">
              Resources
            </Link>
            <Link href="/pricing" className="hover:text-[#1C1410] transition-colors">
              Pricing
            </Link>
          </nav>

          <div className="hidden sm:flex items-center gap-4 lg:gap-5">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D5C9BC] bg-white/20 backdrop-blur-xs text-[12px] font-semibold font-heading text-[#2C241E] hover:bg-white/50 transition-all cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#5A4E44]" />
              <span>EN</span>
              <ChevronDown className="w-3 h-3 text-[#5A4E44]" />
            </button>

            <Link
              href="/login"
              className="text-[13px] font-semibold font-heading text-[#2C241E] hover:text-[#1C1410] transition-colors px-1"
            >
              Login
            </Link>

            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#1A1A1A] hover:bg-[#2C2622] text-[#FAF7F2] text-[13px] font-semibold font-heading shadow-sm hover:shadow transition-all"
            >
              <span>Build an Agent</span>
              <span className="text-[#A89C8E]">→</span>
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#2C241E] hover:text-black focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>
      )}

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#F8F1E7]/95 backdrop-blur-md pt-24 px-8 flex flex-col gap-6 md:hidden">
          <Link
            href="#platform"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-bold font-heading text-[#1C1410]"
          >
            Platform
          </Link>
          <Link
            href="#solutions"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-bold font-heading text-[#1C1410]"
          >
            Solutions
          </Link>
          <Link
            href="#industries"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-bold font-heading text-[#1C1410]"
          >
            Industries
          </Link>
          <Link
            href="#resources"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-bold font-heading text-[#1C1410]"
          >
            Resources
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-bold font-heading text-[#1C1410]"
          >
            Pricing
          </Link>
          <div className="pt-6 border-t border-[#D5C9BC] flex flex-col gap-4">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-2.5 rounded-full border border-[#D5C9BC] text-sm font-semibold font-heading"
            >
              Login
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-2.5 rounded-full bg-[#1A1A1A] text-white text-sm font-semibold font-heading"
            >
              Build an Agent →
            </Link>
          </div>
        </div>
      )}

      {/* ── 3. CORNER ANNOTATIONS (DASHBOARD TYPOGRAPHY) ── */}
      <div className="absolute right-8 lg:right-12 xl:right-16 top-24 sm:top-28 z-20 text-right select-none hidden sm:block">
        <div className="flex items-center justify-end gap-3">
          <div>
            <p className="font-heading text-[11px] lg:text-[12px] font-bold tracking-[0.2em] text-[#5A4E44] uppercase leading-tight">
              FROM INDIA
            </p>
            <p className="font-heading text-[11px] lg:text-[12px] font-bold tracking-[0.2em] text-[#5A4E44] uppercase leading-tight mt-0.5">
              TO EVERYWHERE
            </p>
          </div>
          <div className="relative h-11 w-2 flex items-center justify-center">
            <div className="w-[1px] h-full bg-[#B8A898]" />
            <div className="absolute right-[-2.5px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#E8741E] shadow-[0_0_8px_rgba(232,116,30,0.6)]" />
          </div>
        </div>
      </div>

      <div className="absolute right-8 lg:right-12 xl:right-16 bottom-20 sm:bottom-24 z-20 select-none hidden lg:block">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-2 flex items-center justify-center">
            <div className="w-[1px] h-full bg-[#B8A898]" />
            <div className="absolute left-[-2px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#8C7A6B]" />
          </div>
          <div className="text-left font-heading">
            <p className="text-[12px] lg:text-[13px] font-semibold tracking-[0.05em] text-[#5A4E44] leading-snug">
              The world speaks.
            </p>
            <p className="text-[12px] lg:text-[13px] font-semibold tracking-[0.05em] text-[#5A4E44] leading-snug">
              We listen.
            </p>
          </div>
        </div>
      </div>

      {/* ── 4. FLOATING MULTILINGUAL GREETINGS ── */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {GREETINGS.map((g) => (
          <div
            key={g.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 ${g.size} ${
              g.fontStyle || ""
            } select-none transition-opacity duration-300 ${
              g.tier === 1
                ? "block"
                : g.tier === 2
                ? "hidden sm:block"
                : "hidden lg:block"
            }`}
            style={{
              left: g.left,
              top: g.top,
              color: g.color,
              fontFamily: g.fontFamily,
            }}
          >
            {g.text}
          </div>
        ))}
      </div>

      {/* ── 5. CENTER VIEWPORT: THE HALF-REFLECTING ORB WITH DUAL SIDE RIBBONS (NO SWIPE BUTTON) ── */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-4 sm:py-6">
        <HalfReflectingOrbWithRibbons
          isPlayingAudio={isPlayingAudio}
          onPlayClick={handleHearVaakriti}
        />
      </div>

      {/* ── 6. FEATURE STRIP (DASHBOARD TYPOGRAPHY) ── */}
      <div className="relative z-20 w-full border-t border-b border-[#E5DACB]/90 bg-[#F4EDE2]/80 backdrop-blur-xs py-4 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 divide-[#E5DACB] sm:divide-x">
          {FEATURE_ITEMS.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="flex items-center gap-3 px-3 py-2.5 sm:py-2 hover:bg-[#EFE6D9]/50 transition-colors"
              >
                <div className="shrink-0 w-8 h-8 rounded-full bg-[#EADCC9]/50 flex items-center justify-center text-[#C86A2E]">
                  <Icon className="w-4 h-4 stroke-[1.75]" />
                </div>
                <div className="flex flex-col text-left leading-tight font-heading">
                  <span className="text-[12px] font-bold text-[#2C241E]">
                    {item.title}
                  </span>
                  <span className="text-[11px] text-[#7A6B5D] font-medium mt-0.5">
                    {item.subtitle}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
