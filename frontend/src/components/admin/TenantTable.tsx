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
      <div className="flex flex-col items-center justify-center p-16 text-center bg-zinc-950/60 border border-zinc-800/80 rounded-2xl animate-in fade-in duration-300">
        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4 shadow-inner">
          <Building2 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-white mb-1">No organizations yet</h3>
        <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
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
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name, email, industry..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
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
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-900/40 text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                <th className="py-3.5 px-5">Organization / User</th>
                <th className="py-3.5 px-5">Industry</th>
                <th className="py-3.5 px-5">Plan</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Joined</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 text-xs">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    No tenants found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const displayName = tenant.name || tenant.full_name || 'Unnamed Organization'
                  const displayEmail = tenant.primary_email || tenant.email || 'No email'
                  const status = (tenant.status || 'active').toLowerCase()
                  const plan = (tenant.plan_tier || 'starter').toUpperCase()

                  return (
                    <tr
                      key={tenant.id}
                      onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                      className="hover:bg-violet-950/10 cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0 font-bold">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-violet-300 transition-colors">
                              {displayName}
                            </div>
                            <div className="text-[11px] text-zinc-500 font-mono">{displayEmail}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-5 text-zinc-400 capitalize">
                        {tenant.industry || 'General Business'}
                      </td>

                      <td className="py-4 px-5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-900 border border-zinc-800 text-zinc-300">
                          {plan}
                        </span>
                      </td>

                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            status === 'active'
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                              : status === 'suspended'
                              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                              : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
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

                      <td className="py-4 px-5 text-zinc-500">
                        {tenant.created_at
                          ? new Date(tenant.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-violet-400 group-hover:translate-x-1 transition-all inline-block" />
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
