'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Building2, ChevronRight, ShieldAlert, CheckCircle2 } from 'lucide-react'

interface Tenant {
  id: string
  name?: string
  full_name?: string
  primary_email?: string
  email?: string
  industry?: string
  status?: string
  plan_tier?: string
  created_at?: string
  minutes_used?: number
  wallet_balance_paisa?: number
  kyc_status?: string
}

export function TenantTable({ tenants }: { tenants: Tenant[] }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')

  const filteredTenants = tenants.filter((tenant) => {
    const name = (tenant.name || tenant.full_name || '').toLowerCase()
    const email = (tenant.primary_email || tenant.email || '').toLowerCase()
    const industry = (tenant.industry || '').toLowerCase()
    const query = searchTerm.toLowerCase()

    const matchesSearch = name.includes(query) || email.includes(query) || industry.includes(query)
    const matchesStatus = statusFilter === 'all' || (tenant.status || 'active').toLowerCase() === statusFilter
    const matchesPlan = planFilter === 'all' || (tenant.plan_tier || 'starter').toLowerCase() === planFilter

    return matchesSearch && matchesStatus && matchesPlan
  })

  if (tenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl animate-in fade-in duration-300 shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500 mb-4 shadow-2xs">
          <Building2 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-[var(--heading)] mb-1 font-playfair">No organizations yet</h3>
        <p className="text-xs text-[var(--muted)] max-w-xs leading-relaxed font-merriweather">
          There are no tenant organizations or user profiles registered on the platform yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search by name, email, industry..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-violet-500 transition-colors font-merriweather shadow-2xs"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 font-playfair shadow-2xs"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="expired">Expired</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 font-playfair shadow-2xs"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-zinc-50 dark:bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] font-playfair">
                <th className="py-3.5 px-5">Organization / User</th>
                <th className="py-3.5 px-4">Plan</th>
                <th className="py-3.5 px-4">Minutes Used</th>
                <th className="py-3.5 px-4">Prepaid Wallet</th>
                <th className="py-3.5 px-4">KYC Status</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Joined</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-xs">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--muted)] font-merriweather">
                    No tenants found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const displayName = tenant.name || tenant.full_name || 'Unnamed Organization'
                  const displayEmail = tenant.primary_email || tenant.email || 'No email'
                  const status = (tenant.status || 'active').toLowerCase()
                  const plan = (tenant.plan_tier || 'starter').toUpperCase()
                  const kycStatus = tenant.kyc_status || 'unsubmitted'
                  const walletInr = ((tenant.wallet_balance_paisa || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

                  return (
                    <tr
                      key={tenant.id}
                      onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                      className="hover:bg-[var(--hover-bg)] cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500 shrink-0 font-bold">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-[var(--heading)] group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors font-playfair">
                              {displayName}
                            </div>
                            <div className="text-[11px] text-[var(--muted)] font-mono">{displayEmail}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 border border-[var(--border)] text-[var(--muted)] font-playfair">
                          {plan}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-mono font-semibold text-[var(--heading)]">
                        {tenant.minutes_used ?? 0}m
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{walletInr}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase font-mono ${
                          kycStatus === 'verified'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : kycStatus === 'pending_review'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : kycStatus === 'rejected'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-[var(--muted)]'
                        }`}>
                          {kycStatus}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono ${
                            status === 'active'
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : status === 'suspended'
                              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
                              : 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {status === 'active' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <ShieldAlert className="w-3 h-3" />
                          )}
                          {status}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-[var(--muted)] font-merriweather">
                        {tenant.created_at
                          ? new Date(tenant.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <ChevronRight className="w-4 h-4 text-[var(--muted)] group-hover:text-violet-500 group-hover:translate-x-1 transition-all inline-block" />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
