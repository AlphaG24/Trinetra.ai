'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Added import
import { Save, Loader2, Rocket, Zap, Radio } from 'lucide-react'; // Added import
import { updateAgent } from '@/app/actions/updateAgent';

export function AgentForm({ agent }: { agent: any }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);

        // Call the server action to update Supabase AND sync with Vapi
        const result = await updateAgent(agent.id, formData);

        if (!result.success) {
            alert('Sync Error: ' + result.error);
        } else {
            alert('Antigravity Modules Synced & Vapi Connected Successfully');
            router.refresh(); // Refresh to get the new vapi_assistant_id
        }
        setLoading(false);
    };

    return (
        <form action={handleSubmit} className="space-y-8">

            {/* Section 1: Operational Profile */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                    <Rocket className="text-blue-500" size={20} />
                    <h2 className="text-lg font-bold text-white tracking-wide">OPERATIONAL PROFILE</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-mono text-zinc-500 uppercase">Agent Callsign</label>
                        <input
                            name="name"
                            defaultValue={agent.name}
                            className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                            placeholder="e.g. Nexus-7"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-mono text-zinc-500 uppercase">Operational Role</label>
                        <input
                            name="role"
                            defaultValue={agent.role}
                            className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                            placeholder="e.g. Level 1 Support"
                        />
                    </div>
                </div>
            </div>

            {/* Section 2: Antigravity Core */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                    <Zap className="text-trinetra-accent" size={20} />
                    <h2 className="text-lg font-bold text-white tracking-wide">ANTIGRAVITY CORE</h2>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-mono text-zinc-500 uppercase flex items-center gap-2">
                            Core Logic
                            <span className="text-zinc-600">// System Prompt</span>
                        </label>
                        <textarea
                            name="prompt"
                            defaultValue={agent.prompt}
                            rows={8}
                            className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-trinetra-accent outline-none transition-colors leading-relaxed"
                            placeholder="Define the agent's primary directives and behavioral constraints..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-mono text-zinc-500 uppercase flex items-center gap-2">
                            Initiation Sequence
                            <span className="text-zinc-600">// Welcome Message</span>
                        </label>
                        <div className="relative">
                            <Radio className="absolute left-4 top-3.5 text-zinc-600" size={16} />
                            <input
                                name="welcome_message"
                                defaultValue={agent.welcome_message}
                                className="w-full bg-black border border-white/10 rounded-lg pl-12 pr-4 py-3 text-white focus:border-trinetra-accent outline-none transition-colors"
                                placeholder="First message sent to user..."
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Action */}
            <div className="flex justify-end pt-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-8 py-3 bg-white text-black font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                    Sync Configuration
                </button>
            </div>

        </form>
    );
}
