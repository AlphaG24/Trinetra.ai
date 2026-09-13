'use client'

import { useState, useMemo } from 'react'
import {
  Check,
  CheckCheck,
  PhoneIncoming,
  PhoneOutgoing,
  Phone,
  MessageCircle,
  Calendar,
  Target,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
  Download,
  Filter,
  Activity,
  ArrowUpRight,
  User,
  Clock,
  ThumbsDown,
  ThumbsUp,
  Minus
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: string
  payload?: any
  created_at: string
  is_read: boolean
  action_url?: string | null
  action_text?: string | null
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  appointment_booked: {
    icon: Calendar,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    label: 'Appointment'
  },
  lead_captured: {
    icon: Target,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    label: 'Lead'
  },
  call_completed: {
    icon: Phone,
    color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
    label: 'Voice Call'
  },
  chat_session: {
    icon: MessageCircle,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    label: 'Chat Session'
  },
  usage_alert: {
    icon: AlertCircle,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    label: 'System Alert'
  },
}

function parseCallData(notif: NotificationItem) {
  const isCall =
    notif.type === 'call_completed' ||
    (typeof notif.title === 'string' && (notif.title.includes('Call') || notif.title.includes('📞'))) ||
    (typeof notif.message === 'string' && notif.message.includes('• Type:'))

  if (!isCall) return null

  const payload = notif.payload || {}
  const rawTitle = notif.title || ''
  const rawMsg = notif.message || ''

  // Direction
  let direction: 'inbound' | 'outbound' = 'inbound'
  if (
    rawTitle.toLowerCase().includes('outbound') ||
    rawMsg.toLowerCase().includes('outbound') ||
    payload.direction === 'outbound'
  ) {
    direction = 'outbound'
  }

  // Caller Contact Info
  let contact = payload.phone || ''
  const contactMatch = rawMsg.match(/•\s*Contact:\s*([^\n•|]+)/i)
  if (contactMatch) {
    contact = contactMatch[1].trim()
  }
  contact = contact
    .replace(/Caller\s*\(\s*\)/gi, '')
    .replace(/\(\s*\)/g, '')
    .trim()

  if (!contact && payload.contact_name && payload.contact_name !== 'Caller') {
    contact = payload.contact_name
  }

  // Duration
  let durationFormatted = ''
  let durSec: number | null = typeof payload.duration === 'number' ? payload.duration : null
  if (durSec === null) {
    const durMatch = rawMsg.match(/Duration:\s*(\d+)s/i)
    if (durMatch) {
      durSec = parseInt(durMatch[1], 10)
    }
  }
  if (typeof durSec === 'number' && !isNaN(durSec)) {
    if (durSec >= 60) {
      const mins = Math.floor(durSec / 60)
      const secs = durSec % 60
      durationFormatted = `${mins}m ${secs}s`
    } else {
      durationFormatted = `${durSec}s`
    }
  }

  // Sentiment
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
  const rawSent = (payload.sentiment || '').toLowerCase()
  const sentMatch = rawMsg.match(/Sentiment:\s*([A-Za-z]+)/i)
  const sentStr = rawSent || (sentMatch ? sentMatch[1].toLowerCase() : '')
  if (sentStr.includes('pos')) sentiment = 'positive'
  else if (sentStr.includes('neg')) sentiment = 'negative'
  else sentiment = 'neutral'

  // Summary
  let summary = payload.summary || ''
  if (!summary) {
    const sumMatch = rawMsg.match(/•\s*Summary:\s*([\s\S]*?)(?=\n•|\n🎯|\n⏰|$)/i)
    if (sumMatch) {
      summary = sumMatch[1].trim()
    }
  }

  // Lead & Callback
  let leadTag = ''
  const leadMatch = rawMsg.match(/🎯\s*Qualified Lead:\s*([^\n•]+)/i)
  if (leadMatch) leadTag = leadMatch[1].trim()

  let callbackTag = ''
  const cbMatch = rawMsg.match(/⏰\s*Callback Scheduled:\s*([^\n•]+)/i)
  if (cbMatch) callbackTag = cbMatch[1].trim()

  // Clean Title
  let cleanTitle = direction === 'outbound' ? 'Outbound Call' : 'Inbound Call'
  if (contact && contact !== 'Unknown' && contact !== 'Caller') {
    cleanTitle = `${direction === 'outbound' ? 'Outbound Call' : 'Inbound Call'} • ${contact}`
  }

  return {
    direction,
    contact: contact && contact !== 'Unknown' && contact !== 'Caller' ? contact : null,
    cleanTitle,
    durationFormatted,
    durationSeconds: durSec,
    sentiment,
    summary,
    leadTag,
    callbackTag,
    callId: payload.call_id
  }
}

