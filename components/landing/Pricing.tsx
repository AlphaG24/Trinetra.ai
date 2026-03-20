"use client";

import { Check, X, Star } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export function Pricing() {
    return (
        <section className="py-24 px-6 bg-trinetra-bg relative overflow-hidden">

            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-trinetra-bg via-transparent to-trinetra-bg pointer-events-none" />

            <div className="max-w-5xl mx-auto relative z-10">

                <div className="text-center mb-20 space-y-4">
                    <h2 className="text-4xl md:text-5xl font-display font-medium text-white tracking-tight">
                        The Cost of <span className="text-trinetra-accent">Intelligence.</span>
                    </h2>
                    <p className="text-trinetra-muted/60 max-w-lg mx-auto">
                        Why pay for inefficiency when you can deploy perfection?
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">

                    {/* 1. TRADITIONAL HIRING (The Anchor) */}
                    <div className="p-8 rounded-3xl bg-trinetra-surface/30 border border-white/5 opacity-70 hover:opacity-100 transition-opacity duration-300">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-medium text-white/60">Traditional Hiring</h3>
                                <span className="text-xs font-mono text-white/40 uppercase tracking-widest border border-white/10 px-2 py-1 rounded">Legacy</span>
                            </div>

                            <div className="space-y-1">
                                <p className="text-4xl font-display font-bold text-white/80">₹25,000<span className="text-lg font-sans font-normal text-white/40">/mo</span></p>
                                <p className="text-sm text-trinetra-muted">Plus benefits & training costs</p>
                            </div>

                            <ul className="space-y-4 pt-4 border-t border-white/5">
                                {[
                                    { text: "8 Hour Shift Only", negative: true },
                                    { text: "Requires Weeks of Training", negative: true },
                                    { text: "Human Error Rate (~5%)", negative: true },
                                    { text: "Sick Days & Holidays", negative: true },
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm text-trinetra-muted">
                                        <X size={16} className="text-red-500/60 flex-shrink-0" />
                                        {feature.text}
                                    </li>
                                ))}
                            </ul>

                            <button disabled className="w-full py-4 rounded-xl bg-white/5 text-white/40 font-medium cursor-not-allowed border border-white/5">
                                Outdated Model
                            </button>
                        </div>
                    </div>

                    {/* 2. TRINETRA SOVEREIGN (The Hero) */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        whileInView={{ scale: 1.05, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="relative p-10 rounded-3xl bg-trinetra-card border border-trinetra-accent shadow-2xl shadow-trinetra-accent/20 z-10 scale-105"
                    >
                        {/* Glow Border Effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-trinetra-accent to-purple-600 rounded-[26px] blur opacity-30 pointer-events-none" />

                        <div className="relative space-y-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold font-display text-white">Trinetra Sovereign</h3>
                                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-trinetra-accent text-white text-xs font-bold uppercase tracking-wider shadow-lg">
                                    <Star size={12} className="fill-current" /> Recommended
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-6xl font-display font-bold text-white">₹4,999<span className="text-2xl font-sans font-normal text-trinetra-muted">/mo</span></p>
                                <p className="text-sm text-trinetra-accent font-medium">Create your first agent in seconds</p>
                            </div>

                            <ul className="space-y-5 pt-6 border-t border-trinetra-accent/20">
                                {[
                                    "24/7 Active Workforce",
                                    "Instant Setup & Deployment",
                                    "Zero Error Rate",
                                    "Infinite Scalability",
                                    "Real-time Analytics Dashboard"
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-base text-white">
                                        <div className="p-1 rounded-full bg-trinetra-accent/20">
                                            <Check size={14} className="text-trinetra-accent" />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href="/login"
                                className="block w-full py-5 rounded-xl bg-gradient-to-r from-trinetra-accent to-purple-600 text-white font-bold text-lg text-center shadow-lg hover:shadow-trinetra-accent/40 hover:scale-[1.02] transition-all duration-300"
                            >
                                Deploy your agent
                            </Link>

                            <p className="text-center text-xs text-trinetra-muted">
                                7-day money-back guarantee. No questions asked.
                            </p>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
