"use client";

import React from "react";
import { motion } from "framer-motion";
import { ParticleSphereCore } from "./ParticleSphereCore";

interface HeroOrbProps {
  isActive?: boolean;
  audioLevel?: number;
  targetHeading?: { x: number; y: number } | null;
  onActivate?: () => void;
}

export function HeroOrb({
  isActive = false,
  audioLevel = 0,
  targetHeading = null,
  onActivate,
}: HeroOrbProps) {
  return (
    <div className="relative flex items-center justify-center w-[360px] h-[360px] sm:w-[430px] sm:h-[430px] md:w-[500px] md:h-[500px] lg:w-[560px] lg:h-[560px] select-none">
      {/* ── 0. LUMINOUS AMBIENT VOLUMETRIC AURA (COBALT & CYAN SOFT BACKDROP) ── */}
      <motion.div
        animate={{
          scale: isActive ? [1, 1.15, 1] : [1, 1.05, 1],
          opacity: isActive ? [0.55, 0.75, 0.55] : [0.35, 0.48, 0.35],
        }}
        transition={{
          duration: isActive ? 2.0 : 4.0,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute -inset-6 sm:-inset-10 md:-inset-14 rounded-full bg-radial from-[#2563EB]/14 via-[#0284C7]/6 to-transparent blur-3xl -z-20"
      />

      {/* ── 0b. CURVATURE SHADOW (#E5E5E5) ── */}
      <div 
        className="pointer-events-none absolute -bottom-5 sm:-bottom-7 w-[260px] sm:w-[320px] md:w-[380px] h-[30px] rounded-[100%] blur-xl opacity-90 -z-10"
        style={{
          background: "radial-gradient(ellipse at center, #E5E5E5 0%, rgba(229, 229, 229, 0.45) 50%, transparent 75%)",
        }}
      />

      {/* ── 1. PURE 3D PARTICLE SPHERE ORB (UNOBSTRUCTED, 3D LIGHT & SHADOWS) ── */}
      <div className="absolute inset-0 flex items-center justify-center z-10 overflow-visible">
        <ParticleSphereCore
          isActive={isActive}
          audioLevel={audioLevel}
          targetHeading={targetHeading}
          onSphereClick={onActivate}
          className="w-full h-full cursor-pointer"
        />
      </div>
    </div>
  );
}
