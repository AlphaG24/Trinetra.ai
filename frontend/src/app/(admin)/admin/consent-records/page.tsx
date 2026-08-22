'use client'

import { useState, useEffect } from 'react'
import { 
  ShieldCheck, 
  ArrowLeft, 
  Search, 
  Calendar, 
  Globe, 
  Info,
  Loader2,
  Lock,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface ConsentRecord {
  id: string
  user_id: string
  user_name: string
  user_email: string
  consent_type: string
  consent_version: string
  status: string
  purpose_text: string
  data_categories: string[]
  ip_address: string
  user_agent: string
  consent_token: string
  created_at: string
}

export default function AdminConsentRecordsPage() {
  const [records, setRecords] = useState<ConsentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterVersion, setFilterVersion] = useState('all')

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/consent')
      if (!res.ok) throw new Error('Failed to load consent audit logs')
      const data = await res.json()
      setRecords(data.records || [])
    } catch (err: any) {
      toast.error(err.message || 'Error fetching consent records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  // Export CSV function for DPDP compliance auditors
  const handleExportCSV = () => {
    const headers = ['Record ID', 'Granted At', 'User Name', 'User Email', 'IP Address', 'User Agent', 'Type', 'Version', 'Data Categories']
    const rows = filteredRecords.map(r => [
      r.id,
      r.created_at,
      r.user_name,
      r.user_email,
      r.ip_address,
      r.user_agent.replace(/,/g, ';'), // Escape commas in User Agent
      r.consent_type,
      r.consent_version,
      r.data_categories?.join('; ') || ''
    ])

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `dpdp_consent_records_audit.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Consent records exported successfully!')
  }

  const versions = useMemo(() => {
    const all = records.map(r => r.consent_version)
    return ['all', ...Array.from(new Set(all))]
  }, [records])

  const filteredRecords = records.filter(r => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = 
      r.user_name.toLowerCase().includes(query) ||
      r.user_email.toLowerCase().includes(query) ||
      r.ip_address.includes(query)
    
    const matchesVersion = filterVersion === 'all' || r.consent_version === filterVersion

    return matchesSearch && matchesVersion
  })

  // Hook helper to compute unique versions
  function useMemo<T>(factory: () => T, deps: any[]): T {
    return useState(factory)[0] // Simple local helper if react useMemo is not imported
  }

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in duration-300 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5 font-display">
            <ShieldCheck className="w-8 h-8 text-emerald-400" /> Consent Audit Center
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Official immutable consent ledger conforming to the Digital Personal Data Protection (DPDP) Act 2023.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export Ledger
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 hover:bg-zinc-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Info Warning */}
      <div className="bg-emerald-950/10 border border-emerald-500/10 rounded-2xl p-4 flex gap-2.5 text-xs text-emerald-400/90 leading-relaxed">
        <Lock className="w-5 h-5 shrink-0 mt-0.5" />
        <p>
          These records are append-only. Under DPDP regulations, this immutable logging ledger is kept permanently to demonstrate explicit user permission for processing personal identifier parameters.
        </p>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by user, email, or IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={filterVersion}
            onChange={(e) => setFilterVersion(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
          >
            <option value="all">All Versions</option>
            {versions.filter(v => v !== 'all').map(v => (
              <option key={v} value={v}>v{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-16 text-center text-zinc-500 text-xs">
          No consent audit records matching search criteria.
        </div>
      ) : (
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/40 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                  <th className="py-3.5 px-5">User</th>
                  <th className="py-3.5 px-5">Signature Token</th>
                  <th className="py-3.5 px-5">Consent Details</th>
                  <th className="py-3.5 px-5">Device Meta</th>
                  <th className="py-3.5 px-5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 text-xs text-zinc-300">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-bold text-white">{record.user_name}</div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">{record.user_email}</div>
                    </td>
                    
                    <td className="py-4 px-5">
                      <div className="text-[10px] font-mono text-zinc-500 bg-black/40 border border-white/5 px-2 py-1 rounded max-w-[120px] truncate">
                        {record.consent_token}
                      </div>
                    </td>

                    <td className="py-4 px-5 space-y-1.5 max-w-sm">
                      <div className="text-[11px] text-zinc-400 line-clamp-1 italic">
                        &ldquo;{record.purpose_text}&rdquo;
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {record.data_categories?.map(cat => (
                          <span key={cat} className="px-1.5 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                            {cat.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="font-mono text-zinc-400">{record.ip_address}</span>
                      </div>
                      <div className="text-[9px] text-zinc-600 line-clamp-1 max-w-[150px] mt-0.5" title={record.user_agent}>
                        {record.user_agent}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-zinc-500">
                      {new Date(record.created_at || record.id).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
