"use client";

import { useVapi } from "@/hooks/use-vapi";
import { Mic, Loader2, Zap, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AgentDemo() {
    const { toggleCall, isConnecting, isConnected, volumeLevel } = useVapi();
    const isSpeaking = volumeLevel > 0.05; // Visual threshold

    return (
        <section id="demo" className="py-24 px-6 relative bg-trinetra-bg overflow-hidden min-h-[600px] flex items-center justify-center">

            {/* --- BACKGROUND GLOW --- */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-trinetra-accent/5 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />

            <div className="w-full max-w-lg mx-auto relative z-10 flex flex-col items-center">

                {/* Header Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-trinetra-surface border border-trinetra-accent/20 text-trinetra-muted text-xs font-mono mb-12 uppercase tracking-widest">
                    <Zap size={12} className="text-trinetra-accent" />
                    Voice Command Center
                </div>

                {/* --- AMETHYST ORB (THE VISUALIZER) --- */}
                <div className="relative w-64 h-64 flex items-center justify-center mb-16">
                    {/* Expanding Rings */}
                    <AnimatePresence>
                        {isSpeaking && (
                            <>
                                <motion.div
                                    className="absolute inset-0 rounded-full border border-trinetra-accent/30"
                                    initial={{ scale: 1, opacity: 0.5 }}
                                    animate={{ scale: 2, opacity: 0 }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                                />
                                <motion.div
                                    className="absolute inset-0 rounded-full border border-trinetra-accent/20"
                                    initial={{ scale: 1, opacity: 0.5 }}
                                    animate={{ scale: 2.5, opacity: 0 }}
                                    transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, ease: "easeOut" }}
                                />
                            </>
                        )}
                    </AnimatePresence>

                    {/* The Core Orb */}
                    <motion.div
                        animate={{
                            scale: isSpeaking ? 1 + (volumeLevel * 1.5) : (isConnected ? 1.05 : 1),
                            boxShadow: isSpeaking
                                ? "0 0 50px 10px rgba(139, 92, 246, 0.6)"
                                : isConnected
                                    ? "0 0 30px 5px rgba(139, 92, 246, 0.3)"
                                    : "0 0 0px 0px rgba(139, 92, 246, 0)",
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="w-32 h-32 rounded-full bg-gradient-to-br from-trinetra-accent to-trinetra-card relative z-20 flex items-center justify-center"
                    >
                        {/* Inner detail */}
                        <div className="w-24 h-24 rounded-full bg-black/20 backdrop-blur-sm" />
                    </motion.div>

                    {/* Status Text under Orb */}
                    <div className="absolute -bottom-10 w-full text-center">
                        <span className="font-mono text-xs uppercase tracking-widest text-trinetra-accent/80 animate-pulse">
                            {isConnecting ? "Establishing Link..." : isConnected ? (isSpeaking ? "Receiving Audio..." : "Listening...") : "System Offline"}
                        </span>
                    </div>
                </div>

                {/* --- CONTROL INTERFACE --- */}
                <div className="w-full flex flex-col items-center gap-6">
                    <button
                        onClick={toggleCall}
                        disabled={isConnecting}
                        className={`
                            relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl
                            ${isConnected
                                ? "bg-red-500/10 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                                : "bg-trinetra-surface border-2 border-trinetra-accent/50 text-trinetra-accent hover:border-trinetra-accent hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]"
                            }
                        `}
                    >
                        {isConnecting ? (
                            <Loader2 size={32} className="animate-spin" />
                        ) : isConnected ? (
                            <div className="w-8 h-8 rounded bg-current" /> // Stop Icon
                        ) : (
                            <Mic size={32} />
                        )}
                    </button>

                    <p className="text-trinetra-muted text-sm font-sans">
                        {isConnected ? "Tap to disconnect" : "Tap to speak with Rachael"}
                    </p>
                </div>

            </div>
        </section>
    );
}
