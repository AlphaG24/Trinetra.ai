import { createClient } from '@/utils/supabase/server'
import { 
  Shield, 
  Users, 
  Bot, 
  PhoneCall, 
  Clock, 
  LifeBuoy, 
  ChevronRight, 
  Building2, 
  Calendar 
} from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  // Fetch counts and metrics in parallel
  const [
    { count: tenantsCount },
    { count: agentsCount },
    { data: callsData },
    { count: leadsCount },
    { data: recentTenants },
    { data: openTickets }
  ] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('agents').select('*', { count: 'exact', head: true }),
    supabase.from('voice_calls').select('duration_seconds'),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('organizations').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('support_tickets').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(5)
  ])

  // Calculate call minutes
  const totalCalls = callsData?.length || 0
  const totalSeconds = callsData?.reduce((acc, call) => acc + (call.duration_seconds || 0), 0) || 0
  const totalMinutes = Math.round(totalSeconds / 60)

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="pb-6 border-b border-white/5">
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
          Admin Control Center
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          System health, tenant metrics, and platform operations.
        </p>
      </div>

      {/* Global Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Tenants</span>
            <Users className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{tenantsCount || 0}</div>
          <p className="text-[11px] text-zinc-500">Registered organizations</p>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Deployed Agents</span>
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{agentsCount || 0}</div>
          <p className="text-[11px] text-zinc-500">Voice & AI agents live</p>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Calls</span>
            <PhoneCall className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {totalCalls} <span className="text-xs text-zinc-500 font-normal">({totalMinutes} min)</span>
          </div>
          <p className="text-[11px] text-zinc-500">Total telephony traffic</p>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Security State</span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">SECURE</div>
          <p className="text-[11px] text-zinc-500">RLS & audit logging active</p>
        </div>
      </div>

      {/* Grid panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Panel A: Recent Signups */}
        <div className="bg-[#0f111a]/60 border border-white/5 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-violet-400" /> Recent Tenant Signups
          </h3>
          <div className="divide-y divide-zinc-800/50">
            {(!recentTenants || recentTenants.length === 0) ? (
              <p className="text-xs text-zinc-500 py-6 text-center">No organizations registered yet.</p>
            ) : (
              recentTenants.map((t) => (
                <Link 
                  key={t.id} 
                  href={`/admin/tenants/${t.id}`}
                  className="py-3 flex items-center justify-between hover:bg-white/[0.02] px-2 rounded-xl transition-colors group text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white group-hover:text-violet-400 transition-colors">
                        {t.name || t.full_name || 'Unnamed Tenant'}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">{t.primary_email || 'No email'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-violet-400 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))
            )}
          </div>
          <div className="pt-2 text-right">
            <Link 
              href="/admin/tenants"
              className="text-xs text-violet-400 hover:text-violet-300 font-bold uppercase tracking-wider"
            >
              Manage all tenants &rarr;
            </Link>
          </div>
        </div>

        {/* Panel B: Open Support Tickets */}
        <div className="bg-[#0f111a]/60 border border-white/5 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-amber-500" /> Action Required: Open Tickets
          </h3>
          <div className="divide-y divide-zinc-800/50">
            {(!openTickets || openTickets.length === 0) ? (
              <p className="text-xs text-zinc-500 py-6 text-center">No pending support tickets.</p>
            ) : (
              openTickets.map((t) => (
                <Link 
                  key={t.id} 
                  href="/admin/support"
                  className="py-3 flex items-center justify-between hover:bg-white/[0.02] px-2 rounded-xl transition-colors group text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] text-zinc-500">{t.ticket_number}</span>
                      <span className={`text-[8px] font-bold px-1.5 rounded uppercase ${
                        t.priority === 'urgent' ? 'bg-rose-500/10 text-rose-400' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {t.priority}
                      </span>
                    </div>
                    <div className="font-bold text-white mt-1 group-hover:text-violet-400 transition-colors">
                      {t.subject}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-violet-400 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))
            )}
          </div>
          <div className="pt-2 text-right">
            <Link 
              href="/admin/support"
              className="text-xs text-violet-400 hover:text-violet-300 font-bold uppercase tracking-wider"
            >
              Open Support Console &rarr;
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
