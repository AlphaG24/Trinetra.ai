'use client'

import { useEffect, useState, useCallback } from 'react'
import { AuditLogViewer, type AuditLog } from '@/components/admin/AuditLogViewer'
import { ScrollText } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [actionFilter, setActionFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '50')
      if (actionFilter && actionFilter !== 'all') params.set('action', actionFilter)
      if (searchQuery.trim()) params.set('search', searchQuery.trim())
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch audit logs')

      const data = await res.json()
      setLogs(data.logs || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (err: any) {
      toast.error(err.message || 'Error loading audit logs')
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, searchQuery, fromDate, toDate])

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-display flex items-center gap-3">
          <ScrollText className="w-8 h-8 text-violet-400" />
          Security Audit Logs
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Complete compliance trail of security events, administrative access attempts, and configuration changes.
        </p>
      </div>

      <AuditLogViewer
        logs={logs}
        total={total}
        page={page}
        totalPages={totalPages}
        onPageChange={(newPage: number) => setPage(newPage)}
        actionFilter={actionFilter}
        setActionFilter={(act: string) => {
          setActionFilter(act)
          setPage(1)
        }}
        searchQuery={searchQuery}
        setSearchQuery={(q: string) => {
          setSearchQuery(q)
          setPage(1)
        }}
        fromDate={fromDate}
        setFromDate={(d: string) => {
          setFromDate(d)
          setPage(1)
        }}
        toDate={toDate}
        setToDate={(d: string) => {
          setToDate(d)
          setPage(1)
        }}
        loading={loading}
      />
    </div>
  )
}
