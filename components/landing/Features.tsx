"use client";

import { Clock, BrainCircuit, Zap } from "lucide-react";
import { motion } from "framer-motion";

const features = [
    {
        icon: <Clock size={32} className="text-purple-400" />,
        title: "Zero Downtime",
        description: "Ai Agents work 24/7/365. No sick days. No holidays. Always active, always ready."
    },
    {
        icon: <BrainCircuit size={32} className="text-purple-400" />,
        title: "Infinite Memory",
        description: "Instant recall of client history, appointments, and pricing. No training required."
    },
    {
        icon: <Zap size={32} className="text-purple-400" />,
        title: "Instant Scalability",
        description: "Handle 1 call or 10,000 simultaneous calls. Ai Agents scale instantly with your demand."
    }
];

export function Features() {
    return (
        <section className="py-24 px-6 bg-trinetra-bg relative overflow-hidden">

            {/* --- BACKGROUND ACCENTS --- */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-purple-500/5 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-gradient-to-tr from-purple-500/5 to-transparent pointer-events-none" />

            <div className="max-w-6xl mx-auto relative z-10">

                {/* Header */}
                <div className="text-center mb-16 space-y-4">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-4xl md:text-5xl font-display font-medium text-white tracking-tight"
                    >
                        Beyond Human Limits.
                    </motion.h2>
                    <div className="w-20 h-1 bg-purple-500/50 mx-auto rounded-full" />
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.2 }}
                            className="group relative p-8 rounded-2xl bg-trinetra-card/40 border border-white/10 backdrop-blur-sm hover:border-trinetra-accent/50 transition-all duration-300"
                        >
                            {/* Icon Container */}
                            <div className="w-14 h-14 rounded-xl bg-trinetra-surface/50 border border-white/5 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                {feature.icon}
                            </div>

                            {/* Content */}
                            <h3 className="text-2xl font-display font-medium text-white mb-3 group-hover:text-purple-400 transition-colors">
                                {feature.title}
                            </h3>
                            <p className="text-trinetra-muted/80 leading-relaxed text-sm font-sans">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>

            </div>
        </section>
    );
}
