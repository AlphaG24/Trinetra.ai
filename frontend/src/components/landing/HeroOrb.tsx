"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HeroOrbProps {
  isActive?: boolean;
  onActivate?: () => void;
  onHoverWave?: (hovering: boolean) => void;
}

export function HeroOrb({ isActive = false, onActivate, onHoverWave }: HeroOrbProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative flex items-center justify-center w-[360px] h-[360px] sm:w-[440px] sm:h-[440px] md:w-[500px] md:h-[500px] lg:w-[520px] lg:h-[520px] select-none">
      
      {/* ── 1. BACKGROUND SOUND WAVE / SILK THREAD RIBBONS (PASSING THROUGH/BEHIND) ── */}
      <svg
        className="pointer-events-none absolute -inset-24 sm:-inset-32 md:-inset-40 w-[calc(100%+192px)] sm:w-[calc(100%+256px)] md:w-[calc(100%+320px)] h-[calc(100%+192px)] sm:h-[calc(100%+256px)] md:h-[calc(100%+320px)] overflow-visible"
        viewBox="0 0 1000 700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Terracotta silk thread gradient (Left) */}
          <linearGradient id="terracottaSilk" x1="0%" y1="60%" x2="52%" y2="48%">
            <stop offset="0%" stopColor="#C65B32" stopOpacity="0" />
            <stop offset="25%" stopColor="#C65B32" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#D97706" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.75" />
          </linearGradient>

          {/* Indigo silk thread gradient (Right) */}
          <linearGradient id="indigoSilk" x1="48%" y1="52%" x2="100%" y2="40%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.75" />
            <stop offset="40%" stopColor="#5C70A8" stopOpacity="0.55" />
            <stop offset="80%" stopColor="#2B4C7E" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1E293B" stopOpacity="0" />
          </linearGradient>

          {/* Core glow filter */}
          <radialGradient id="centralAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#FAF7F0" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#F7F3EA" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── LEFT TERRACOTTA SOUND RIBBONS (Organic flow left -> center) ── */}
        <g opacity={isActive ? 0.95 : isHovered ? 0.8 : 0.65}>
          {/* Main Primary Terracotta Stream */}
          <motion.path
            d="M 20 420 C 140 410, 240 370, 340 320 C 420 280, 470 260, 520 330 C 560 380, 520 440, 460 450 C 400 460, 360 410, 370 350 C 380 290, 450 250, 510 260"
            stroke="url(#terracottaSilk)"
            strokeWidth={isActive ? "2.5" : "1.75"}
            strokeLinecap="round"
            fill="none"
            animate={{
              d: [
                "M 20 420 C 140 410, 240 370, 340 320 C 420 280, 470 260, 520 330 C 560 380, 520 440, 460 450 C 400 460, 360 410, 370 350 C 380 290, 450 250, 510 260",
                "M 20 405 C 150 425, 230 355, 335 330 C 415 295, 475 250, 515 315 C 555 365, 530 435, 465 445 C 405 455, 365 405, 375 345 C 385 285, 445 255, 510 260",
                "M 20 420 C 140 410, 240 370, 340 320 C 420 280, 470 260, 520 330 C 560 380, 520 440, 460 450 C 400 460, 360 410, 370 350 C 380 290, 450 250, 510 260",
              ],
            }}
            transition={{
              duration: isActive ? 5 : 12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Secondary Delicate Filament 1 */}
          <motion.path
            d="M 60 370 C 180 380, 260 330, 360 300 C 430 280, 480 300, 505 345 C 530 390, 490 425, 445 420"
            stroke="url(#terracottaSilk)"
            strokeWidth="1.2"
            strokeDasharray="4 3"
            strokeLinecap="round"
            fill="none"
            animate={{
              strokeDashoffset: [0, -60],
            }}
            transition={{
              duration: isActive ? 8 : 22,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          {/* Secondary Filament 2 - Lower sweep */}
          <motion.path
            d="M 40 460 C 160 450, 250 420, 340 370 C 400 330, 440 330, 480 365 C 515 395, 525 435, 485 455"
            stroke="url(#terracottaSilk)"
            strokeWidth="0.85"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
        </g>

        {/* ── RIGHT INDIGO SOUND RIBBONS (Organic flow center -> right) ── */}
        <g opacity={isActive ? 0.95 : isHovered ? 0.8 : 0.65}>
          {/* Main Primary Indigo Stream */}
          <motion.path
            d="M 490 260 C 550 250, 620 290, 630 350 C 640 410, 600 460, 540 450 C 480 440, 440 380, 480 330 C 530 260, 580 280, 660 320 C 760 370, 860 410, 980 420"
            stroke="url(#indigoSilk)"
            strokeWidth={isActive ? "2.5" : "1.75"}
            strokeLinecap="round"
            fill="none"
            animate={{
              d: [
                "M 490 260 C 550 250, 620 290, 630 350 C 640 410, 600 460, 540 450 C 480 440, 440 380, 480 330 C 530 260, 580 280, 660 320 C 760 370, 860 410, 980 420",
                "M 490 260 C 555 255, 615 285, 625 345 C 635 405, 595 455, 535 445 C 475 435, 445 365, 485 315 C 525 250, 585 295, 665 330 C 770 355, 850 425, 980 405",
                "M 490 260 C 550 250, 620 290, 630 350 C 640 410, 600 460, 540 450 C 480 440, 440 380, 480 330 C 530 260, 580 280, 660 320 C 760 370, 860 410, 980 420",
              ],
            }}
            transition={{
              duration: isActive ? 5 : 13,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Secondary Delicate Filament 1 */}
          <motion.path
            d="M 555 420 C 510 425, 470 390, 495 345 C 520 300, 570 280, 640 300 C 740 330, 820 380, 940 370"
            stroke="url(#indigoSilk)"
            strokeWidth="1.2"
            strokeDasharray="4 3"
            strokeLinecap="round"
            fill="none"
            animate={{
              strokeDashoffset: [0, 60],
            }}
            transition={{
              duration: isActive ? 8 : 22,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          {/* Secondary Filament 2 - Upper sweep */}
          <motion.path
            d="M 515 455 C 475 435, 485 395, 520 365 C 560 330, 600 330, 660 370 C 750 420, 840 450, 960 460"
            stroke="url(#indigoSilk)"
            strokeWidth="0.85"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
        </g>
      </svg>

      {/* ── 2. CONCENTRIC SCIENTIFIC ORBITAL RINGS & PARTICLES ── */}

      {/* RING 1: Complete circle, slow clockwise rotation */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: isActive ? 28 : 70,
          repeat: Infinity,
          ease: "linear",
        }}
        className="pointer-events-none absolute inset-0 m-auto w-[98%] h-[98%] rounded-full border border-[#D5C9B8]/40"
      >
        {/* Tiny traveling particle */}
        <span className="absolute top-[8%] left-[24%] w-1.5 h-1.5 rounded-full bg-[#C65B32]/70 shadow-[0_0_6px_#C65B32]" />
      </motion.div>

      {/* RING 2: Broken circular path / dotted trajectory, very slow counter-clockwise */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{
          duration: isActive ? 35 : 95,
          repeat: Infinity,
          ease: "linear",
        }}
        className="pointer-events-none absolute inset-0 m-auto w-[88%] h-[88%] rounded-full border border-dashed border-[#C7B9A5]/45"
      >
        {/* Particle travelling along orbit */}
        <span className="absolute bottom-[14%] right-[20%] w-1.5 h-1.5 rounded-full bg-[#5C70A8]/80 shadow-[0_0_6px_#5C70A8]" />
      </motion.div>

      {/* RING 3: Partial arc with broken trajectory */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: isActive ? 45 : 120,
          repeat: Infinity,
          ease: "linear",
        }}
        className="pointer-events-none absolute inset-0 m-auto w-[78%] h-[78%] rounded-full border-t border-r border-[#BFAFA0]/40 border-b-transparent border-l-transparent"
      />

      {/* RING 4: Fine hairline circle with subtle pulsing opacity */}
      <motion.div
        animate={{
          opacity: isActive ? [0.4, 0.8, 0.4] : [0.25, 0.5, 0.25],
          scale: [1, 1.01, 1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute inset-0 m-auto w-[68%] h-[68%] rounded-full border border-[#D0C2B0]/35"
      >
        {/* Tiny orbital node */}
        <span className="absolute top-1/2 -right-0.5 -translate-y-1/2 w-1 h-1 rounded-full bg-[#8E7E6B]" />
      </motion.div>

      {/* ── 3. CENTRAL ORB: REFINED, LUMINOUS PHYSICAL CIRCULAR FIELD ── */}
      {/* (420–520px diameter desktop feel, soft ivory layers, faint paper texture, restrained depth) */}
      <motion.div
        animate={{
          scale: isActive ? [1, 1.018, 1] : isHovered ? 1.008 : [1, 1.006, 1],
        }}
        transition={{
          scale: {
            duration: isActive ? 2.5 : 7,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
        className="relative z-10 flex flex-col items-center justify-center w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] md:w-[420px] md:h-[420px] lg:w-[450px] lg:h-[450px] rounded-full bg-[#FAF7F0] border border-[#E5DCCF]/90 shadow-[0_10px_35px_rgba(23,21,19,0.06),inset_0_2px_5px_rgba(255,255,255,0.9),inset_0_-2px_6px_rgba(23,21,19,0.02)] transition-shadow duration-500"
        onMouseEnter={() => {
          setIsHovered(true);
          onHoverWave?.(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          onHoverWave?.(false);
        }}
      >
        {/* Faint Paper/Grain Micro-Texture Ring */}
        <div
          className="pointer-events-none absolute inset-2 sm:inset-3 rounded-full border border-[#ECE3D5]/80"
          style={{
            backgroundImage:
              "radial-gradient(#C4B5A5 0.5px, transparent 0.5px)",
            backgroundSize: "20px 20px",
            opacity: 0.25,
          }}
        />

        {/* ── MICROCOPY: THE CREATION OF VOICE ── */}
        <p className="text-[10px] sm:text-[11px] font-sans font-medium tracking-[0.26em] text-[#7A6E60] uppercase mb-1.5 sm:mb-2 select-none">
          THE CREATION OF VOICE
        </p>

        {/* ── BRAND NAME: VAAKRITI (Editorial Serif) ── */}
        <h1 className="font-serif text-[46px] sm:text-[58px] md:text-[68px] lg:text-[76px] font-normal tracking-[-0.03em] text-[#171513] leading-none select-none">
          vaakriti
        </h1>

        {/* ── SANSKRIT ROOT SUBTEXT: वाक् · कृति ── */}
        <p className="text-[13px] sm:text-[15px] md:text-[17px] font-normal tracking-[0.24em] text-[#7A6E60] mt-1.5 sm:mt-2.5 mb-4 sm:mb-6 select-none font-serif">
          वाक् · कृति
        </p>

        {/* ── CIRCULAR VOICE INTERACTION BUTTON ── */}
        <button
          onClick={onActivate}
          className="group relative flex flex-col items-center justify-center cursor-pointer focus:outline-none"
          aria-label="Hear Vaakriti Voice"
        >
          {/* Small Dark/Charcoal Button */}
          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className={`relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 md:w-13 md:h-13 rounded-full transition-all duration-300 ${
              isActive
                ? "bg-[#C65B32] text-white shadow-[0_0_20px_rgba(198,91,50,0.45)]"
                : "bg-[#171513] text-white shadow-[0_4px_14px_rgba(23,21,19,0.22)] group-hover:bg-[#C65B32]"
            }`}
          >
            {/* Minimal White Audio Waveform Symbol */}
            <div className="flex items-center gap-[2.5px] h-4">
              {[0.35, 0.75, 1, 0.7, 0.35].map((h, i) => (
                <motion.span
                  key={i}
                  animate={{
                    scaleY: isActive ? [h, 1.4 * h, 0.25, h] : isHovered ? [h, 1.2 * h, h] : 1,
                  }}
                  transition={{
                    duration: 0.6 + i * 0.12,
                    repeat: isActive || isHovered ? Infinity : 0,
                    ease: "easeInOut",
                  }}
                  className="w-[2px] h-3.5 rounded-full bg-white origin-bottom"
                />
              ))}
            </div>
          </motion.div>

          {/* Button Label */}
          <span className="mt-2 text-[11px] sm:text-[12px] font-medium tracking-wide text-[#574B3E] group-hover:text-[#C65B32] transition-colors select-none">
            {isActive ? "Speaking..." : "Hear Vaakriti"}
          </span>
        </button>
      </motion.div>
    </div>
  );
}
