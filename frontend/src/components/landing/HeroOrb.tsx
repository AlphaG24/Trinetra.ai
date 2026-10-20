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
    <div className="relative flex items-center justify-center w-[350px] h-[350px] sm:w-[420px] sm:h-[420px] md:w-[470px] md:h-[470px] lg:w-[500px] lg:h-[500px] xl:w-[520px] xl:h-[520px] select-none pointer-events-none">
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
        className="pointer-events-none absolute -inset-10 sm:-inset-16 md:-inset-24 rounded-full bg-radial from-[#2563EB]/14 via-[#0284C7]/6 to-transparent blur-3xl -z-20"
      />

      {/* ── 0b. SOFT AMBIENT CONTACT GLOW (ELIMINATES HARSH GREY SMUDGE / BORDER) ── */}
      <div 
        className="pointer-events-none absolute -bottom-5 sm:-bottom-7 w-[240px] sm:w-[300px] md:w-[350px] h-[24px] sm:h-[28px] rounded-[100%] blur-2xl opacity-40 -z-10"
        style={{
          background: "radial-gradient(ellipse at center, rgba(37,99,235,0.22) 0%, rgba(2,132,199,0.10) 45%, transparent 70%)",
        }}
      />

      {/* ── 1. PURE 3D PARTICLE SPHERE ORB (UNOBSTRUCTED, ZERO CLIPPING) ── */}
      <div className="absolute inset-0 flex items-center justify-center z-10 overflow-visible pointer-events-auto">
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