export function NotificationsPageClient({
  initialNotifications,
  userId: _userId
}: {
  initialNotifications: NotificationItem[]
  userId: string
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications)
  const [filter, setFilter] = useState<'all' | 'unread' | 'inbound' | 'outbound' | 'leads'>('all')
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)

  // Compute stats across all notifications
  const stats = useMemo(() => {
    let unread = 0
    let calls = 0
    let leads = 0
    let negative = 0

    notifications.forEach((n) => {
      if (!n.is_read) unread++
      const call = parseCallData(n)
      if (call) {
        calls++
        if (call.sentiment === 'negative') negative++
        if (call.leadTag) leads++
      } else if (n.type === 'lead_captured' || n.type === 'appointment_booked') {
        leads++
      }
    })

    return {
      total: notifications.length,
      unread,
      calls,
      leads,
      negative
    }
  }, [notifications])

  // Filtered list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const call = parseCallData(n)

      // Category filter
      if (filter === 'unread' && n.is_read) return false
      if (filter === 'inbound' && (!call || call.direction !== 'inbound')) return false
      if (filter === 'outbound' && (!call || call.direction !== 'outbound')) return false
      if (filter === 'leads' && !call?.leadTag && n.type !== 'lead_captured' && n.type !== 'appointment_booked') return false

      // Sentiment filter
      if (sentimentFilter !== 'all') {
        if (!call || call.sentiment !== sentimentFilter) return false
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = (n.title || '').toLowerCase().includes(q)
        const matchMsg = (n.message || '').toLowerCase().includes(q)
        const matchContact = (call?.contact || '').toLowerCase().includes(q)
        const matchSummary = (call?.summary || '').toLowerCase().includes(q)
        if (!matchTitle && !matchMsg && !matchContact && !matchSummary) return false
      }

      return true
    })
  }, [notifications, filter, sentimentFilter, searchQuery])

  const markAllRead = async () => {
    if (markingAll || stats.unread === 0) return
    setMarkingAll(true)
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!res.ok) throw new Error(`Status ${res.status}`)

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      toast.success('All notifications marked as read')
    } catch (err) {
      console.error('Error marking all read:', err)
      toast.error('Failed to update. Try again.')
    } finally {
      setMarkingAll(false)
    }
  }

  const markOneRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (markingId) return
    setMarkingId(id)
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      if (!res.ok) throw new Error(`Status ${res.status}`)

      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    } catch (err) {
      console.error('Error marking read:', err)
      toast.error('Failed to update')
    } finally {
      setMarkingId(null)
    }
  }

  const exportCSV = () => {
    if (notifications.length === 0) return
    const headers = ['Date', 'Type', 'Title', 'Message', 'Status']
    const rows = notifications.map((n) => [
      new Date(n.created_at).toLocaleString(),
      n.type,
      `"${(n.title || '').replace(/"/g, '""')}"`,
      `"${(n.message || '').replace(/"/g, '""')}"`,
      n.is_read ? 'Read' : 'Unread'
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trinetra_activity_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. TOP HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white font-display">
            Notification Center
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Real-time feed of AI customer calls, qualified leads, and system activities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {stats.unread > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all cursor-pointer shadow-xs shadow-violet-500/20 disabled:opacity-50"
            >
              {markingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. STATS OVERVIEW STRIP (Full Width KPI Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#120E22] border border-zinc-200 dark:border-white/5 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <span>Total Events</span>
            <Activity className="w-4 h-4 text-violet-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            {stats.total}
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">Logged across all agents</p>
        </div>

        <div className="bg-white dark:bg-[#120E22] border border-zinc-200 dark:border-white/5 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <span>Unread Alerts</span>
            <span
              className={`w-2 h-2 rounded-full ${stats.unread > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            {stats.unread}
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
            {stats.unread > 0 ? 'Requires attention' : 'All caught up'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#120E22] border border-zinc-200 dark:border-white/5 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <span>Voice Calls</span>
            <Phone className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            {stats.calls}
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">Processed by AI agents</p>
        </div>

        <div className="bg-white dark:bg-[#120E22] border border-zinc-200 dark:border-white/5 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <span>Qualified Leads</span>
            <Target className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            {stats.leads}
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">Ready for follow-up</p>
        </div>
      </div>

      {/* 3. TOOLBAR: SEARCH & MULTI-FILTERS */}
      <div className="bg-white dark:bg-[#120E22] border border-zinc-200 dark:border-white/5 rounded-2xl p-3 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Search Box */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by caller, phone, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-xs bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/5 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-violet-500 dark:focus:border-violet-500 transition-colors"
          />
        </div>

        {/* Right: Quick Tabs & Sentiment Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-white/[0.04] rounded-xl border border-zinc-200/60 dark:border-white/5 text-xs font-medium">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filter === 'unread'
                  ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Unread {stats.unread > 0 && `(${stats.unread})`}
            </button>
            <button
              onClick={() => setFilter('inbound')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filter === 'inbound'
                  ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Inbound
            </button>
            <button
              onClick={() => setFilter('outbound')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filter === 'outbound'
                  ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Outbound
            </button>
            <button
              onClick={() => setFilter('leads')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filter === 'leads'
                  ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Leads
            </button>
          </div>

          {/* Sentiment Dropdown */}
          <div className="relative">
            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-2 text-xs font-medium bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/5 rounded-xl text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-violet-500 cursor-pointer"
            >
              <option value="all">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 4. ACTIVITY LIST (Full Width Modern Feed) */}
      <div className="bg-white dark:bg-[#120E22] border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-xs">
        {filteredNotifications.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3 text-zinc-400">
              <Activity className="w-6 h-6 opacity-60" />
            </div>
            <p className="text-zinc-900 dark:text-white font-semibold text-sm">No activity found</p>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No notifications matched "${searchQuery}". Try a different keyword.`
                : 'Your AI voice calls and CRM alerts will automatically appear here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200/80 dark:divide-white/5">
            {filteredNotifications.map((notif) => {
              const call = parseCallData(notif)
              const meta = TYPE_CONFIG[notif.type] || TYPE_CONFIG['call_completed']
              const isExpanded = expandedId === notif.id
              const isMarkingThis = markingId === notif.id

              return (
                <div
                  key={notif.id}
                  onClick={() => setExpandedId(isExpanded ? null : notif.id)}
                  className={`p-5 md:p-6 transition-colors cursor-pointer group ${
                    !notif.is_read
                      ? 'bg-violet-500/[0.03] dark:bg-violet-500/[0.05]'
                      : 'hover:bg-zinc-50/80 dark:hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Status Indicator & Icon */}
                    <div className="shrink-0 flex items-center gap-2 pt-0.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 transition-opacity ${
                          !notif.is_read ? 'bg-violet-600' : 'bg-transparent group-hover:bg-zinc-300 dark:group-hover:bg-zinc-700'
                        }`}
                      />
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                          call
                            ? call.direction === 'outbound'
                              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                              : 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20'
                            : meta.color
                        }`}
                      >
                        {call ? (
                          call.direction === 'outbound' ? (
                            <PhoneOutgoing className="w-4 h-4" />
                          ) : (
                            <PhoneIncoming className="w-4 h-4" />
                          )
                        ) : (
                          <meta.icon className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {/* Core Notification Content */}
                    <div className="flex-1 min-w-0">
                      {/* Top Bar: Title & Status Chips */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`text-sm tracking-tight ${
                              notif.is_read
                                ? 'font-medium text-zinc-800 dark:text-zinc-200'
                                : 'font-semibold text-zinc-950 dark:text-white'
                            }`}
                          >
                            {call ? call.cleanTitle : notif.title || meta.label}
                          </h3>

                          {/* Call metadata chips */}
                          {call && (
                            <div className="flex items-center gap-1.5 ml-1">
                              {/* Duration */}
                              {call.durationFormatted && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-white/5">
                                  <Clock className="w-3 h-3 text-zinc-400" />
                                  {call.durationFormatted}
                                </span>
                              )}

                              {/* Sentiment Pill */}
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                  call.sentiment === 'positive'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : call.sentiment === 'negative'
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                    : 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border-zinc-200/60 dark:border-white/5'
                                }`}
                              >
                                {call.sentiment === 'positive' && <ThumbsUp className="w-3 h-3" />}
                                {call.sentiment === 'negative' && <ThumbsDown className="w-3 h-3" />}
                                {call.sentiment === 'neutral' && <Minus className="w-3 h-3" />}
                                <span className="capitalize">{call.sentiment}</span>
                              </span>

                              {/* Lead Flag */}
                              {call.leadTag && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  <Target className="w-3 h-3" />
                                  Lead: {call.leadTag}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Timestamp & Actions */}
                        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto text-xs text-zinc-400 dark:text-zinc-500">
                          <span>{timeAgo(notif.created_at)}</span>

                          {!notif.is_read && (
                            <button
                              onClick={(e) => markOneRead(notif.id, e)}
                              disabled={isMarkingThis}
                              className="p-1 hover:text-violet-600 dark:hover:text-violet-400 rounded transition-colors"
                              title="Mark as read"
                            >
                              {isMarkingThis ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          <button
                            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 transition-colors"
                            aria-label="Toggle details"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Summary Section (High Differentiation Typography) */}
                      {call ? (
                        <div className="mt-2.5">
                          {call.summary && (
                            <div className="border-l-2 border-violet-500/30 pl-3.5 py-0.5 my-1.5">
                              <p className="text-xs md:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
                                {call.summary}
                              </p>
                            </div>
                          )}

                          {/* Quick Bottom Action Row */}
                          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
                            <Link
                              href="/dashboard/analytics"
                              onClick={(e) => e.stopPropagation()}
                              className="font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 inline-flex items-center gap-1 transition-colors"
                            >
                              <span>View analytics</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>

                            {call.leadTag && (
                              <Link
                                href="/dashboard/leads"
                                onClick={(e) => e.stopPropagation()}
                                className="font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 inline-flex items-center gap-1 transition-colors"
                              >
                                <span>View lead in CRM</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}

                            {call.contact && (
                              <span className="text-zinc-400 dark:text-zinc-500 inline-flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>{call.contact}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-xs md:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
                          <p>{notif.message || '—'}</p>
                          {notif.action_url && (
                            <div className="mt-2">
                              <Link
                                href={notif.action_url}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1"
                              >
                                <span>{notif.action_text || 'View details'}</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 5. EXPANDABLE DETAILS PANEL (Rich Functionality) */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-zinc-200/80 dark:border-white/5 animate-in fade-in duration-200 text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="p-3 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/60 dark:border-white/5 rounded-xl">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                Exact Timestamp
                              </span>
                              <p className="mt-1 font-medium text-zinc-800 dark:text-zinc-200">
                                {new Date(notif.created_at).toLocaleString()}
                              </p>
                            </div>

                            <div className="p-3 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/60 dark:border-white/5 rounded-xl">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                Event Category
                              </span>
                              <p className="mt-1 font-medium text-zinc-800 dark:text-zinc-200 capitalize">
                                {call ? `${call.direction} voice call` : notif.type.replace(/_/g, ' ')}
                              </p>
                            </div>

                            <div className="p-3 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/60 dark:border-white/5 rounded-xl">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                Notification ID
                              </span>
                              <p className="mt-1 font-mono text-[11px] text-zinc-500 truncate">
                                {notif.id}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
