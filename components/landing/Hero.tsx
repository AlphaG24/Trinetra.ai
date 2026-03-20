"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import NextImage from "next/image";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function Hero() {
    const [isVideoOpen, setIsVideoOpen] = useState(false);

    return (
        <section className="relative w-full h-[100vh] flex flex-col items-center justify-center text-center pt-[72px] overflow-hidden bg-[#080010]">
            
            {/* --- Dot Grid Background (Base) --- */}
            <div 
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }}
            />

            {/* --- Divine Glow Radial Gradient --- */}
            <div 
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse 600px 600px at center 40%, rgba(139,92,246,0.12) 0%, rgba(251,191,36,0.03) 40%, transparent 70%)'
                }}
            />

            {/* --- CONTENT --- */}
            <div className="relative z-10 flex flex-col items-center justify-center w-full px-6 -mt-[100px] md:-mt-[140px]">
                
                {/* 1. LOGO & BACK GLOW */}
                <div className="relative flex items-center justify-center mb-[24px] w-full max-w-[500px] h-[220px]">
                    {/* Pulsing Glow behind logo with its own entrance delay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                        <motion.div
                            className="w-[500px] h-[500px] rounded-full"
                            style={{
                                background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, rgba(251,191,36,0.05) 50%, transparent 70%)'
                            }}
                            animate={{
                                opacity: [0.5, 1, 0.5],
                                scale: [0.95, 1.05, 0.95]
                            }}
                            transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
                        />
                    </motion.div>
                    
                    {/* Trident Logo with its own entrance scale + fade */}
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
                                className="h-[100px] md:h-[130px] lg:h-[160px] w-auto relative z-10"
                                style={{
                                    filter: 'drop-shadow(0 0 60px rgba(139,92,246,0.5)) drop-shadow(0 0 120px rgba(251,191,36,0.25))'
                                }}
                                priority
                            />
                        </motion.div>
                    </motion.div>
                </div>

                {/* 2. HEADLINE */}
                <motion.h1
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
                    className="font-display font-bold text-[38px] sm:text-[46px] md:text-[64px] lg:text-[76px] text-[#F5F3FF] tracking-[-0.02em] mb-[20px] leading-tight"
                >
                    The <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #A78BFA 0%, #FBBF24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Divine</span> Vision.
                </motion.h1>

                {/* 3. SUBTITLE */}
                <motion.p
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.6, ease: "easeOut" }}
                    className="font-sans font-normal text-[16px] md:text-[18px] text-[#A8A0C0] max-w-[540px] mx-auto leading-[1.7] mb-[36px]"
                >
                    Trinetra is the autonomous workforce for the modern era. Manage complex operations with self-healing AI agents.
                </motion.p>

                {/* 4. BUTTONS */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
                    className="flex flex-col sm:flex-row gap-[16px] w-full max-w-[400px] sm:max-w-none justify-center"
                >
                    {/* Deploy Agent Button */}
                    <Link
                        href="/contact"
                        className="group relative flex items-center justify-center px-[36px] py-[16px] bg-[#0C0118] text-[#F5F3FF] font-sans font-medium text-[18px] rounded-full transition-all duration-300 shadow-[0_0_25px_rgba(139,92,246,0.3)] hover:shadow-[0_0_45px_rgba(139,92,246,0.5)] hover:-translate-y-[2px]"
                    >
                        <div className="absolute inset-0 rounded-full border border-[rgba(139,92,246,0.4)] group-hover:border-[#8B5CF6] transition-colors duration-300" />
                        Deploy Agent
                        <span className="ml-[10px] font-normal transition-transform duration-300 group-hover:translate-x-1">→</span>
                    </Link>

                    {/* Watch Demo Button */}
                    <button
                        onClick={() => setIsVideoOpen(true)}
                        className="group relative flex items-center justify-center px-[36px] py-[16px] bg-[#0C0118] text-[#A8A0C0] font-sans font-medium text-[18px] rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(139,92,246,0.1)] hover:shadow-[0_0_35px_rgba(139,92,246,0.25)] hover:-translate-y-[2px] hover:text-[#F5F3FF] cursor-pointer"
                    >
                        <div className="absolute inset-0 rounded-full border border-[rgba(139,92,246,0.2)] group-hover:border-[#8B5CF6] transition-colors duration-300" />
                        <span className="mr-2 text-[#8B5CF6] leading-none translate-y-px">▶</span>
                        Watch Demo
                    </button>
                </motion.div>
                
            </div>

            {/* 5. SCROLL INDICATOR */}
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

            {/* --- VIDEO DEMO MODAL --- */}
            <AnimatePresence>
                {isVideoOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                        onClick={() => setIsVideoOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden border border-[#2D1255] shadow-[0_0_50px_rgba(139,92,246,0.2)]"
                        >
                            <iframe
                                width="100%"
                                height="100%"
                                src="https://www.youtube.com/embed/LXb3EKWsInQ?autoplay=1&rel=0"
                                title="Trinetra Demo"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full"
                            />

                            <button
                                onClick={() => setIsVideoOpen(false)}
                                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-white/10 text-white rounded-full transition-colors backdrop-blur-md border border-white/5 z-10"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
