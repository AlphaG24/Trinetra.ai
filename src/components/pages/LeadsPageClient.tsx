'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Target, Search, Phone, Mail, ChevronRight } from 'lucide-react'

interface Lead {
  id: string
  full_name: string | null
  contact_name: string | null
  email: string | null
  contact_email: string | null
  phone: string | null
  contact_phone: string | null
  company_name: string | null
  company: string | null
  message: string | null
  status: string | null
  created_at: string
}

export function LeadsPageClient({ initialLeads }: { initialLeads: Lead[] }) {
  const router = useRouter()
  const [leads] = useState<Lead[]>(initialLeads)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Search filter matching name, email, or phone (checking both standard and fallback columns)
  const filtered = leads.filter(l => {
    const nameStr = (l.contact_name || l.full_name || '').toLowerCase()
    const emailStr = (l.contact_email || l.email || '').toLowerCase()
    const phoneStr = (l.contact_phone || l.phone || '').toLowerCase()
    const query = search.toLowerCase()

    const matchesSearch = search === '' || 
      nameStr.includes(query) || 
      emailStr.includes(query) || 
      phoneStr.includes(query)

    const matchesStatus = statusFilter === 'all' || (l.status || 'new').toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  // Format created_at to localized format (e.g. "May 27, 2026")
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Target className="w-8 h-8 text-amber-400 animate-pulse" /> Leads Captured
        </h1>
        <p className="text-gray-400 text-sm">High-intent prospects identified by your autonomous AI workforce.</p>
      </div>

      {leads.length > 0 && (
        /* Filters section */
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search leads by name, email, or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-amber-500/50 transition-colors shadow-lg"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer min-w-[140px] shadow-lg"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      )}

      {/* Main Content Area */}
      <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
        {leads.length === 0 ? (
          /* Onboarding Empty State */
          <div className="bg-[#0f1117]/85 border border-white/5 backdrop-blur-md rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 min-h-[400px] shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
            <div className="w-16 h-16 rounded-full bg-zinc-800/60 border border-white/5 flex items-center justify-center text-3xl mb-2">
              🎯
            </div>
            <h3 className="text-xl font-bold text-white tracking-wide">No leads captured yet</h3>
            <p className="text-zinc-400 text-sm max-w-md mt-1 mb-6 leading-relaxed">
              Your AI agents will automatically log qualified prospects here once they capture high-intent contact details during voice calls.
            </p>
            <button
              onClick={() => router.push('/dashboard/deploy')}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-lg shadow-amber-500/20 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-300 flex items-center gap-2 text-sm"
            >
              Configure Deployment <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : filtered.length === 0 ? (
          /* Search Empty State */
          <div className="flex flex-col items-center justify-center h-56 text-center">
            <Target className="w-10 h-10 text-white/20 mb-3" />
            <p className="text-white/50 font-medium">No leads match your search query</p>
            <p className="text-white/30 text-sm mt-1">Try using a different name, email, or telephone filter.</p>
          </div>
        ) : (
          /* High-Fidelity Prospects Table */
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-white/50 uppercase bg-white/[0.02] border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Prospect Info</th>
                  <th className="px-6 py-4 font-semibold">Intent / Call Summary</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Quick Connect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(lead => {
                  const name = lead.contact_name || lead.full_name || 'Extracted Lead'
                  const email = lead.contact_email || lead.email
                  const phone = lead.contact_phone || lead.phone
                  const status = (lead.status || 'new').toLowerCase()

                  return (
                    <tr key={lead.id} className="hover:bg-white/[0.01] transition-colors group">
                      {/* Column 1: Date */}
                      <td className="px-6 py-4 text-white/60 font-mono text-xs shrink-0 whitespace-nowrap">
                        {formatDate(lead.created_at)}
                      </td>

                      {/* Column 2: Prospect Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-white tracking-wide text-sm">{name}</span>
                          <span className="text-zinc-500 text-xs mt-0.5 font-mono">{email || phone || 'No contact fields'}</span>
                        </div>
                      </td>

                      {/* Column 3: Summary / Intent */}
                      <td className="px-6 py-4 max-w-sm">
                        <p className="text-white/70 line-clamp-2 text-xs leading-relaxed">
                          {lead.message || 'Captured cooperative intent details during automated voice call sandbox.'}
                        </p>
                      </td>

                      {/* Column 4: Status Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          status === 'qualified'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : status === 'contacted'
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : status === 'new'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border-white/10'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            status === 'qualified'
                              ? 'bg-green-500'
                              : status === 'contacted'
                              ? 'bg-yellow-500 animate-pulse'
                              : status === 'new'
                              ? 'bg-blue-500 animate-pulse'
                              : 'bg-zinc-400'
                          }`} />
                          {status}
                        </span>
                      </td>

                      {/* Column 5: Interactive Hover Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {phone && (
                            <a 
                              href={`tel:${phone}`} 
                              className="p-2 text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all"
                              title={`Dial ${phone}`}
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                          {email && (
                            <a 
                              href={`mailto:${email}`} 
                              className="p-2 text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all"
                              title={`Email ${email}`}
                            >
                              <Mail className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
