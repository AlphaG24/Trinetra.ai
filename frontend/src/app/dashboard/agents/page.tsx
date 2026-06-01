import { createClient } from '@/utils/supabase/server';
import { Plus, Bot, Power, Activity } from 'lucide-react';
import Link from 'next/link';

export default async function AgentsPage() {
    const supabase = await createClient(); // Await createClient
    const { data: { user } } = await supabase.auth.getUser();

    const { data: agents } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user?.id || '');

    const hasAgents = agents && agents.length > 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white tracking-tight">Active Neural Units</h1>
                    <p className="text-zinc-400 mt-2 font-light">Manage and configure your autonomous fleet.</p>
                </div>
                <Link
                    href="/dashboard/deploy"
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition-colors"
                >
                    <Plus size={18} />
                    Assemble New Unit
                </Link>
            </div>

            {hasAgents ? (
                /* Grid of Agents */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {agents.map((agent) => (
                        <Link
                            href={`/dashboard/agents/${agent.id}`}
                            key={agent.id}
                            className="group relative bg-zinc-900/40 border border-white/10 rounded-xl p-6 hover:bg-zinc-900/60 hover:border-white/20 transition-all duration-300"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-white/5 rounded-lg text-white group-hover:bg-white/10 transition-colors">
                                    <Bot size={24} />
                                </div>
                                <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-mono border ${agent.status === 'active' || agent.status === 'online'
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                                    }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${agent.status === 'active' || agent.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'
                                        }`} />
                                    {agent.status === 'active' || agent.status === 'online' ? 'ONLINE' : 'STANDBY'}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-trinetra-accent transition-colors">
                                {agent.name}
                            </h3>
                            <p className="text-sm text-zinc-400 font-mono mb-6 uppercase tracking-wider">
                                {agent.role}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-zinc-500 border-t border-white/5 pt-4">
                                <div className="flex items-center gap-1.5">
                                    <Power size={12} />
                                    ID: {agent.id.slice(0, 8)}
                                </div>
                                <div className="flex items-center gap-1.5 ml-auto text-emerald-500/80">
                                    <Activity size={12} />
                                    Stable
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                /* Empty State */
                <div className="border border-dashed border-white/10 bg-black/20 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <Bot className="text-zinc-600" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Active Units Detected</h3>
                    <p className="text-zinc-400 max-w-md mb-8 leading-relaxed">
                        Your fleet is currently empty. Visit the Template Library to clone a pre-trained neural network and begin operations.
                    </p>
                    <Link
                        href="/dashboard/deploy"
                        className="px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Deploy First Agent
                    </Link>
                </div>
            )}
        </div>
    );
}
