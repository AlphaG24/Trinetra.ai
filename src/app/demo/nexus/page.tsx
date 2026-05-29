"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { UploadCloud, Terminal, Activity, Loader2, Play, Lock } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Link from "next/link";

// Type definitions for logs
type LogType = 'info' | 'success' | 'error' | 'processing';
interface LogEntry {
    id: string;
    message: string;
    type: LogType;
    timestamp: string;
}

interface Document {
    id: string;
    filename: string;
    file_type: string;
    file_size: number | null;
    status: 'processing' | 'indexed' | 'failed' | 'uploaded';
    created_at: string;
}

export default function NexusDemoPage() {
    const [scansLeft, setScansLeft] = useState(3);
    const [url, setUrl] = useState("");
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [documents, setDocuments] = useState<Document[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    // Scroll to bottom of logs
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    // Fetch Documents (Limited to Demo user or generic) 
    // For demo, we might skip fetching real user docs or just show empty to keep it simple
    // But let's keep it to show functionality if they are logged in.
    useEffect(() => {
        const fetchDocuments = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(3); // Limit history for demo

            if (data && !error) {
                setDocuments(data as Document[]);
            }
        };

        fetchDocuments();
    }, [supabase]);


    const addLog = (message: string, type: LogType = 'info') => {
        const timestamp = new Date().toLocaleTimeString([], { hour12: false });
        setLogs(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            message,
            type,
            timestamp
        }]);
    };

    const handleUrlScrape = async () => {
        if (scansLeft <= 0) return;
        if (!url) return;

        // Decrease credits
        setScansLeft(prev => prev - 1);

        // Validate URL
        if (!url.startsWith('http')) {
            addLog(`Invalid URL format: ${url}`, 'error');
            return;
        }

        setIsProcessing(true);
        addLog(`[DEMO] Initiating scrape for: ${url}`, 'processing');

        // Simulate scrape for demo if not using real backend to save resources, 
        // OR use real backend but limit it. Let's use real backend logic for authenticity.

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            addLog(`User authentication required for cloud scan.`, 'error');
            setIsProcessing(false);
            return;
        }

        const { error } = await supabase
            .from('documents')
            .insert({
                user_id: user.id,
                filename: url,
                file_type: 'url',
                status: 'processing'
            });

        if (error) {
            addLog(`Demo Database Error: ${error.message}`, 'error');
        } else {
            addLog(`Target queued. Demo analysis running...`, 'success');
            setTimeout(() => {
                addLog(`[DEMO] Vulnerability Report: 0 Critical, 2 Warnings found.`, 'success');
                setIsProcessing(false);
            }, 2000);
            setUrl("");
        }
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (scansLeft <= 0) return;
        const file = acceptedFiles[0];
        if (!file) return;

        setScansLeft(prev => prev - 1);
        setIsProcessing(true);
        addLog(`[DEMO] File detected: ${file.name}`, 'info');

        // Simulate processing for demo
        setTimeout(() => {
            addLog(`[DEMO] Secure upload complete.`, 'success');
            addLog(`[DEMO] Parsing content...`, 'processing');
            setTimeout(() => {
                addLog(`[DEMO] Analysis Complete. No malware signatures detected.`, 'success');
                setIsProcessing(false);
                toast.success("Demo Analysis Complete");
            }, 1500);
        }, 1000);

    }, [scansLeft]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        disabled: scansLeft <= 0,
        accept: {
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt', '.md'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        },
        maxFiles: 1
    });

    return (
        <div className="space-y-8 relative">
            {/* Demo Overlay if Expired */}
            {scansLeft <= 0 && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
                    <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl text-center max-w-md animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Lock className="text-emerald-500" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold font-mono text-white mb-2">TRIAL EXPIRED</h2>
                        <p className="text-zinc-400 mb-8 font-mono text-sm">
                            You have exhausted your free demo credits. Upgrade to the full version of NEXUS for unlimited scanning.
                        </p>
                        <Link
                            href="/store"
                            className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold font-mono py-3 px-6 rounded-lg transition-colors w-full block"
                        >
                            PURCHASE FULL ACCESS
                        </Link>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-mono text-zinc-400">NEURAL INGESTION ENGINE</h1>
                    <span className="text-[10px] font-mono text-yellow-500 uppercase tracking-widest bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                        DEMO MODE
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-xs font-mono text-zinc-500">
                        CREDITS REMAINING: <span className={`font-bold ${scansLeft === 0 ? 'text-red-500' : 'text-emerald-500'}`}>{scansLeft}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <span className="text-xs font-mono text-zinc-500">{isProcessing ? 'PROCESSING' : 'READY'}</span>
                    </div>
                </div>
            </div>

            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-500 ${scansLeft <= 0 ? 'blur-sm grayscale' : ''}`}>
                {/* Left Column: Input Panel */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Glass Input Console */}
                    <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/50 shadow-xl rounded-2xl p-6 space-y-6 relative overflow-hidden">
                        {/* URL Input */}
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-pulse pointer-events-none">
                                <Terminal size={16} />
                            </div>

                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="ENTER TARGET URL OR KNOWLEDGE BASE..."
                                className="w-full bg-black/50 border border-zinc-700 p-4 pl-12 rounded-lg text-emerald-400 font-mono tracking-wide placeholder:text-zinc-700 focus:outline-none focus:ring-0 focus:border-emerald-500/50 transition-all"
                                disabled={isProcessing || scansLeft <= 0}
                            />
                            <button
                                onClick={handleUrlScrape}
                                disabled={isProcessing || !url || scansLeft <= 0}
                                className="absolute right-2 top-2 bg-white text-black font-bold text-xs px-4 py-2.5 rounded hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
                                TEST SCAN
                            </button>
                        </div>

                        {/* File Drop Zone */}
                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden
                        ${isDragActive ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/30 hover:border-emerald-500/50 hover:bg-zinc-900/50'}
                    `}
                        >
                            <input {...getInputProps()} />
                            <div className="relative z-10 w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xl border border-zinc-800">
                                <UploadCloud className={`text-zinc-400 group-hover:text-emerald-500 transition-colors ${isProcessing ? 'animate-bounce' : ''}`} size={32} />
                            </div>
                            <p className="relative z-10 text-sm font-bold text-zinc-300 tracking-widest mb-2 group-hover:text-white transition-colors">
                                {isDragActive ? 'RELEASE TO UPLOAD' : 'DROP DEMO FILES'}
                            </p>
                            <p className="relative z-10 text-xs text-zinc-600 font-mono">
                                SUPPORTED FORMATS: PDF, TXT, MD, DOCX
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Mode', value: 'DEMO' },
                            { label: 'Limits', value: '3 SCANS' },
                            { label: 'Uptime', value: '99.99%' }
                        ].map((stat, i) => (
                            <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded p-3 text-center">
                                <div className="text-[10px] text-zinc-500 uppercase font-mono">{stat.label}</div>
                                <div className="text-zinc-300 font-bold font-mono">{stat.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Live Terminal */}
                <div className="lg:col-span-1">
                    <div className="bg-black border border-zinc-800 rounded-lg flex flex-col h-[500px] overflow-hidden shadow-2xl relative">
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent h-[20%] pointer-events-none z-10"
                            animate={{ top: ["-20%", "120%"] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        />

                        <div className="bg-zinc-900/50 px-4 py-2 border-b border-zinc-800 flex items-center justify-between relative z-20">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Terminal Output</span>
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                            </div>
                        </div>

                        <div
                            ref={scrollRef}
                            className="flex-1 p-4 overflow-y-auto space-y-2 font-mono text-xs scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent relative z-20"
                        >
                            {logs.length === 0 && (
                                <div className="text-emerald-500/50 italic text-center mt-32 typing-effect">
                                    {`> DEMO ENVIRONMENT READY...`}<span className="animate-pulse">_</span>
                                </div>
                            )}

                            {logs.map((log) => (
                                <div key={log.id} className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                                    <span className={`break-all ${log.type === 'error' ? 'text-red-500' :
                                        log.type === 'success' ? 'text-emerald-500' :
                                            log.type === 'processing' ? 'text-yellow-500 animate-pulse' :
                                                'text-zinc-300'
                                        }`}>
                                        {log.type === 'processing' && '> '}
                                        {log.message}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
