"use client";

import Link from "next/link";

import { motion } from "framer-motion";
import NextImage from "next/image";
import { ChevronDown } from "lucide-react";

import { VOICE_AGENT_NAME } from "@/lib/agent-branding";
import { getConfigString, hasConfiguredValue, useSiteConfig } from "@/lib/site-content";
import { useVapi } from "@/hooks/use-vapi";

function getVoiceStatusCopy({
  isConfigured,
  isConnecting,
  isConnected,
  isSpeaking,
  error,
}: {
  isConfigured: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  isSpeaking: boolean;
  error: string | null;
}) {
  if (!isConfigured) {
    return "";
  }

  if (error) {
    return `We couldn't connect to ${VOICE_AGENT_NAME} right now. Please try again.`;
  }

  if (isConnecting) {
    return `Connecting to ${VOICE_AGENT_NAME}. Browser web calls usually take 5-10 seconds.`;
  }

  if (isConnected && isSpeaking) {
    return `${VOICE_AGENT_NAME} is speaking now. Reply naturally when it pauses.`;
  }

  if (isConnected) {
    return `You are live with ${VOICE_AGENT_NAME} now. Start speaking naturally.`;
  }

  return "";
}

export function Hero() {
  const { data: siteConfig } = useSiteConfig();
  const { toggleCall, isConfigured, isConnecting, isConnected, isSpeaking, error } = useVapi();
  const demoPhoneNumber = getConfigString(siteConfig, "demo_phone_number");
  const voiceStatusCopy = getVoiceStatusCopy({
    isConfigured,
    isConnecting,
    isConnected,
    isSpeaking,
    error,
  });
  const voiceStatusTone = error
    ? "border-[rgba(239,68,68,0.24)] bg-[rgba(127,29,29,0.22)] text-[#FCA5A5]"
    : isConnected
      ? "border-[rgba(16,185,129,0.24)] bg-[rgba(6,78,59,0.2)] text-[#A7F3D0]"
      : "border-[rgba(139,92,246,0.24)] bg-[rgba(45,18,85,0.32)] text-[#FAF7FF]";
  const shouldShowVoiceStatus = isConnecting || isConnected || Boolean(error);

  const handleDemoClick = () => {
    if (isConfigured) {
      void toggleCall();
      return;
    }

    if (hasConfiguredValue(demoPhoneNumber)) {
      window.location.assign(`tel:${demoPhoneNumber.replace(/\s+/g, "")}`);
      return;
    }

    window.location.assign("/contact?product=voice-agent");
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
                className="relative z-10 h-[100px] w-auto md:h-[130px] lg:h-[160px]"
                style={{
                  width: "auto",
                  filter:
                    "drop-shadow(0 0 60px rgba(139,92,246,0.5)) drop-shadow(0 0 120px rgba(251,191,36,0.25))",
                }}
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
          className="mx-auto mb-[36px] max-w-[540px] font-sans text-[16px] font-normal leading-[1.7] text-[#B8B0D1] md:text-[18px]"
        >
          Trinetra is the autonomous workforce for the modern era. Manage complex operations with
          self-healing AI agents.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
          className="flex w-full max-w-[400px] flex-col justify-center gap-[16px] sm:max-w-none sm:flex-row"
        >
          <Link
            href="/contact"
            className="group relative flex items-center justify-center rounded-full bg-[#0C0118] px-[36px] py-[16px] font-sans text-[18px] font-medium text-[#FAF7FF] shadow-[0_0_25px_rgba(139,92,246,0.3)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_0_45px_rgba(139,92,246,0.5)]"
          >
            <div className="absolute inset-0 rounded-full border border-[rgba(139,92,246,0.4)] transition-colors duration-300 group-hover:border-[#8B5CF6]" />
            Deploy Agent
            <span className="ml-[10px] font-normal transition-transform duration-300 group-hover:translate-x-1">
              {"->"}
            </span>
          </Link>

          <button
            type="button"
            onClick={handleDemoClick}
            className="group relative cursor-pointer rounded-full bg-[#0C0118] px-[36px] py-[16px] font-sans text-[18px] font-medium text-[#B8B0D1] shadow-[0_0_20px_rgba(139,92,246,0.1)] transition-all duration-300 hover:-translate-y-[2px] hover:text-[#FAF7FF] hover:shadow-[0_0_35px_rgba(139,92,246,0.25)]"
          >
            <div className="absolute inset-0 rounded-full border border-[rgba(139,92,246,0.2)] transition-colors duration-300 group-hover:border-[#8B5CF6]" />
            <span className="mr-2 translate-y-[-1px] leading-none text-[#8B5CF6]">{">"}</span>
            {isConfigured
              ? isConnecting
                ? "Connecting..."
                : isConnected
                  ? `End ${VOICE_AGENT_NAME} Call`
                  : `Talk to ${VOICE_AGENT_NAME}`
              : hasConfiguredValue(demoPhoneNumber)
                ? "Watch Demo"
                : "Request Demo"}
          </button>
        </motion.div>

        {shouldShowVoiceStatus && voiceStatusCopy ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.95, ease: "easeOut" }}
            className={`mt-[18px] w-full max-w-[560px] rounded-[16px] border px-[18px] py-[14px] text-left font-sans text-[14px] leading-[1.6] ${voiceStatusTone}`}
          >
            {voiceStatusCopy}
          </motion.div>
        ) : null}
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
    </section>
  );
}
