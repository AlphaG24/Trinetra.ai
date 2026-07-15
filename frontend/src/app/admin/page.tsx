import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Banknote, Users, Bot, History, ShieldAlert, Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
    const supabase = await createClient()

    // 1. Auth & Admin Check
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        redirect('/dashboard')
    }

    // 2. Fetch Stats
    // Total Users
    const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

    // Total Agents
    const { count: totalAgents } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })

    // Total Revenue (Transactions)
    const { data: transactions } = await supabase
        .from('transactions')
        .select('amount')

    const totalRevenue = (transactions || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)

    // 3. Fetch Live User Feed (Last 10 profiles)
    const { data: recentUsers } = await supabase
        .from('profiles')
        .select('id, email, subscription_tier, created_at, agents_created')
        .order('created_at', { ascending: false })
        .limit(10)

    // Format Currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    // Format Date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* God Mode Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-red-500/30 pb-6 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldAlert className="text-red-500 animate-pulse" size={20} />
                        <span className="text-xs font-mono text-red-500 tracking-[0.3em] uppercase">Restricted Access // Level 5</span>
                    </div>
                    <h1 className="text-4xl font-display font-bold text-white tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-red-200 to-red-500 w-fit">
                        TRINETRA <span className="text-red-600">//</span> OVERWATCH
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-red-950/40 border border-red-500/30 rounded text-red-400 text-xs font-mono flex items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        LIVE FEED ACTIVE
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Revenue Card */}
                <div className="relative overflow-hidden bg-black/40 border border-red-500/20 rounded-2xl p-6 group hover:border-red-500/40 transition-colors">
                    <div className="absolute -right-6 -top-6 text-red-500/5 group-hover:text-red-500/10 transition-colors rotate-12">
                        <Banknote size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-red-400/80 text-xs font-mono uppercase tracking-wider mb-2">
                            <Banknote size={14} /> Global Revenue
                        </div>
                        <div className="text-4xl font-display text-white font-medium tracking-tight">
                            {formatCurrency(totalRevenue)}
                        </div>
                        <div className="mt-4 text-xs font-mono text-trinetra-muted flex items-center gap-2">
                            <span className="text-green-400">REAL-TIME SYNC</span>
                        </div>
                    </div>
                </div>

                {/* Total Users Card */}
                <div className="relative overflow-hidden bg-black/40 border border-red-500/20 rounded-2xl p-6 group hover:border-red-500/40 transition-colors">
                    <div className="absolute -right-6 -top-6 text-red-500/5 group-hover:text-red-500/10 transition-colors rotate-12">
                        <Users size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-red-400/80 text-xs font-mono uppercase tracking-wider mb-2">
                            <Users size={14} /> Total Operatives
                        </div>
                        <div className="text-4xl font-display text-white font-medium tracking-tight">{totalUsers || 0}</div>
                        <div className="mt-4 text-xs font-mono text-trinetra-muted">
                            ACTIVE IN FIELD
                        </div>
                    </div>
                </div>

                {/* Total Agents Card */}
                <div className="relative overflow-hidden bg-black/40 border border-red-500/20 rounded-2xl p-6 group hover:border-red-500/40 transition-colors">
                    <div className="absolute -right-6 -top-6 text-red-500/5 group-hover:text-red-500/10 transition-colors rotate-12">
                        <Bot size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-red-400/80 text-xs font-mono uppercase tracking-wider mb-2">
                            <Bot size={14} /> Neutral Units
                        </div>
                        <div className="text-4xl font-display text-white font-medium tracking-tight">{totalAgents || 0}</div>
                        <div className="mt-4 text-xs font-mono text-trinetra-muted">
                            CURRENTLY ONLINE
                        </div>
                    </div>
                </div>

            </div>

            {/* Live User Feed Section */}
            <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/20 backdrop-blur-sm">
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <h3 className="text-lg font-display text-white flex items-center gap-2">
                        <Activity className="text-red-500" size={18} />
                        Live Command Feed
                    </h3>
                    <div className="flex gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="w-2 h-2 rounded-full bg-red-500/50 animate-pulse delay-75"></span>
                        <span className="w-2 h-2 rounded-full bg-red-500/20 animate-pulse delay-150"></span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-6 py-4 text-xs font-mono text-trinetra-muted uppercase tracking-wider w-1/3">Operative Identity</th>
                                <th className="px-6 py-4 text-xs font-mono text-trinetra-muted uppercase tracking-wider">Clearance Level</th>
                                <th className="px-6 py-4 text-xs font-mono text-trinetra-muted uppercase tracking-wider">Induction Date</th>
                                <th className="px-6 py-4 text-xs font-mono text-trinetra-muted uppercase tracking-wider text-right">Units Active</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {recentUsers?.map((profile: any) => (
                                <tr key={profile.id} className="group hover:bg-white/[0.03] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-white group-hover:text-red-400 transition-colors font-mono">{profile.email}</span>
                                            <span className="text-[10px] text-zinc-500 font-mono hidden group-hover:block transition-all">ID: {profile.id}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${profile.subscription_tier === 'sovereign'
                                            ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(220,38,38,0.1)]'
                                            : 'bg-white/5 text-zinc-400 border-white/10'
                                            }`}>
                                            {profile.subscription_tier === 'sovereign' ? 'SOVEREIGN' : 'PROBATIONARY'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-zinc-400 font-mono">
                                        {formatDate(profile.created_at)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-mono text-white text-lg">{profile.agents_created || 0}</span>
                                    </td>
                                </tr>
                            ))}

                            {(!recentUsers || recentUsers.length === 0) && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 font-mono text-sm">
                                        NO OPERATIVES DETECTED IN SECTOR.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    )
}
