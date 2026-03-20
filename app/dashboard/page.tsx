import { createClient } from '@/utils/supabase/server';
import { Bot, Clock, DollarSign, Activity, Radio } from 'lucide-react';

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch Agent Count
    const { count } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id || '');

    // Mock Data for now
    const runtime = 0; // minutes
    const cost = 0.00; // USD

    const stats = [
        {
            label: 'Active Units',
            value: count || 0,
            subtext: 'Deployed Agents',
            icon: Bot,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20'
        },
        {
            label: 'Total Runtime',
            value: `${runtime}m`,
            subtext: 'This Billing Cycle',
            icon: Clock,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20'
        },
        {
            label: 'Estimated Cost',
            value: `$${cost.toFixed(2)}`,
            subtext: 'Current Usage',
            icon: DollarSign,
            color: 'text-yellow-400',
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/20'
        },
        {
            label: 'System Health',
            value: 'Operational',
            subtext: 'All Systems Normal',
            icon: Activity,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20'
        }
    ];

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-display font-bold text-white tracking-tight">
                    Command Center
                </h1>
                <p className="text-zinc-400 mt-2 font-light flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Real-time telemetry and fleet status
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className={`p-5 rounded-xl border ${stat.border} bg-zinc-900/50 backdrop-blur-sm hover:bg-zinc-900 transition-colors group`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2.5 rounded-lg ${stat.bg} ${stat.color}`}>
                                    <Icon size={20} />
                                </div>
                                {stat.label === 'System Health' && (
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-1 group-hover:scale-105 transition-transform origin-left">
                                    {stat.value}
                                </h3>
                                <p className="text-sm font-medium text-zinc-300 mb-0.5">{stat.label}</p>
                                <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">{stat.subtext}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty Activity State */}
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-6 animate-pulse">
                    <Radio size={32} className="text-zinc-600" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Waiting for Incoming Signals...</h3>
                <p className="text-zinc-500 max-w-sm text-sm leading-relaxed">
                    No activity detected on the neural network. Deploy an agent to begin capturing event logs.
                </p>
            </div>
        </div>
    );
}
