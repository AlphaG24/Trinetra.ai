'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  ArrowLeft, 
  Bot, 
  PhoneCall, 
  Clock, 
  Users, 
  ShieldAlert, 
  CheckCircle2, 
  FileText, 
  Save, 
  Loader2 
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<{
    tenant: any
    agents: any[]
    metrics: { totalCalls: number; totalMinutes: number; totalLeads: number }
  } | null>(null)

  const [adminNotes, setAdminNotes] = useState('')
  const [demoMinutesLimit, setDemoMinutesLimit] = useState<number>(20)
  const [status, setStatus] = useState<'active' | 'suspended' | 'trial'>('active')

  useEffect(() => {
    async function loadTenant() {
      try {
        setLoading(true)
        const res = await fetch(`/api/admin/tenants/${id}`)
        if (!res.ok) throw new Error('Failed to load tenant details')
        const json = await res.json()
        setData(json)
        setStatus(json.tenant?.status || 'active')
        setAdminNotes(json.tenant?.admin_notes || '')
        setDemoMinutesLimit(json.tenant?.demo_minutes_limit || 20)
      } catch (err: any) {
        toast.error(err.message || 'Error loading tenant')
      } finally {
        setLoading(false)
      }
    }

    if (id) loadTenant()
  }, [id])

  const handleSave = async (newStatus?: 'active' | 'suspended' | 'trial') => {
    try {
      setSaving(true)
      const targetStatus = newStatus || status

      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          admin_notes: adminNotes,
          demo_minutes_limit: Number(demoMinutesLimit),
        }),
      })

      if (!res.ok) throw new Error('Failed to update tenant')
      const json = await res.json()

      setStatus(targetStatus)
      toast.success('Tenant settings saved successfully 🚀')
    } catch (err: any) {
      toast.error('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        <p className="text-xs">Fetching organization profile...</p>
      </div>
    )
  }

  const tenant = data?.tenant
  const displayName = tenant?.name || tenant?.full_name || 'Organization'
  const displayEmail = tenant?.primary_email || tenant?.email || 'N/A'

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/tenants"
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
                {displayName}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  status === 'active'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : status === 'suspended'
                    ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-zinc-400 text-xs font-mono mt-1">{displayEmail} • ID: {id}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {status === 'active' ? (
            <button
              onClick={() => handleSave('suspended')}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-all"
            >
              Suspend Tenant
            </button>
          ) : (
            <button
              onClick={() => handleSave('active')}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
            >
              Activate Tenant
            </button>
          )}

          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20 transition-all flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Voice Calls</span>
            <PhoneCall className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold text-white">{data?.metrics.totalCalls || 0}</div>
          <p className="text-[11px] text-zinc-500">Total calls recorded</p>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Voice Minutes</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{data?.metrics.totalMinutes || 0} min</div>
          <p className="text-[11px] text-zinc-500">Platform audio usage</p>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Hot Leads</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{data?.metrics.totalLeads || 0}</div>
          <p className="text-[11px] text-zinc-500">Leads captured by agents</p>
        </div>
      </div>

      {/* Tenant Details & Admin Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Info & Agents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Org Info */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-violet-400" />
              Organization Information
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-500 block">Industry</span>
                <span className="font-semibold text-white capitalize">{tenant?.industry || 'General Business'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">GST Number</span>
                <span className="font-semibold text-white font-mono">{tenant?.gst_number || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Plan Tier</span>
                <span className="font-semibold text-white uppercase">{tenant?.plan_tier || 'Starter'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Created Date</span>
                <span className="font-semibold text-white">
                  {tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString('en-IN') : 'N/A'}
                </span>
              </div>
              {tenant?.business_description && (
                <div className="col-span-2 pt-2 border-t border-zinc-800/60">
                  <span className="text-zinc-500 block mb-1">Business Description</span>
                  <p className="text-white leading-relaxed">{tenant.business_description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Agents */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-400" />
              Deployed Voice & AI Agents ({data?.agents.length || 0})
            </h3>

            {(!data?.agents || data.agents.length === 0) ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No active agents deployed for this organization.</p>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {data.agents.map((agent: any) => (
                  <div key={agent.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{agent.name || agent.agent_name}</div>
                      <div className="text-zinc-500 font-mono text-[11px]">{agent.vapi_agent_id || 'Internal Agent'}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-zinc-900 border border-zinc-800 text-zinc-400">
                      {agent.agent_type || 'Voice'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Admin Overrides & Notes */}
        <div className="space-y-6">
          {/* Quota Override */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              Demo Quota Limit
            </h3>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Max Demo Minutes Allowance</label>
              <input
                type="number"
                value={demoMinutesLimit}
                onChange={(e) => setDemoMinutesLimit(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Admin Notes */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              Internal Admin Notes
            </h3>

            <textarea
              rows={5}
              placeholder="Add confidential notes about this tenant..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

      </div>
    </div>
  )
}
