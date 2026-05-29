"use client";

import { useState } from "react";
import { Check, Copy, Terminal, ChevronRight, Hash, BookOpen, Shield, Cpu, Eye } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30 selection:text-emerald-500">
            {/* Header / Navbar */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800 z-50 px-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="h-8 w-8 bg-black border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 group-hover:text-emerald-500 group-hover:border-emerald-500/50 transition-all shadow-lg">
                            <BookOpen size={16} />
                        </div>
                        <span className="font-mono font-bold tracking-tighter text-lg text-zinc-500 group-hover:text-zinc-200 transition-colors">Trinetra Search Protocol</span>
                    </Link>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-500 font-mono">
                        v1.0.0
                    </span>
                </div>

                <Link
                    href="/dashboard"
                    className="text-xs font-mono text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                >
                    <Terminal size={12} />
                    Open Console
                </Link>
            </header>

            <div className="pt-16 max-w-7xl mx-auto flex">
                {/* Fixed Sidebar */}
                <aside className="w-64 fixed top-16 bottom-0 left-0 hidden lg:block overflow-y-auto border-r border-zinc-800 bg-zinc-950/50">
                    <nav className="p-6 space-y-8">
                        {/* Section Group */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Overview</h4>
                            <ul className="space-y-2 border-l border-zinc-800 ml-1">
                                <li>
                                    <Link href="#introduction" className="block pl-4 py-1 text-sm text-emerald-500 border-l border-emerald-500 -ml-px font-medium">Introduction</Link>
                                </li>
                                <li>
                                    <Link href="#authentication" className="block pl-4 py-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">Authentication</Link>
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Core Infrastructure</h4>
                            <ul className="space-y-2 border-l border-zinc-800 ml-1">
                                <li>
                                    <Link href="#vault" className="block pl-4 py-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">The Vault</Link>
                                </li>
                                <li>
                                    <Link href="#eye" className="block pl-4 py-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">The Eye</Link>
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Agents</h4>
                            <ul className="space-y-2 border-l border-zinc-800 ml-1">
                                <li>
                                    <Link href="#auditor" className="block pl-4 py-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">Auditor Node</Link>
                                </li>
                                <li>
                                    <Link href="#nexus" className="block pl-4 py-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">Nexus Node</Link>
                                </li>
                            </ul>
                        </div>
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 lg:pl-64 min-h-screen">
                    <div className="max-w-3xl mx-auto px-6 py-12 space-y-20">

                        {/* Introduction */}
                        <section id="introduction" className="space-y-6 scroll-mt-24">
                            <div className="flex items-center gap-2 text-emerald-500 mb-2">
                                <Hash size={20} />
                                <span className="font-mono text-sm uppercase tracking-widest">Introduction</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
                                Welcome to the Infrastructure.
                            </h1>
                            <p className="text-lg text-zinc-400 leading-relaxed">
                                Trinetra provides a programmatic interface for autonomous compliance and intelligence gathering. You can interact with our agents via the Console or the API.
                            </p>
                            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800/50 text-sm text-zinc-300 flex gap-3 items-start">
                                <div className="mt-0.5 min-w-[16px] text-emerald-500">
                                    <Terminal size={16} />
                                </div>
                                <p>
                                    Our API is designed to be <span className="text-white font-medium">stateless</span> and <span className="text-white font-medium">asynchronous</span>. Long-running tasks (like deep audits) will return a job ID for polling.
                                </p>
                            </div>
                        </section>

                        {/* Authentication */}
                        <section id="authentication" className="space-y-6 scroll-mt-24">
                            <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                <Hash size={20} />
                                <span className="font-mono text-sm uppercase tracking-widest">Authentication</span>
                            </div>
                            <h2 className="text-3xl font-bold tracking-tight text-white">
                                Authentication
                            </h2>
                            <p className="text-lg text-zinc-400 leading-relaxed">
                                All API requests must include your <code className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-emerald-400 font-mono text-sm">sk_live_</code> key in the Authorization header. You can find this key in your Dashboard Settings.
                            </p>

                            {/* Code Block */}
                            <CodeBlock
                                language="bash"
                                code={`curl -X POST https://api.trinetra.ai/v1/audit \\
  -H "Authorization: Bearer sk_live_trinetra_..." \\
  -d '{"file_url": "https://..."}'`}
                            />
                        </section>

                        {/* Future Sections Placeholder */}
                        <section id="vault" className="space-y-6 scroll-mt-24 opacity-50">
                            <div className="flex items-center gap-2 text-zinc-600 mb-2">
                                <Shield size={20} />
                                <span className="font-mono text-sm uppercase tracking-widest">The Vault (Coming Soon)</span>
                            </div>
                            <p className="border-l-2 border-zinc-800 pl-4 py-2 text-zinc-500 italic">
                                Documentation for secure storage protocols is currently classified.
                            </p>
                        </section>

                    </div>

                    {/* Footer */}
                    <footer className="border-t border-zinc-800 py-12 px-6 mt-20">
                        <div className="max-w-3xl mx-auto flex items-center justify-between text-zinc-500 text-sm">
                            <span>&copy; 2024 Trinetra Systems</span>
                            <div className="flex gap-4">
                                <Link href="#" className="hover:text-white transition-colors">Status</Link>
                                <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
                                <Link href="#" className="hover:text-white transition-colors">GitHub</Link>
                            </div>
                        </div>
                    </footer>
                </main>
            </div>
        </div>
    );
}

function CodeBlock({ code, language = "bash" }: { code: string, language?: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="rounded-xl overflow-hidden bg-[#0d0d0d] border border-zinc-800 group shadow-2xl">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                    </div>
                    <span className="ml-2 text-xs text-zinc-500 font-mono">{language}</span>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors text-xs font-medium"
                >
                    {copied ? (
                        <>
                            <Check size={14} className="text-emerald-500" />
                            <span className="text-emerald-500">Copied</span>
                        </>
                    ) : (
                        <>
                            <Copy size={14} />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>

            {/* Code Content */}
            <div className="p-4 overflow-x-auto">
                <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-all">
                    <code className="text-zinc-300">
                        {code}
                    </code>
                </pre>
            </div>
        </div>
    );
}
