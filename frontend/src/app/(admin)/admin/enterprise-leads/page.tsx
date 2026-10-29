'use client'

import { useState, useMemo } from 'react'
import {
  Users,
  Search,
  Building2,
  Mail,
  Calendar,
  ExternalLink,
  MessageSquare,
  Phone,
  Server,
  Cloud,
  Layers,
  CheckCircle2,
  Clock,
  RefreshCw
} from 'lucide-react'
import useSWR from 'swr'
import { toast } from 'sonner'

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url)
    if (!res.ok) return { leads: [], totalCount: 0 }
    const text = await res.text()
    if (!text || !text.trim()) return { leads: [], totalCount: 0 }
    return JSON.parse(text)
  } catch {
    return { leads: [], totalCount: 0 }
  }
}

interface EnterpriseLead {
  id: string
  work_email: string
  company_name: string
  infrastructure_needs: string
  message: string | null
  deployment_type: string | null
  created_at: string
}

export default function AdminEnterpriseLeadsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/enterprise-leads', fetcher, {
    refreshInterval: 15000
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLead, setSelectedLead] = useState<EnterpriseLead | null>(null)
  const [filterDeployment, setFilterDeployment] = useState<'all' | 'cloud' | 'dedicated' | 'on_premise'>('all')

  const leads: EnterpriseLead[] = data?.leads || []

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        lead.company_name?.toLowerCase().includes(q) ||
        lead.work_email?.toLowerCase().includes(q) ||
        lead.infrastructure_needs?.toLowerCase().includes(q) ||
        lead.message?.toLowerCase().includes(q)

      const matchesDeployment =
        filterDeployment === 'all' ||
        lead.deployment_type?.toLowerCase() === filterDeployment

      return matchesSearch && matchesDeployment
    })
  }, [leads, searchQuery, filterDeployment])

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--heading)] font-display flex items-center gap-2">
            <Users className="w-6 h-6 text-[var(--heading)]" />
            Enterprise Inquiries & Leads
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            Review inbound enterprise plan inquiries, high-volume call infrastructure requests, and bespoke contracts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--heading)] transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)] block">Total Enterprise Leads</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-[var(--heading)]">{leads.length}</span>
            <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" /> Direct Inbound
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)] block">Dedicated / Custom Leads</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-[var(--heading)]">
              {leads.filter(l => l.deployment_type === 'dedicated' || l.deployment_type === 'on_premise').length}
            </span>
            <span className="text-[10px] text-[var(--muted)]">High Value</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)] block">Latest Inbound</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xs font-semibold text-[var(--heading)] truncate">
              {leads[0] ? `${leads[0].company_name} (${new Date(leads[0].created_at).toLocaleDateString('en-IN')})` : 'No leads yet'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--card-bg)] border border-[var(--border)] p-3 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search company, email, needs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['all', 'cloud', 'dedicated', 'on_premise'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setFilterDeployment(mode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition cursor-pointer ${
                filterDeployment === mode
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                  : 'bg-[var(--background)] hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)] border border-[var(--border)]'
              }`}
            >
              {mode === 'all' ? 'All Types' : mode.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading enterprise leads...</span>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Building2 className="w-8 h-8 text-[var(--muted)] mx-auto opacity-40" />
            <h3 className="text-sm font-bold text-[var(--heading)]">No Enterprise Inquiries Found</h3>
            <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
              {searchQuery ? 'No leads matched your search query.' : 'New enterprise inquiries from the portal pricing and contact forms will appear here in real-time.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] uppercase font-bold tracking-wider text-[var(--muted)] bg-[var(--background)]/50">
                  <th className="py-3 px-4 font-montserrat">Company</th>
                  <th className="py-3 px-4 font-montserrat">Work Email</th>
                  <th className="py-3 px-4 font-montserrat">Infrastructure Needs</th>
                  <th className="py-3 px-4 font-montserrat">Deployment</th>
                  <th className="py-3 px-4 font-montserrat">Received</th>
                  <th className="py-3 px-4 font-montserrat text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs text-[var(--heading)] divide-y divide-[var(--border)]">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[var(--hover-bg)]/40 transition-colors">
                    <td className="py-3.5 px-4 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-zinc-500/10 border border-[var(--border)] flex items-center justify-center text-[var(--heading)] shrink-0">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-[var(--heading)]">{lead.company_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <a
                        href={`mailto:${lead.work_email}`}
                        className="text-[var(--heading)] hover:underline inline-flex items-center gap-1"
                      >
                        <Mail className="w-3 h-3 text-[var(--muted)]" />
                        <span>{lead.work_email}</span>
                      </a>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-[var(--muted)]" title={lead.infrastructure_needs}>
                      {lead.infrastructure_needs || 'Bespoke AI Voice Limits'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20">
                        {lead.deployment_type || 'Cloud'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--muted)] whitespace-nowrap text-[11px]">
                      {new Date(lead.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="px-2.5 py-1 rounded-lg bg-[var(--hover-bg)] hover:bg-[var(--border)] text-xs text-[var(--heading)] font-semibold transition cursor-pointer"
                        >
                          View Details
                        </button>
                        <a
                          href={`mailto:${lead.work_email}?subject=Vaakriti%20Enterprise%20Inquiry%20-%20${encodeURIComponent(lead.company_name)}`}
                          className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Email</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-500/10 border border-[var(--border)] flex items-center justify-center text-[var(--heading)]">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--heading)] font-display">{selectedLead.company_name}</h3>
                  <span className="text-[10px] text-[var(--muted)]">Inquiry ID: {selectedLead.id.slice(0, 8)}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="w-7 h-7 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">Contact Email</span>
                <a
                  href={`mailto:${selectedLead.work_email}`}
                  className="font-mono text-sm text-[var(--heading)] hover:underline flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span>{selectedLead.work_email}</span>
                </a>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">Infrastructure Needs</span>
                <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--heading)] whitespace-pre-wrap leading-relaxed">
                  {selectedLead.infrastructure_needs || 'Custom enterprise architecture & bespoke SLA requirements.'}
                </div>
              </div>

              {selectedLead.message && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">Message & Context</span>
                  <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--heading)] whitespace-pre-wrap leading-relaxed">
                    {selectedLead.message}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-0.5">Deployment Type</span>
                  <span className="capitalize font-semibold text-[var(--heading)]">{selectedLead.deployment_type || 'Cloud'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-0.5">Submitted On</span>
                  <span className="font-semibold text-[var(--heading)]">
                    {new Date(selectedLead.created_at).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 bg-[var(--background)] hover:bg-[var(--hover-bg)] text-[var(--heading)] text-xs font-semibold rounded-xl border border-[var(--border)] transition cursor-pointer"
              >
                Close
              </button>
              <a
                href={`mailto:${selectedLead.work_email}?subject=Vaakriti%20Enterprise%20Plan%20Discussion&body=Hello%20${encodeURIComponent(selectedLead.company_name)}%20Team,%0A%0AThank%20you%20for%20reaching%20out%20regarding%20Vaakriti%20Enterprise.`}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <span>Initiate Contact</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
