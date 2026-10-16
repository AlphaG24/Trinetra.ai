'use client'

import React from 'react'
import Link from 'next/link'
import {
  Shield,
  Users,
  Bot,
  PhoneCall,
  LifeBuoy,
  ChevronRight,
  Building2,
  Activity,
} from 'lucide-react'
import ObservabilityWidgets from '@/components/admin/ObservabilityWidgets'

interface RecentTenant {
  id: string
  name?: string | null
  full_name?: string | null
  primary_email?: string | null
  created_at: string
}

interface SupportTicket {
  id: string
  ticket_number: string
  priority: string
  subject: string
  status: string
  created_at: string
}

interface AdminOverviewClientProps {
  tenantsCount: number
  agentsCount: number
  totalCalls: number
  totalMinutes: number
  recentTenants: RecentTenant[]
  openTickets: SupportTicket[]
}

export default function AdminOverviewClient({
  tenantsCount,
  agentsCount,
  totalCalls,
  totalMinutes,
  recentTenants,
  openTickets,
}: AdminOverviewClientProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="pb-6 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--heading)] font-playfair">
            Admin Control Center
          </h1>
          <p className="text-[var(--muted)] text-sm mt-1 font-merriweather">
            System health, tenant metrics, and platform operations.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--card-bg)] border border-[var(--border)] text-[var(--muted)] text-xs font-mono shadow-2xs">
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          <span>Metrics exclude developer/tester accounts</span>
        </div>
      </div>

      {/* Global Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-2 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-[var(--muted)]">
            <span className="text-xs font-bold uppercase tracking-wider font-montserrat">
              Active Tenants
            </span>
            <Users className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-3xl font-black font-heading text-[var(--heading)]">
            {tenantsCount || 0}
          </div>
          <p className="text-[11px] text-[var(--muted)] font-merriweather">Registered organizations</p>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-2 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-[var(--muted)]">
            <span className="text-xs font-bold uppercase tracking-wider font-montserrat">
              Deployed Agents
            </span>
            <Bot className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black font-heading text-[var(--heading)]">
            {agentsCount || 0}
          </div>
          <p className="text-[11px] text-[var(--muted)] font-merriweather">Voice & AI agents live</p>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-2 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-[var(--muted)]">
            <span className="text-xs font-bold uppercase tracking-wider font-montserrat">
              Total Calls
            </span>
            <PhoneCall className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-3xl font-black font-heading text-[var(--heading)]">
            {totalCalls}{' '}
            <span className="text-xs text-[var(--muted)] font-normal font-mono">
              ({totalMinutes} min)
            </span>
          </div>
          <p className="text-[11px] text-[var(--muted)] font-merriweather">Total telephony traffic</p>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-2 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-[var(--muted)]">
            <span className="text-xs font-bold uppercase tracking-wider font-montserrat">
              Security State
            </span>
            <Shield className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black font-heading text-emerald-500">SECURE</div>
          <p className="text-[11px] text-[var(--muted)] font-merriweather">
            RLS & audit logging active
          </p>
        </div>
      </div>

      {/* Grid panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel A: Recent Signups */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[var(--heading)] uppercase tracking-wider flex items-center gap-2 font-playfair">
            <Building2 className="w-4 h-4 text-violet-500" /> Recent Tenant Signups
          </h3>
          <div className="divide-y divide-[var(--border)]">
            {!recentTenants || recentTenants.length === 0 ? (
              <p className="text-xs text-[var(--muted)] py-6 text-center font-merriweather">
                No organizations registered yet.
              </p>
            ) : (
              recentTenants.map((t) => (
                <Link
                  key={t.id}
                  href={`/admin/tenants/${t.id}`}
                  className="py-3 flex items-center justify-between hover:bg-[var(--hover-bg)] px-2.5 rounded-xl transition-colors group text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500 shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[var(--heading)] group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors font-playfair">
                        {t.name || t.full_name || 'Unnamed Tenant'}
                      </div>
                      <span className="text-[10px] text-[var(--muted)] font-mono">
                        {t.primary_email || 'No email'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--heading)] transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))
            )}
          </div>
          <div className="pt-2 text-right">
            <Link
              href="/admin/tenants"
              className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-bold uppercase tracking-wider font-playfair"
            >
              Manage all tenants &rarr;
            </Link>
          </div>
        </div>

        {/* Panel B: Open Support Tickets */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[var(--heading)] uppercase tracking-wider flex items-center gap-2 font-playfair">
            <LifeBuoy className="w-4 h-4 text-amber-500" /> Action Required: Open Tickets
          </h3>
          <div className="divide-y divide-[var(--border)]">
            {!openTickets || openTickets.length === 0 ? (
              <p className="text-xs text-[var(--muted)] py-6 text-center font-merriweather">
                No pending support tickets.
              </p>
            ) : (
              openTickets.map((t) => (
                <Link
                  key={t.id}
                  href="/admin/support"
                  className="py-3 flex items-center justify-between hover:bg-[var(--hover-bg)] px-2.5 rounded-xl transition-colors group text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] text-[var(--muted)]">
                        {t.ticket_number}
                      </span>
                      <span
                        className={`text-[8px] font-bold px-1.5 rounded uppercase ${
                          t.priority === 'urgent'
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : 'bg-[var(--hover-bg)] text-[var(--muted)] border border-[var(--border)]'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </div>
                    <div className="font-bold text-[var(--heading)] mt-1 group-hover:text-amber-500 transition-colors font-playfair">
                      {t.subject}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--heading)] transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))
            )}
          </div>
          <div className="pt-2 text-right">
            <Link
              href="/admin/support"
              className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-bold uppercase tracking-wider font-playfair"
            >
              Open Support Console &rarr;
            </Link>
          </div>
        </div>

        {/* Panel C: Live BetterStack Uptime & Sentry Observability Widgets */}
        <div className="lg:col-span-2">
          <ObservabilityWidgets />
        </div>
      </div>
    </div>
  )
}
