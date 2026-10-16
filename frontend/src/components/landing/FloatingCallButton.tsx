"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Phone, Square } from "lucide-react";

import { VOICE_AGENT_NAME } from "@/lib/agent-branding";
import { useVapi } from "@/hooks/use-vapi";

function getFloatingStatusCopy({
  isConnecting,
  isConnected,
  isSpeaking,
}: {
  isConnecting: boolean;
  isConnected: boolean;
  isSpeaking: boolean;
}) {
  if (isConnecting) {
    return `Connecting to ${VOICE_AGENT_NAME}. This can take 5-10 seconds.`;
  }

  if (isConnected && isSpeaking) {
    return `${VOICE_AGENT_NAME} is speaking now`;
  }

  if (isConnected) {
    return `You are live with ${VOICE_AGENT_NAME}`;
  }

  return "";
}

export function FloatingCallButton() {
  const { toggleCall, isConnecting, isConnected, isSpeaking } = useVapi();
  const statusCopy = getFloatingStatusCopy({ isConnecting, isConnected, isSpeaking });

  if (!isConnected && !isConnecting) {
    return null;
  }

  return (
    <div className="fixed bottom-[28px] right-[28px] z-[999] flex flex-col items-end gap-[12px]">
      <AnimatePresence>
        {statusCopy ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={`max-w-[240px] rounded-[14px] border px-[14px] py-[10px] text-right font-sans text-[13px] leading-[1.5] shadow-[0_10px_30px_rgba(0,0,0,0.15)] ${
              isConnected
                ? "border-[#315CFF]/30 bg-[#080D18]/95 text-[#45C5FF]"
                : "border-[#E2E8F0] bg-white text-[#080D18]"
            }`}
          >
            {statusCopy}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => void toggleCall()}
        className={`relative flex h-[56px] w-[56px] items-center justify-center rounded-full transition-all duration-300 hover:scale-105 cursor-pointer ${
          isConnected
            ? "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:bg-red-600 hover:shadow-[0_0_40px_rgba(239,68,68,0.5)]"
            : "bg-[#080D18] shadow-[0_0_25px_rgba(49,92,255,0.45)] border border-[#315CFF]/60 hover:bg-[#18243A]"
        }`}
        aria-label={isConnected ? `End ${VOICE_AGENT_NAME} call` : `Connecting to ${VOICE_AGENT_NAME}`}
      >
        {isConnecting ? (
          <Loader2 size={24} className="animate-spin text-white" />
        ) : isConnected ? (
          <Square size={20} className="fill-current text-white" />
        ) : (
          <Phone size={24} className="fill-current text-white" />
        )}
      </button>
    </div>
  );
}
