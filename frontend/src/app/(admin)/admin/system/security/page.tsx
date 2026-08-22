'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, Sliders, Globe, Clock, Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SecuritySettingsPage() {
  const [rateLimitRpm, setRateLimitRpm] = useState<number>(300)
  const [corsOrigins, setCorsOrigins] = useState<string>('trinetraedu-ai.com, app.trinetraedu-ai.com, admin.trinetraedu-ai.com')
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState<number>(24)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadSecuritySettings() {
      try {
        setLoading(true)
        const res = await fetch('/api/admin/system-config')
        if (res.status === 403) {
          toast.error('Super Admin access required for security settings')
          return
        }
        if (!res.ok) throw new Error('Failed to fetch security configurations')
        const data = await res.json()
        if (data.configs) {
          if (data.configs.RATE_LIMIT_RPM) setRateLimitRpm(Number(data.configs.RATE_LIMIT_RPM))
          if (data.configs.CORS_ORIGINS) setCorsOrigins(data.configs.CORS_ORIGINS)
          if (data.configs.SESSION_TIMEOUT_HOURS) setSessionTimeoutHours(Number(data.configs.SESSION_TIMEOUT_HOURS))
        }
      } catch (err: any) {
        toast.error(err.message || 'Error loading security settings')
      } finally {
        setLoading(false)
      }
    }

    loadSecuritySettings()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/admin/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: {
            RATE_LIMIT_RPM: String(rateLimitRpm),
            CORS_ORIGINS: corsOrigins,
            SESSION_TIMEOUT_HOURS: String(sessionTimeoutHours),
          },
        }),
      })

      if (!res.ok) throw new Error('Failed to update security settings')
      toast.success('Security settings saved successfully 🛡️')
    } catch (err: any) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        <p className="text-xs">Loading security policy settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
            Security Settings
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Configure system-wide rate limiting, CORS origin restrictions, and authentication session timeouts.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20 transition-all flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Security Settings
        </button>
      </div>

      <div className="space-y-6">
        {/* Rate Limiting */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Rate Limit (Requests per minute)</h3>
              <p className="text-xs text-zinc-500">Maximum allowed API requests per IP before 429 Too Many Requests triggers.</p>
            </div>
          </div>

          <div className="pt-2">
            <input
              type="number"
              value={rateLimitRpm}
              onChange={(e) => setRateLimitRpm(Number(e.target.value))}
              className="w-full sm:w-64 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* CORS Origins */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Allowed CORS Origins</h3>
              <p className="text-xs text-zinc-500">Comma-separated list of trusted domain origins permitted to call FastAPI backend.</p>
            </div>
          </div>

          <div className="pt-2">
            <textarea
              rows={3}
              value={corsOrigins}
              onChange={(e) => setCorsOrigins(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Session Timeout */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Session Timeout (Hours)</h3>
              <p className="text-xs text-zinc-500">Inactivity period after which admin sessions expire and force re-authentication.</p>
            </div>
          </div>

          <div className="pt-2">
            <input
              type="number"
              value={sessionTimeoutHours}
              onChange={(e) => setSessionTimeoutHours(Number(e.target.value))}
              className="w-full sm:w-64 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
