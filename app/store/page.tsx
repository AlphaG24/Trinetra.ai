"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Zap, Lock, ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ProductCardProps {
    id: string;
    title: string;
    description: string;
    features: string[];
    price: string;
    status: string;
}

const ProductCard = ({ id, title, description, features, price, status }: ProductCardProps) => {
    const router = useRouter();
    const isComingSoon = status === 'COMING SOON';

    const handleAcquire = () => {
        if (isComingSoon) return;

        // Simulate Purchase Logic
        toast.loading("Processing transaction...");

        setTimeout(() => {
            toast.dismiss();
            toast.success(`Successfully acquired ${title}`);
            // Set simple cookie to persist ownership state
            document.cookie = "user_has_nexus=true; path=/; max-age=31536000";

            // Redirect to Dashboard
            router.push('/dashboard?purchase=success');
        }, 1500);
    };

    return (
        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300 group flex flex-col h-full relative">
            {/* Header Image Area */}
            <div className="h-48 bg-zinc-950 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_14px] opacity-50" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />

                <div className="relative z-10 p-6 text-center transform group-hover:scale-105 transition-transform duration-500">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] transition-all">
                        <ShieldCheck size={32} className="text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-bold font-mono tracking-wider text-white">{title}</h3>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 flex flex-col">
                <p className="text-zinc-400 text-sm mb-6 leading-relaxed flex-1 font-mono">
                    {description}
                </p>

                {/* Features */}
                <div className="space-y-3 mb-8">
                    {features.map((feat, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                            <Zap size={10} className="text-emerald-500" />
                            {feat}
                        </div>
                    ))}
                </div>

                {/* Footer / Actions */}
                <div className="border-t border-zinc-800/50 pt-6 mt-auto">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xl font-bold text-white font-mono">{price}</span>
                        <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border 
                            ${isComingSoon ? 'bg-zinc-900 border-zinc-800 text-zinc-600' : 'bg-emerald-900/20 border-emerald-500/30 text-emerald-500'}`}>
                            {status}
                        </span>
                    </div>

                    <button
                        onClick={handleAcquire}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-bold font-mono transition-all uppercase tracking-wider
                            ${isComingSoon
                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                : 'bg-white text-black hover:bg-emerald-400 hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]'
                            }`}
                        disabled={isComingSoon}
                    >
                        {isComingSoon ? 'In Development' : 'Initialize Acquisition'}
                        {!isComingSoon && <ArrowUpRight size={14} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function StorePage() {
    const products = [
        {
            id: 'nexus',
            title: 'NEXUS: SECURITY AI',
            description: 'Automated vulnerability scanning and report generation using advanced LLMs.',
            features: [
                "Automated Vulnerability Parsing",
                "Real-time Threat Intelligence",
                "PDF & Log Analysis",
                "Instant Reporting"
            ],
            price: '$49/mo',
            status: 'AVAILABLE'
        },
        {
            id: 'aura',
            title: 'AURA: SYSTEM CONTROL',
            description: 'Full autonomous system control and defense mechanism for critical infrastructure.',
            features: [
                "Autonomous Patching",
                "Self-Healing Networks",
                "Resource Optimization"
            ],
            price: '$199/mo',
            status: 'COMING SOON'
        },
        {
            id: 'sentinel',
            title: 'SENTINEL: NET GUARD',
            description: 'Real-time packet inspection and anomaly detection for internal networks.',
            features: [
                "Deep Packet Inspection",
                "Lateral Movement Detection",
                "Zero-Day Heuristics"
            ],
            price: '$899/mo',
            status: 'COMING SOON'
        }
    ];

    return (
        <div className="space-y-8 min-h-screen p-8 bg-zinc-950">
            {/* Header */}
            <div className="flex flex-col gap-2 border-b border-zinc-900 pb-8">
                <div className="flex items-center gap-3">
                    <ShoppingCart className="text-emerald-500" size={32} />
                    <h1 className="text-3xl font-bold font-mono text-white tracking-tighter">
                        NEURAL MARKETPLACE
                    </h1>
                </div>
                <p className="text-zinc-400 max-w-2xl text-sm font-mono pl-11">
                    Deploy advanced autonomous agents. Instant provisioning. Enterprise-grade encryption.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(p => (
                    <ProductCard key={p.id} {...p} />
                ))}
            </div>
        </div>
    );
}
