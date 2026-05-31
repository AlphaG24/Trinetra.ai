'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Save, Loader2, Rocket, Zap, Radio, Sliders, Mic, Puzzle, Calendar, CheckSquare, PhoneCall } from 'lucide-react';
import { AgentForm } from './AgentForm';

export function AgentEditor({ agent }: { agent: any }) {
    const [activeTab, setActiveTab] = useState('behavior');
    const [saving, setSaving] = useState(false);

    // Voice Config (Mock State)
    const [voiceId, setVoiceId] = useState('vapi-44');
    const [speed, setSpeed] = useState(1.0);
    const [stability, setStability] = useState(0.5);

    // Integrations Config (Mock State)
    const [integrations, setIntegrations] = useState({
        gcal: false,
        hubspot: false,
        twilio: true
    });

    const tabs = [
        { id: 'behavior', label: 'Behavior' },
        { id: 'voice', label: 'Voice Synthesis' },
        { id: 'integrations', label: 'Integrations' },
    ];

    const handleIntegrationToggle = (key: keyof typeof integrations) => {
        setIntegrations(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="flex flex-col h-full bg-black/40 border-l border-white/5 rounded-tl-xl overflow-hidden">

            {/* Top Tabs */}
            <div className="flex border-b border-white/10 bg-black">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            px-6 py-4 text-sm font-medium border-b-2 transition-colors
                            ${activeTab === tab.id
                                ? 'border-white text-white bg-white/5'
                                : 'border-transparent text-zinc-500 hover:text-white hover:bg-white/5'
                            }
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                {/* TAB 1: BEHAVIOR (Existing Form) */}
                {activeTab === 'behavior' && (
                    <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <AgentForm agent={agent} />
                    </div>
                )}

                {/* TAB 2: VOICE CONFIG */}
                {activeTab === 'voice' && (
                    <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">

                        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                                <Mic className="text-purple-500" size={20} />
                                <h2 className="text-lg font-bold text-white tracking-wide">VOICE SYNTHESIS</h2>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-mono text-zinc-500 uppercase">Voice Model ID</label>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={voiceId}
                                            onChange={(e) => setVoiceId(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none appearance-none"
                                        >
                                            <option value="21m00Tcm4TlvDq8ikWAM">Rachel (American - Calm)</option>
                                            <option value="2EiwWnXFnvU5JabPnv8n">Clyde (Deep - Technical)</option>
                                            <option value="zrHiDhphv9ZnVXBqCLjf">Mimi (Australian - Childish)</option>
                                            <option value="D38z5RcWu1voky8WS1ja">Fin (Irish - Energetic)</option>
                                        </select>
                                        <button
                                            onClick={() => alert('Playing voice sample...')}
                                            className="p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-purple-400 transition-colors shrink-0"
                                            title="Preview Voice"
                                        >
                                            <Sliders size={20} className="rotate-90" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-mono text-zinc-500 uppercase">
                                            <span>Speed</span>
                                            <span className="text-white">{speed}x</span>
                                        </div>
                                        <input
                                            type="range" min="0.5" max="2.0" step="0.1"
                                            value={speed}
                                            onChange={(e) => setSpeed(parseFloat(e.target.value))}
                                            className="w-full accent-purple-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-mono text-zinc-500 uppercase">
                                            <span>Stability</span>
                                            <span className="text-white">{(stability * 100).toFixed(0)}%</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="1" step="0.05"
                                            value={stability}
                                            onChange={(e) => setStability(parseFloat(e.target.value))}
                                            className="w-full accent-purple-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button className="px-6 py-2 bg-white text-black font-bold text-sm rounded-lg hover:bg-zinc-200 transition-colors uppercase tracking-wide">
                                Update Voice Profile
                            </button>
                        </div>
                    </div>
                )}


                {/* TAB 3: INTEGRATIONS */}
                {activeTab === 'integrations' && (
                    <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">

                        <div className="flex items-center gap-2 mb-2">
                            <Puzzle className="text-blue-500" size={20} />
                            <h2 className="text-lg font-bold text-white tracking-wide">NEURAL UPLINKS</h2>
                        </div>
                        <p className="text-zinc-500 text-sm mb-6">Connect external APIs to expand agent capabilities.</p>

                        {/* Telephony Card */}
                        <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-white/5 bg-white/5">
                                <h3 className="text-white font-bold text-sm tracking-wide flex items-center gap-2">
                                    <PhoneCall size={16} className="text-emerald-500" />
                                    Neural Uplink (Phone Number)
                                </h3>
                            </div>
                            <div className="p-6 flex items-center justify-between">
                                <div>
                                    {agent.phone_number ? (
                                        <div className="text-2xl font-mono text-emerald-400 tracking-wider font-bold">
                                            {agent.phone_number}
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <p className="text-zinc-400 text-sm">No active line detected.</p>
                                            <p className="text-zinc-600 text-xs">A dedicated number is required for inbound calls.</p>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    {agent.phone_number ? (
                                        <button className="px-4 py-2 border border-red-500/20 text-red-400 bg-red-500/10 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-red-500/20 transition-colors">
                                            Release Line
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => alert('Provisioning new number...')}
                                            className="px-4 py-2 bg-emerald-500 text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-emerald-400 transition-colors"
                                        >
                                            Purchase Number
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Calendar Card */}
                        <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-white/5 bg-white/5">
                                <h3 className="text-white font-bold text-sm tracking-wide flex items-center gap-2">
                                    <Calendar size={16} className="text-blue-500" />
                                    Temporal Sync (Google Calendar)
                                </h3>
                            </div>
                            <div className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-zinc-300 text-sm">Two-way synchronization.</p>
                                    <p className="text-zinc-500 text-xs max-w-xs">Allows the agent to check availability and book appointments directly to your primary calendar.</p>
                                </div>

                                <button
                                    onClick={() => handleIntegrationToggle('gcal')}
                                    className={`w-12 h-6 rounded-full transition-colors relative border ${integrations.gcal ? 'bg-blue-600 border-blue-500' : 'bg-black border-zinc-700'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-lg ${integrations.gcal ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}
