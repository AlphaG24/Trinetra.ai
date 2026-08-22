'use client'

import { useState, useEffect } from 'react'
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
  Check 
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

export default function AdminNotificationsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [scope, setScope] = useState<'global' | 'tenant'>('global')
  const [targetId, setTargetId] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('normal')

  const fetchData = async () => {
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
    } catch (err: any) {
      toast.error('Failed to load data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

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

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-300 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2 font-display">
            <Bell className="w-8 h-8 text-violet-500" /> Platform Notifications
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Broadcast official global announcements or send alerts targeted to specific tenant organizations.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 hover:bg-zinc-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-1 bg-[#0f111a]/60 border border-white/5 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Send className="w-4 h-4 text-violet-400" /> Compose Alert
          </h3>

          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Broadcast Target</label>
              <select
                value={scope}
                onChange={(e: any) => setScope(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-violet-500 outline-none cursor-pointer"
              >
                <option value="global">Global Announcement</option>
                <option value="tenant">Target Organization (Tenant)</option>
              </select>
            </div>

            {scope === 'tenant' && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Target Organization</label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-violet-500 outline-none cursor-pointer"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name || t.full_name || 'Unnamed Org'}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-violet-500 outline-none"
                placeholder="e.g. Schedule Maintenance Notice"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Message</label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-lg p-3 text-xs text-white focus:border-violet-500 outline-none"
                placeholder="Type announcements details here..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Severity / Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-violet-500 outline-none cursor-pointer"
              >
                <option value="normal">Normal Announcement</option>
                <option value="important">Important (High Priority)</option>
                <option value="warning">Warning / Outage Alert</option>
                <option value="success">Success / Feature Release</option>
                <option value="info">Info / Guide</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-violet-600/10 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Publish Announcement
            </button>
          </form>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0f111a]/60 border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" /> Broadcast History
            </h3>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                No global announcements sent yet.
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-4 bg-black/45 border border-white/5 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                          ann.type === 'important' || ann.type === 'warning' 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          {ann.type}
                        </span>
                        <h4 className="text-xs font-bold text-white">{ann.title}</h4>
                      </div>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(ann.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed font-light">{ann.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
