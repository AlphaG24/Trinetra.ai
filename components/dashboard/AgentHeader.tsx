'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone, X, Mic, Activity, Volume2, Wifi, Loader2 } from 'lucide-react';
import Vapi from '@vapi-ai/web'; // Import Vapi directly

export function AgentHeader({ agent }: { agent: any }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'active' | 'listening'>('idle');
    const [vapi, setVapi] = useState<Vapi | null>(null);
    const [volumeLevel, setVolumeLevel] = useState(0);

    // Initialize Vapi SDK
    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
        if (!apiKey) {
            console.error('NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set');
            return;
        }
        const vapiInstance = new Vapi(apiKey);
        setVapi(vapiInstance);

        return () => {
            vapiInstance.stop();
        };
    }, []);

    // Setup Event Listeners
    useEffect(() => {
        if (!vapi) return;

        const onCallStart = () => {
            console.log('Call Connected');
            setCallStatus('active');
        };
        const onCallEnd = () => {
            console.log('Call Ended');
            setCallStatus('idle');
        };
        const onSpeechStart = () => setCallStatus('listening');
        const onSpeechEnd = () => setCallStatus('active');
        const onVolumeLevel = (level: number) => setVolumeLevel(level);
        const onError = (e: any) => {
            console.error('Vapi Error:', e);
            setCallStatus('idle');
            alert('Call Failed: ' + (e.message || 'Unknown Error'));
        };

        vapi.on('call-start', onCallStart);
        vapi.on('call-end', onCallEnd);
        vapi.on('speech-start', onSpeechStart);
        vapi.on('speech-end', onSpeechEnd);
        vapi.on('volume-level', onVolumeLevel);
        vapi.on('error', onError);

        return () => {
            vapi.off('call-start', onCallStart);
            vapi.off('call-end', onCallEnd);
            vapi.off('speech-start', onSpeechStart);
            vapi.off('speech-end', onSpeechEnd);
            vapi.off('volume-level', onVolumeLevel);
            vapi.off('error', onError);
        };
    }, [vapi]);

    const handleStartCall = async () => {
        console.log('--- Vapi Connection Debug ---');
        console.log('Vapi Instance:', vapi);
        console.log('Agent Data:', agent);
        console.log('Agent Vapi ID:', agent.vapi_assistant_id);

        if (!vapi) {
            console.error('ERROR: Vapi SDK is NULL. Check initialization.');
            alert('Vapi SDK not initialized. Check console for errors.');
            return;
        }

        if (!agent.vapi_assistant_id) {
            console.error('ERROR: Missing vapi_assistant_id in agent object.');
            alert('Sync Configuration first! No Vapi ID found for this agent.');
            return;
        }

        setCallStatus('connecting');
        try {
            console.log('Attempting vapi.start() with ID:', agent.vapi_assistant_id);
            // Start call with the specific vapi_assistant_id
            await vapi.start(agent.vapi_assistant_id);
            console.log('vapi.start() called successfully.');
        } catch (err: any) {
            console.error('CRITICAL: Failed to start call:', err);
            console.error('Error Details:', JSON.stringify(err, null, 2));
            setCallStatus('idle');
            alert(`Failed to connect: ${err.message || 'Unknown Network Error'}`);
        }
    };

    const handleEndCall = () => {
        vapi?.stop();
        setCallStatus('idle');
        setIsModalOpen(false);
    };

    const handleToggleMute = () => {
        if (vapi) {
            vapi.setMuted(!vapi.muted); // Assuming vapi.muted state is accessible or we track it
        }
    };

    return (
        <div className="flex flex-col gap-6 mb-8">
            {/* Top Row: Navigation & Actions */}
            <div className="flex items-center justify-between">
                <Link
                    href="/dashboard/agents"
                    className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Fleet
                </Link>

                <div className="flex items-center gap-3">
                    <div className={`px-2 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-wider ${agent.status === 'active' || agent.status === 'online'
                        ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                        : 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10'
                        }`}>
                        {agent.status || 'Standby'}
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-zinc-200 transition-colors"
                    >
                        <Phone size={16} />
                        Test Agent
                    </button>
                </div>
            </div>

            {/* Title */}
            <div>
                <h1 className="text-4xl font-display font-bold text-white tracking-tight">{agent.name}</h1>
                <p className="text-zinc-500 font-mono text-xs mt-1">ID: {agent.id}</p>
            </div>

            {/* TEST CALL MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-full max-w-md bg-black border border-white/10 rounded-2xl shadow-2xl p-8 flex flex-col items-center overflow-hidden">

                        {/* Status Bar */}
                        <div className="absolute top-4 left-0 w-full flex justify-center">
                            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-white/5 rounded-full text-[10px] font-mono text-zinc-500 uppercase">
                                <Wifi size={12} className={callStatus === 'idle' ? 'text-zinc-600' : 'text-emerald-500'} />
                                {callStatus === 'idle' ? 'Ready to Connect' : 'Vapi Network Secured'}
                            </div>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={handleEndCall}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors title='Close Window'"
                        >
                            <X size={20} />
                        </button>

                        {/* Avatar / Visualizer */}
                        <div className="mt-8 mb-8 relative">
                            {callStatus === 'idle' ? (
                                <div className="w-24 h-24 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center">
                                    <Mic size={32} className="text-zinc-600" />
                                </div>
                            ) : (
                                <div className="relative w-32 h-32 flex items-center justify-center">
                                    {/* Connectivity or Listening State */}
                                    {callStatus === 'connecting' && (
                                        <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full animate-ping" />
                                    )}

                                    {/* Active/Listening Animation */}
                                    {(callStatus === 'active' || callStatus === 'listening') && (
                                        <>
                                            {/* Pulse Effect based on Volume Level */}
                                            <div
                                                className="absolute inset-0 bg-emerald-500/10 rounded-full transition-all duration-75"
                                                style={{ transform: `scale(${1 + Math.max(0, volumeLevel * 5)})` }}
                                            /* Scaling factor assumes volumeLevel is 0-1 range roughly, adjusting for visual impact */
                                            />
                                            <div className="absolute inset-4 bg-emerald-500/20 rounded-full animate-pulse" />
                                        </>
                                    )}

                                    <div className="relative w-24 h-24 bg-zinc-900 border border-emerald-500/50 rounded-full flex items-center justify-center z-10 transition-transform">
                                        <Activity size={32} className={`text-emerald-500 ${callStatus === 'listening' ? 'animate-bounce' : ''}`} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Text Status */}
                        <h3 className="text-xl font-bold text-white mb-2">
                            {callStatus === 'idle' && 'Simulate Agent Call'}
                            {callStatus === 'connecting' && 'Establishing Uplink...'}
                            {callStatus === 'active' && 'Connected'}
                            {callStatus === 'listening' && 'Processing Input...'}
                        </h3>

                        <p className="text-zinc-500 text-sm text-center mb-8 h-10 w-64">
                            {callStatus === 'idle' && "Test your agent's voice, latency, and logic with the Vapi Neural Engine."}
                            {callStatus === 'connecting' && "Handshaking with Vapi Neural Engine..."}
                            {(callStatus === 'active' || callStatus === 'listening') && <span className="text-emerald-400 font-mono animate-pulse">● Live Transmission</span>}
                        </p>

                        {/* Controls */}
                        <div className="w-full">
                            {callStatus === 'idle' ? (
                                <button
                                    onClick={handleStartCall}
                                    className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <Phone size={18} />
                                    Start Test
                                </button>
                            ) : (
                                <div className="flex gap-4">
                                    <button
                                        onClick={handleToggleMute}
                                        className="flex-1 py-4 bg-zinc-900 border border-white/10 text-zinc-400 font-bold uppercase rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
                                    >
                                        <Volume2 size={18} />
                                        Mute
                                    </button>
                                    <button
                                        onClick={handleEndCall}
                                        className="flex-1 py-4 bg-red-500/10 border border-red-500/20 text-red-500 font-bold uppercase rounded-xl flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
                                    >
                                        <Phone size={18} className="rotate-[135deg]" />
                                        Hang Up
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
