'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, Sliders, Globe, Clock, Save, Loader2, KeyRound, Lock, UserCheck, ShieldAlert, PhoneCall } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SecuritySettingsPage() {
  const [rateLimitRpm, setRateLimitRpm] = useState<number>(60)
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
      toast.success('Security settings saved successfully')
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--heading)] font-display">
            Access Control & Security
          </h1>
          <p className="text-[var(--body)] text-sm mt-1">
            System rate limits, authentication timeouts, session governance, and statutory role policies.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Security Settings
        </button>
      </div>

      {/* Access Control Standards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 text-xs font-bold uppercase tracking-wider">
            <UserCheck className="w-4 h-4" /> Three Canonical Roles
          </div>
          <p className="text-[var(--heading)] text-sm font-semibold">Customer • Developer/Tester • Admin</p>
          <p className="text-[var(--body)] text-[11px] leading-relaxed">
            All exemptions evaluated via central policy. Test accounts are excluded from platform business metrics.
          </p>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <KeyRound className="w-4 h-4" /> Multi-Factor Auth (MFA)
          </div>
          <p className="text-[var(--heading)] text-sm font-semibold">Mandatory for Admin & Dev</p>
          <p className="text-[var(--body)] text-[11px] leading-relaxed">
            Enforced for admin and developer accounts; optional self-service setup for customers.
          </p>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 text-xs font-bold uppercase tracking-wider">
            <Lock className="w-4 h-4" /> Session Governance
          </div>
          <p className="text-[var(--heading)] text-sm font-semibold">30 Min (Admin) • 7 Days (Users)</p>
          <p className="text-[var(--body)] text-[11px] leading-relaxed">
            Admin sessions time out after 30 minutes of inactivity; privileged actions require step-up re-auth.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Rate Limiting */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--heading)]">API Rate Limiting (Requests / minute)</h3>
              <p className="text-xs text-[var(--muted)]">
                Default limit: 60 requests per minute per user/IP. Triggers HTTP 429 when exceeded.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              type="number"
              value={rateLimitRpm}
              onChange={(e) => setRateLimitRpm(Number(e.target.value))}
              className="w-full sm:w-64 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs font-mono text-[var(--heading)] focus:outline-none focus:border-violet-500"
            />
            <span className="text-xs text-[var(--muted)] font-mono">requests / min</span>
          </div>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--heading)]">Login Rate Limit</p>
                <p className="text-[var(--muted)] text-[11px]">5 attempts per 10 minutes per IP/User to prevent credential stuffing.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] flex items-start gap-2.5">
              <PhoneCall className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--heading)]">Telephony Rate Limit</p>
                <p className="text-[var(--muted)] text-[11px]">5 calls per minute per number (customizable per user for call centers).</p>
              </div>
            </div>
          </div>
        </div>

        {/* CORS Origins */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--heading)]">Allowed CORS Origins</h3>
              <p className="text-xs text-[var(--muted)]">Comma-separated list of trusted domain origins permitted to call FastAPI backend.</p>
            </div>
          </div>

          <div className="pt-2">
            <textarea
              rows={3}
              value={corsOrigins}
              onChange={(e) => setCorsOrigins(e.target.value)}
              className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl p-3 text-xs font-mono text-[var(--heading)] focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Session Timeout */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--heading)]">Global Session Maximum Lifetime (Hours)</h3>
              <p className="text-xs text-[var(--muted)]">
                Statutory maximum token lifetime. Note: Active admin sessions enforce strict 30-minute idle timeouts.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <input
              type="number"
              value={sessionTimeoutHours}
              onChange={(e) => setSessionTimeoutHours(Number(e.target.value))}
              className="w-full sm:w-64 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs font-mono text-[var(--heading)] focus:outline-none focus:border-violet-500"
            />
            <span className="text-xs text-[var(--muted)] font-mono">hours (users default: 168h / 7 days)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
