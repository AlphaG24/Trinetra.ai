'use client'

import { useState } from 'react'
import { 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert, 
  Key, 
  Sliders, 
  UserCheck, 
  Search, 
  Calendar, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react'

export interface AuditLog {
  id: string
  user_id?: string
  user_email?: string
  user_role?: string
  action: string
  resource_type?: string
  resource_id?: string
  old_values?: any
  new_values?: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

interface AuditLogViewerProps {
  logs: AuditLog[]
  total: number
  page: number
  totalPages: number
  onPageChange: (newPage: number) => void
  actionFilter: string
  setActionFilter: (action: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  fromDate: string
  setFromDate: (date: string) => void
  toDate: string
  setToDate: (date: string) => void
  loading?: boolean
}

export function AuditLogViewer({
  logs,
  total,
  page,
  totalPages,
  onPageChange,
  actionFilter,
  setActionFilter,
  searchQuery,
  setSearchQuery,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  loading = false,
}: AuditLogViewerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleRow = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const getActionBadge = (action: string) => {
    if (action.includes('access_denied') || action.includes('unauthorized')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <ShieldAlert className="w-3 h-3" />
          {action}
        </span>
      )
    }
    if (action.includes('keys_rotated')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-orange-500/10 border border-orange-500/20 text-orange-400">
          <Key className="w-3 h-3" />
          {action}
        </span>
      )
    }
    if (action.includes('updated')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <Sliders className="w-3 h-3" />
          {action}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-violet-500/10 border border-violet-500/20 text-violet-400">
        <UserCheck className="w-3 h-3" />
        {action}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative md:col-span-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
          <input
            type="text"
            placeholder="Search email, action, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Action Type */}
        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
          >
            <option value="all">All Actions</option>
            <option value="admin.access_denied">Access Denied</option>
            <option value="admin.system_config_updated">Config Updated</option>
            <option value="admin.keys_rotated">Keys Rotated</option>
            <option value="admin.tenant_updated">Tenant Updated</option>
          </select>
        </div>

        {/* From Date */}
        <div className="relative">
          <Calendar className="w-4 h-4 absolute left-3 top-3 text-zinc-500 pointer-events-none" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* To Date */}
        <div className="relative">
          <Calendar className="w-4 h-4 absolute left-3 top-3 text-zinc-500 pointer-events-none" />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-900/40 text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                <th className="py-3.5 px-5">Timestamp</th>
                <th className="py-3.5 px-5">User Email</th>
                <th className="py-3.5 px-5">Action</th>
                <th className="py-3.5 px-5">Resource</th>
                <th className="py-3.5 px-5">IP Address</th>
                <th className="py-3.5 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    Loading security audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    No audit log entries recorded matching filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedId === log.id

                  return (
                    <tr key={log.id} className="group hover:bg-zinc-900/30 transition-colors">
                      <td colSpan={6} className="p-0">
                        <div
                          onClick={() => toggleRow(log.id)}
                          className="py-4 px-5 flex items-center justify-between cursor-pointer"
                        >
                          <div className="grid grid-cols-5 flex-1 items-center gap-4 text-xs">
                            <span className="font-mono text-zinc-400">
                              {new Date(log.created_at).toLocaleString('en-IN')}
                            </span>
                            <span className="font-mono text-white truncate">
                              {log.user_email || log.user_id || 'System'}
                            </span>
                            <div>{getActionBadge(log.action)}</div>
                            <span className="text-zinc-400 capitalize">
                              {log.resource_type || 'system'}
                            </span>
                            <span className="font-mono text-zinc-500">{log.ip_address || '127.0.0.1'}</span>
                          </div>

                          <div className="text-zinc-500 group-hover:text-white pl-4">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>

                        {/* Expanded Details Pane */}
                        {isExpanded && (
                          <div className="px-5 pb-4 pt-1 bg-zinc-900/60 border-t border-zinc-800/50 space-y-3 font-mono text-[11px] text-zinc-300">
                            <div>
                              <span className="text-zinc-500 block text-[10px] uppercase font-bold">User Agent</span>
                              <span className="text-zinc-300 break-all">{log.user_agent || 'N/A'}</span>
                            </div>

                            {log.old_values && (
                              <div>
                                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Old Values</span>
                                <pre className="bg-black/50 p-2 rounded-lg border border-zinc-800 text-amber-300 overflow-x-auto">
                                  {JSON.stringify(log.old_values, null, 2)}
                                </pre>
                              </div>
                            )}

                            {log.new_values && (
                              <div>
                                <span className="text-zinc-500 block text-[10px] uppercase font-bold">New Values</span>
                                <pre className="bg-black/50 p-2 rounded-lg border border-zinc-800 text-emerald-300 overflow-x-auto">
                                  {JSON.stringify(log.new_values, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="py-3 px-5 border-t border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between text-xs text-zinc-400">
          <div>
            Showing <span className="text-white font-bold">{logs.length}</span> of{' '}
            <span className="text-white font-bold">{total}</span> total entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page <span className="text-white font-bold">{page}</span> of {totalPages || 1}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
