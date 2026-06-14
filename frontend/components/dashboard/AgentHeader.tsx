'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone, X, Mic, Activity, Volume2, Wifi } from 'lucide-react';
import Vapi from '@vapi-ai/web';
import { createClient } from '@/lib/client';

type AgentLike = {
    id?: string | number;
    name?: string;
    status?: string;
    vapi_assistant_id?: string | null;
};

function getVapiErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    if (typeof error === 'object' && error !== null) {
        const record = error as Record<string, unknown>;
        const directMessage = record.message;
        if (typeof directMessage === 'string') {
            return directMessage;
        }

        const nestedError = record.error;
        if (typeof nestedError === 'string') {
            return nestedError;
        }

        if (typeof nestedError === 'object' && nestedError !== null) {
            const nestedMessage = (nestedError as Record<string, unknown>).message;
            if (typeof nestedMessage === 'string') {
                return nestedMessage;
            }
        }
    }

    return 'Unknown Error';
}

export function AgentHeader({ agent }: { agent: AgentLike }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'active' | 'listening'>('idle');
    const [volumeLevel, setVolumeLevel] = useState(0);
    const vapiRef = useRef<Vapi | null>(null);

    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
        if (!apiKey) {
            console.error('NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set');
            return;
        }

        const vapiInstance = new Vapi(apiKey);
        vapiRef.current = vapiInstance;

        const onCallStart = () => {
            console.log('Call Connected');
            setCallStatus('active');
        };
        const onCallEnd = () => {
            console.log('Call Ended');
            setVolumeLevel(0);
            setCallStatus('idle');
        };
        const onSpeechStart = () => setCallStatus('listening');
        const onSpeechEnd = () => setCallStatus('active');
        const onVolumeLevel = (level: number) => setVolumeLevel(level);
        const onError = (error: unknown) => {
            const message = getVapiErrorMessage(error);
            const normalizedMessage = message.toLowerCase();

            setVolumeLevel(0);
            setCallStatus('idle');

            if (normalizedMessage.includes('meeting has ended') || normalizedMessage.includes('meeting ended')) {
                return;
            }

            console.error('Vapi Error:', error);
            alert('Call Failed: ' + message);
        };

        vapiInstance.on('call-start', onCallStart);
        vapiInstance.on('call-end', onCallEnd);
        vapiInstance.on('speech-start', onSpeechStart);
        vapiInstance.on('speech-end', onSpeechEnd);
        vapiInstance.on('volume-level', onVolumeLevel);
        vapiInstance.on('error', onError);

        return () => {
            vapiInstance.off('call-start', onCallStart);
            vapiInstance.off('call-end', onCallEnd);
            vapiInstance.off('speech-start', onSpeechStart);
            vapiInstance.off('speech-end', onSpeechEnd);
            vapiInstance.off('volume-level', onVolumeLevel);
            vapiInstance.off('error', onError);
            vapiInstance.stop();
            vapiRef.current = null;
        };
    }, []);

    const handleStartCall = async () => {
        const vapi = vapiRef.current;

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
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            const metadata: any = {}
            const variableValues: any = {}
            const assistantOverrides: any = {
                variableValues: {}
            }

            if (user?.id) {
                metadata.userId = user.id
                metadata.userEmail = user.email
                variableValues.user_id = user.id
                variableValues.user_email = user.email
                assistantOverrides.variableValues.user_id = user.id
                assistantOverrides.variableValues.user_email = user.email
            }

            console.log('Attempting vapi.start() with ID:', agent.vapi_assistant_id);
            await vapi.start(agent.vapi_assistant_id, {
                metadata,
                variableValues,
                assistantOverrides
            } as any);
            console.log('vapi.start() called successfully.');
        } catch (error: unknown) {
            const message = getVapiErrorMessage(error);
            console.error('CRITICAL: Failed to start call:', error);
            setCallStatus('idle');
            alert(`Failed to connect: ${message}`);
        }
    };

    const handleEndCall = () => {
        vapiRef.current?.stop();
        setVolumeLevel(0);
        setCallStatus('idle');
        setIsModalOpen(false);
    };

    const handleToggleMute = () => {
        const vapi = vapiRef.current;
        if (vapi) {
            vapi.setMuted(!vapi.isMuted());
        }
    };

    return (
        <div className="mb-8 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <Link
                    href="/dashboard/agents"
                    className="group flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-white"
                >
                    <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
                    Back to Fleet
                </Link>

                <div className="flex items-center gap-3">
                    <div className={`rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${(agent.status === 'active' || agent.status === 'online')
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                        : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
                        }`}>
                        {agent.status || 'Standby'}
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-zinc-200"
                    >
                        <Phone size={16} />
                        Test Agent
                    </button>
                </div>
            </div>

            <div>
                <h1 className="font-display text-4xl font-bold tracking-tight text-white">{agent.name}</h1>
                <p className="mt-1 text-xs font-mono text-zinc-500">ID: {agent.id}</p>
            </div>

            {isModalOpen && (
                <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md duration-300">
                    <div className="relative flex w-full max-w-md flex-col items-center overflow-hidden rounded-2xl border border-white/10 bg-black p-8 shadow-2xl">
                        <div className="absolute top-4 left-0 flex w-full justify-center">
                            <div className="flex items-center gap-2 rounded-full border border-white/5 bg-zinc-900 px-3 py-1 text-[10px] font-mono uppercase text-zinc-500">
                                <Wifi size={12} className={callStatus === 'idle' ? 'text-zinc-600' : 'text-emerald-500'} />
                                {callStatus === 'idle' ? 'Ready to Connect' : 'Vapi Network Secured'}
                            </div>
                        </div>

                        <button
                            onClick={handleEndCall}
                            className="absolute top-4 right-4 text-zinc-500 transition-colors hover:text-white"
                            title="Close Window"
                        >
                            <X size={20} />
                        </button>

                        <div className="relative mt-8 mb-8">
                            {callStatus === 'idle' ? (
                                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-zinc-900">
                                    <Mic size={32} className="text-zinc-600" />
                                </div>
                            ) : (
                                <div className="relative flex h-32 w-32 items-center justify-center">
                                    {callStatus === 'connecting' && (
                                        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
                                    )}

                                    {(callStatus === 'active' || callStatus === 'listening') && (
                                        <>
                                            <div
                                                className="absolute inset-0 rounded-full bg-emerald-500/10 transition-all duration-75"
                                                style={{ transform: `scale(${1 + Math.max(0, volumeLevel * 5)})` }}
                                            />
                                            <div className="absolute inset-4 rounded-full bg-emerald-500/20 animate-pulse" />
                                        </>
                                    )}

                                    <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border border-emerald-500/50 bg-zinc-900 transition-transform">
                                        <Activity size={32} className={`text-emerald-500 ${callStatus === 'listening' ? 'animate-bounce' : ''}`} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <h3 className="mb-2 text-xl font-bold text-white">
                            {callStatus === 'idle' && 'Simulate Agent Call'}
                            {callStatus === 'connecting' && 'Connecting To AI Agent...'}
                            {callStatus === 'active' && 'AI Agent Live'}
                            {callStatus === 'listening' && 'AI Agent Speaking'}
                        </h3>

                        <p className="mb-8 h-10 w-64 text-center text-sm text-zinc-500">
                            {callStatus === 'idle' && "Test your agent's voice, latency, and logic with the Vapi Neural Engine."}
                            {callStatus === 'connecting' && 'Connecting to the AI agent now. Browser web calls can take 5-10 seconds.'}
                            {callStatus === 'active' && <span className="animate-pulse font-mono text-emerald-400">AI Agent Live. Speak naturally.</span>}
                            {callStatus === 'listening' && <span className="animate-pulse font-mono text-emerald-400">AI Agent is responding. Wait for the pause to speak.</span>}
                        </p>

                        <div className="w-full">
                            {callStatus === 'idle' ? (
                                <button
                                    onClick={handleStartCall}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-4 font-bold uppercase tracking-widest text-black transition-all hover:bg-zinc-200"
                                >
                                    <Phone size={18} />
                                    Start Test
                                </button>
                            ) : (
                                <div className="flex gap-4">
                                    <button
                                        onClick={handleToggleMute}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900 py-4 font-bold uppercase text-zinc-400 transition-colors hover:bg-zinc-800"
                                    >
                                        <Volume2 size={18} />
                                        Mute
                                    </button>
                                    <button
                                        onClick={handleEndCall}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 py-4 font-bold uppercase text-red-500 transition-colors hover:bg-red-500/20"
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
