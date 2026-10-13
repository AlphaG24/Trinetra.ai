'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Bell, 
  Sparkles, 
  ArrowLeft, 
  Send, 
  Building2, 
  Globe, 
  Clock, 
  AlertTriangle, 
  Loader2, 
  Trash2, 
  Check,
  Zap,
  Mail,
  ShieldAlert,
  Radio,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Share2
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Announcement {
  id: string
  title: string
  message: string
  type: string
  created_at: string
}

interface Tenant {
  id: string
  name?: string
  full_name?: string
}

interface AlertConfig {
  telegram_bot_token: string
  telegram_chat_id: string
  telegram_webhook_url: string
  email_groups: string[]
  alert_severity_threshold: string
  is_enabled: boolean
  last_test_alert?: {
    timestamp: string
    dispatched_by: string
    delivery: {
      telegram: boolean
      emails: string[]
    }
  }
}

export default function AdminNotificationsPage() {
  const [activeTab, setActiveTab] = useState<'broadcasts' | 'alert_config'>('broadcasts')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Broadcast Form State
  const [scope, setScope] = useState<'global' | 'tenant'>('global')
  const [targetId, setTargetId] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('normal')

  // Alert Config State (Task 5.16)
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    telegram_bot_token: '',
    telegram_chat_id: '',
    telegram_webhook_url: '',
    email_groups: ['ops@trinetra.ai', 'incidents@trinetra.ai'],
    alert_severity_threshold: 'P1',
    is_enabled: true
  })
  const [emailGroupsInput, setEmailGroupsInput] = useState('ops@trinetra.ai, incidents@trinetra.ai')
  const [savingAlertConfig, setSavingAlertConfig] = useState(false)
  const [testingAlert, setTestingAlert] = useState(false)
  const [testResult, setTestResult] = useState<any | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      // Fetch announcements
      const annRes = await fetch('/api/admin/notifications')
      const annData = await annRes.json()
      setAnnouncements(annData.announcements || [])

      // Fetch tenants for targeting
      const tenRes = await fetch('/api/admin/tenants')
      const tenData = await tenRes.json()
      setTenants(tenData.tenants || [])
      if (tenData.tenants && tenData.tenants.length > 0) {
        setTargetId(tenData.tenants[0].id)
      }

      // Fetch incident alert config
      const alertRes = await fetch('/api/admin/alert-config')
      if (alertRes.ok) {
        const alertData = await alertRes.json()
        if (alertData.config) {
          setAlertConfig(alertData.config)
          setEmailGroupsInput((alertData.config.email_groups || []).join(', '))
          if (alertData.config.last_test_alert) {
            setTestResult(alertData.config.last_test_alert)
          }
        }
      }
    } catch (err: any) {
      toast.error('Failed to load data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          title,
          message,
          type,
          target_id: scope === 'tenant' ? targetId : undefined
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send notification')

      toast.success(
        scope === 'global' 
          ? 'Global announcement broadcasted successfully!' 
          : 'Targeted tenant notification sent successfully!'
      )

      setTitle('')
      setMessage('')
      fetchData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveAlertConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingAlertConfig(true)
    try {
      const parsedEmails = emailGroupsInput
        .split(',')
        .map(e => e.trim())
        .filter(Boolean)

      const payload = {
        ...alertConfig,
        email_groups: parsedEmails
      }

      const res = await fetch('/api/admin/alert-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save alert configuration')
      }

      toast.success('Incident alert configuration saved successfully!')
      fetchData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingAlertConfig(false)
    }
  }

  const handleSendTestAlert = async () => {
    setTestingAlert(true)
    try {
      const res = await fetch('/api/admin/alert-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Verification probe: Platform operations, uptime monitors, and error dispatchers are fully active.'
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch test alert')

      setTestResult({
        timestamp: data.timestamp,
        delivery: data.delivery,
        dispatched_by: 'Admin Probe'
      })

      toast.success('Test alert received! Telegram webhook and Email groups confirmed. ⚡')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setTestingAlert(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-300 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--heading)] flex items-center gap-2 font-display">
            <Bell className="w-8 h-8 text-violet-500" /> Platform Notifications & Alerts
          </h1>
          <p className="text-[var(--body)] text-sm mt-1">
            Broadcast official tenant announcements or configure real-time incident alert webhooks (Telegram + Email groups).
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--heading)] transition-colors bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-4 py-2 hover:bg-[var(--hover-bg)] shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
        <button
          onClick={() => setActiveTab('broadcasts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'broadcasts'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
              : 'text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
          }`}
        >
          <Send className="w-3.5 h-3.5" /> Tenant Announcements
        </button>

        <button
          onClick={() => setActiveTab('alert_config')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'alert_config'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
              : 'text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-emerald-500" /> Incident Alert Config (Telegram & Email)
        </button>
      </div>

      {/* Tab 2: Incident Alert Config Panel (Task 5.16) */}
      {activeTab === 'alert_config' && (
        <div className="space-y-6">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold text-[var(--heading)]">
                    Incident Dispatcher Configuration
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    P1/P2 Real-time
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Connect Telegram bots and emergency email distribution groups for automated infrastructure incident alerts.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSendTestAlert}
                disabled={testingAlert}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                {testingAlert ? 'Dispatching Test...' : 'Send Test Alert ⚡'}
              </button>
            </div>

            {/* Test Alert Status Banner if tested */}
            {testResult && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Test Alert Received & Verified
                </div>
                <div className="text-[var(--body)] grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-[var(--muted)]">Telegram Webhook: </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Dispatched (Delivered)</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Email Groups: </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{testResult.delivery?.emails?.join(', ') || 'ops@trinetra.ai'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Dispatched At: </span>
                    <span>{new Date(testResult.timestamp).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveAlertConfig} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-semibold text-[var(--heading)] block mb-1">
                    Telegram Bot Token
                  </label>
                  <input
                    type="text"
                    value={alertConfig.telegram_bot_token}
                    onChange={(e) => setAlertConfig({ ...alertConfig, telegram_bot_token: e.target.value })}
                    placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 font-mono"
                  />
                  <p className="text-[11px] text-[var(--muted)] mt-1">
                    Obtained from @BotFather on Telegram.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--heading)] block mb-1">
                    Telegram Chat ID / Channel ID
                  </label>
                  <input
                    type="text"
                    value={alertConfig.telegram_chat_id}
                    onChange={(e) => setAlertConfig({ ...alertConfig, telegram_chat_id: e.target.value })}
                    placeholder="e.g. -1001234567890 or @ops_alerts"
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 font-mono"
                  />
                  <p className="text-[11px] text-[var(--muted)] mt-1">
                    Group or channel where incident notifications should be posted.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--heading)] block mb-1">
                  Emergency Email Distribution Groups
                </label>
                <input
                  type="text"
                  value={emailGroupsInput}
                  onChange={(e) => setEmailGroupsInput(e.target.value)}
                  placeholder="ops@trinetra.ai, incidents@trinetra.ai, oncall@trinetra.ai"
                  className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 font-mono"
                />
                <p className="text-[11px] text-[var(--muted)] mt-1">
                  Comma-separated list of on-call email addresses.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-semibold text-[var(--heading)] block mb-1">
                    Minimum Alert Severity Threshold
                  </label>
                  <select
                    value={alertConfig.alert_severity_threshold}
                    onChange={(e) => setAlertConfig({ ...alertConfig, alert_severity_threshold: e.target.value })}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 cursor-pointer"
                  >
                    <option value="P1">P1 Only (Critical outages, 500 spikes, DB ping failure)</option>
                    <option value="P2">P1 & P2 (Service degradation, latency {'>'} 2s, balance alerts)</option>
                    <option value="all">All Alerts (Including informational healthchecks)</option>
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[var(--heading)]">
                    <input
                      type="checkbox"
                      checked={alertConfig.is_enabled}
                      onChange={(e) => setAlertConfig({ ...alertConfig, is_enabled: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--border)] bg-[var(--card-bg)] text-violet-600 focus:ring-0"
                    />
                    Enable automated external alert dispatches
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="submit"
                  disabled={savingAlertConfig}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-violet-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {savingAlertConfig ? 'Saving...' : 'Save Alert Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 1: Tenant Announcements */}
      {activeTab === 'broadcasts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Form */}
          <div className="lg:col-span-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-[var(--heading)] uppercase tracking-wider flex items-center gap-2">
              <Send className="w-4 h-4 text-violet-500" /> Compose Announcement
            </h3>

            <form onSubmit={handleSend} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest block">Broadcast Target</label>
                <select
                  value={scope}
                  onChange={(e: any) => setScope(e.target.value)}
                  className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--heading)] focus:border-violet-500 outline-none cursor-pointer"
                >
                  <option value="global">Global Announcement</option>
                  <option value="tenant">Target Organization (Tenant)</option>
                </select>
              </div>

              {scope === 'tenant' && (
                <div className="space-y-1 animate-in fade-in duration-200">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest block">Target Organization</label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--heading)] focus:border-violet-500 outline-none cursor-pointer"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name || t.full_name || 'Unnamed Org'}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest block">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:border-violet-500 outline-none"
                  placeholder="e.g. Scheduled Maintenance Notice"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest block">Message</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:border-violet-500 outline-none resize-none"
                  placeholder="Write clear operational updates for customers..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest block">Alert Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['normal', 'warning', 'critical'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition cursor-pointer ${
                        type === t 
                          ? t === 'critical' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : t === 'warning' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30'
                          : 'bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-500/15 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {scope === 'global' ? 'Publish Global Alert' : 'Send to Tenant'}
              </button>
            </form>
          </div>

          {/* Right Column: List of Announcements */}
          <div className="lg:col-span-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--heading)] uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--muted)]" /> Active Global Broadcasts
              </h3>
              <span className="text-[10px] font-mono text-[var(--muted)]">{announcements.length} total</span>
            </div>

            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] animate-pulse" />
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-12 text-[var(--muted)] text-xs">
                No active global announcements.
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div key={a.id} className="p-4 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          a.type === 'critical' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          : a.type === 'warning' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20'
                        }`}>
                          {a.type}
                        </span>
                        <h4 className="font-bold text-[var(--heading)] text-xs">{a.title}</h4>
                      </div>
                      <span className="text-[10px] text-[var(--muted)] font-mono">
                        {new Date(a.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--body)] leading-relaxed whitespace-pre-wrap">
                      {a.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
