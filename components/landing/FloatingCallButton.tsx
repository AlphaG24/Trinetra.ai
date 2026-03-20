"use client";

import { useVapi } from "@/hooks/use-vapi";
import { Phone, Loader2, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function FloatingCallButton() {
    const { toggleCall, isConnecting, isConnected, volumeLevel } = useVapi();
    const isSpeaking = volumeLevel > 0.05;

    // Only render the floating widget when a call is actively connecting or connected
    if (!isConnected && !isConnecting) return null;

    return (
        <div className="fixed bottom-[28px] right-[28px] z-[999]">
            {/* Animated Ping Ring */}
            <AnimatePresence>
                {!isConnected && !isConnecting && (
                    <motion.div
                        className="absolute inset-0 rounded-full bg-[#F59E0B] opacity-50"
                        animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                    />
                )}
            </AnimatePresence>

            <button
                onClick={toggleCall}
                className={`relative w-[56px] h-[56px] rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:scale-105 hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] ${isConnected ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:bg-red-600' : 'bg-[#F59E0B]'}`}
            >
                {isConnecting ? (
                    <Loader2 size={24} className="text-[#080010] animate-spin" />
                ) : isConnected ? (
                    <Square size={20} className="text-white fill-current" />
                ) : (
                    <Phone size={24} className="text-[#080010] fill-current" />
                )}
            </button>
        </div>
    );
}
