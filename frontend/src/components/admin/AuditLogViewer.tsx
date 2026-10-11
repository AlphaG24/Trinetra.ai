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
  ipFilter?: string
  setIpFilter?: (ip: string) => void
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
  ipFilter = '',
  setIpFilter,
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
      {/* Controls Bar with User, Action, Date, and IP filters (Task 5.4) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Search User / Action */}
        <div className="relative md:col-span-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search email, action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--foreground)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* IP Address Filter */}
        <div className="relative md:col-span-1">
          <input
            type="text"
            placeholder="Filter IP (e.g. 127.0.0.1)"
            value={ipFilter}
            onChange={(e) => setIpFilter && setIpFilter(e.target.value)}
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        {/* Action Type */}
        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Actions</option>
            <option value="admin.access_denied">Access Denied</option>
            <option value="admin.system_config_updated">Config Updated</option>
            <option value="admin.keys_rotated">Keys Rotated</option>
            <option value="admin.tenant_updated">Tenant Updated</option>
            <option value="admin.agent_paused">Agent Paused</option>
            <option value="admin.agent_resumed">Agent Resumed</option>
            <option value="admin.refund_processed">Refund Processed</option>
          </select>
        </div>

        {/* From Date */}
        <div className="relative">
          <Calendar className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-emerald-500 cursor-pointer"
          />
        </div>

        {/* To Date */}
        <div className="relative">
          <Calendar className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-emerald-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-zinc-100/50 dark:bg-zinc-900/40 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] font-playfair">
                <th className="py-3.5 px-5">Timestamp</th>
                <th className="py-3.5 px-5">User Email</th>
                <th className="py-3.5 px-5">Action</th>
                <th className="py-3.5 px-5">Resource</th>
                <th className="py-3.5 px-5">IP Address</th>
                <th className="py-3.5 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                    Loading security audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                    No audit log entries recorded matching filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedId === log.id

                  return (
                    <tr key={log.id} className="group hover:bg-zinc-100/60 dark:hover:bg-zinc-900/40 transition-colors">
                      <td colSpan={6} className="p-0">
                        <div
                          onClick={() => toggleRow(log.id)}
                          className="py-4 px-5 flex items-center justify-between cursor-pointer"
                        >
                          <div className="grid grid-cols-5 flex-1 items-center gap-4 text-xs">
                            <span className="font-mono text-[var(--text-muted)]">
                              {new Date(log.created_at).toLocaleString('en-IN')}
                            </span>
                            <span className="font-mono text-[var(--heading)] font-semibold truncate">
                              {log.user_email || log.user_id || 'System'}
                            </span>
                            <div>{getActionBadge(log.action)}</div>
                            <span className="text-[var(--text-muted)] capitalize">
                              {log.resource_type || 'system'}
                            </span>
                            <span className="font-mono text-[var(--text-muted)]">{log.ip_address || '127.0.0.1'}</span>
                          </div>

                          <div className="text-[var(--text-muted)] group-hover:text-[var(--heading)] pl-4">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>

                        {/* Expanded Details Pane */}
                        {isExpanded && (
                          <div className="px-5 pb-4 pt-1 bg-zinc-100/40 dark:bg-zinc-900/60 border-t border-[var(--border)] space-y-3 font-mono text-[11px] text-[var(--foreground)]">
                            <div>
                              <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">User Agent</span>
                              <span className="text-[var(--foreground)] break-all">{log.user_agent || 'N/A'}</span>
                            </div>

                            {log.old_values && (
                              <div>
                                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Old Values</span>
                                <pre className="bg-zinc-950/80 p-2 rounded-lg border border-[var(--border)] text-amber-300 overflow-x-auto">
                                  {JSON.stringify(log.old_values, null, 2)}
                                </pre>
                              </div>
                            )}

                            {log.new_values && (
                              <div>
                                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">New Values</span>
                                <pre className="bg-zinc-950/80 p-2 rounded-lg border border-[var(--border)] text-emerald-300 overflow-x-auto">
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
        <div className="py-3 px-5 border-t border-[var(--border)] bg-zinc-100/30 dark:bg-zinc-900/30 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div>
            Showing <span className="text-[var(--heading)] font-bold">{logs.length}</span> of{' '}
            <span className="text-[var(--heading)] font-bold">{total}</span> total entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-[var(--foreground)]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page <span className="text-[var(--heading)] font-bold">{page}</span> of {totalPages || 1}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-[var(--foreground)]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
