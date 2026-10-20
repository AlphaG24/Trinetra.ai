'use client'

import { useEffect, useState, use, useCallback } from 'react'
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
  Loader2,
  Coins,
  Target,
  DollarSign,
  Activity,
  Wallet,
  PlusCircle
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addingCredit, setAddingCredit] = useState(false)
  
  const [data, setData] = useState<{
    tenant: any
    wallet?: any
    transactions?: any[]
    agents: any[]
    metrics: { totalCalls: number; totalMinutes: number; totalLeads: number }
  } | null>(null)

  const [adminNotes, setAdminNotes] = useState('')
  const [demoMinutesLimit, setDemoMinutesLimit] = useState<number>(20)
  const [phoneNumbersQuota, setPhoneNumbersQuota] = useState<number>(5)
  const [savingPhoneQuota, setSavingPhoneQuota] = useState(false)
  const [status, setStatus] = useState<'active' | 'suspended' | 'trial'>('active')
  
  // Decision P5: Plans are exclusively chosen per customer (Not a both-ways toggle)
  const [billingModel, setBillingModel] = useState<'subscription' | 'credit_based' | 'outcome_based'>('subscription')
  
  // Decision P8: Spend limit ₹2,500 default; admin can override per customer
  const [spendLimitInr, setSpendLimitInr] = useState<number>(2500)

  // Direct Add / Adjust Credit & Debit & Refund State
  const [walletTab, setWalletTab] = useState<'credit' | 'debit' | 'refund'>('credit')
  const [creditAmount, setCreditAmount] = useState<string>('')
  const [creditReason, setCreditReason] = useState<string>('')
  const [debitAmount, setDebitAmount] = useState<string>('')
  const [debitReason, setDebitReason] = useState<string>('')
  const [debiting, setDebiting] = useState(false)
  const [refundAmount, setRefundAmount] = useState<string>('')
  const [refundReason, setRefundReason] = useState<string>('')
  const [refundMode, setRefundMode] = useState<'credit_back' | 'deduct_balance'>('credit_back')
  const [refunding, setRefunding] = useState(false)

  // Manual Voice Minutes Adjuster State
  const [adjustMinutesDelta, setAdjustMinutesDelta] = useState<string>('')
  const [adjustingMinutes, setAdjustingMinutes] = useState(false)

  // Agent Pause/Resume Toggle State
  const [togglingAgentId, setTogglingAgentId] = useState<string | null>(null)

  const loadTenant = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true)
      const res = await fetch(`/api/admin/tenants/${id}`)
      if (!res.ok) throw new Error('Failed to load tenant details')
      const json = await res.json()
      setData(json)
      setStatus(json.tenant?.status || 'active')
      setAdminNotes(json.tenant?.admin_notes || '')
      setDemoMinutesLimit(json.tenant?.demo_minutes_limit ?? 20)
      setPhoneNumbersQuota(json.tenant?.phone_numbers_quota ?? (5 + (json.tenant?.additional_phone_numbers ?? 0)))
      setBillingModel(json.tenant?.billing_model || 'subscription')
      if (json.wallet?.spend_limit_paisa !== undefined) {
        setSpendLimitInr(json.wallet.spend_limit_paisa / 100)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading tenant')
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) loadTenant(true)
  }, [id, loadTenant])

  // Dedicated "Add Credit" Action Handler
  const handleAddCredit = async () => {
    const amt = Number(creditAmount)
    if (!amt || isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid credit amount (greater than ₹0)')
      return
    }

    try {
      setAddingCredit(true)
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          add_credit_paisa: Math.round(amt * 100),
          credit_reason: creditReason.trim() || `Admin manual credit top-up of ₹${amt.toLocaleString('en-IN')}`,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to add credit')
      }
      const json = await res.json()

      toast.success(`Successfully credited ₹${amt.toLocaleString('en-IN')} to customer wallet! 🚀`)
      setCreditAmount('')
      setCreditReason('')
      if (json.wallet) {
        setData(prev => prev ? { ...prev, wallet: json.wallet } : prev)
      }
      await loadTenant(false)
    } catch (err: any) {
      toast.error('Credit addition failed: ' + err.message)
    } finally {
      setAddingCredit(false)
    }
  }

  // Task 5.10: Dedicated "Debit Wallet" Action Handler
  const handleDebitWallet = async () => {
    const amt = Number(debitAmount)
    if (!amt || isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid debit amount (greater than ₹0)')
      return
    }

    try {
      setDebiting(true)
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debit_credit_paisa: Math.round(amt * 100),
          debit_reason: debitReason.trim() || `Admin manual debit of ₹${amt.toLocaleString('en-IN')}`,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to debit wallet')
      }
      const json = await res.json()

      toast.success(`Successfully debited ₹${amt.toLocaleString('en-IN')} from wallet. Balance dropped! 📉`)
      setDebitAmount('')
      setDebitReason('')
      if (json.wallet) {
        setData(prev => prev ? { ...prev, wallet: json.wallet } : prev)
      }
      await loadTenant(false)
    } catch (err: any) {
      toast.error('Wallet debit failed: ' + err.message)
    } finally {
      setDebiting(false)
    }
  }

  // Task 5.14: Dedicated "Refund Processor" Action Handler
  const handleProcessRefund = async () => {
    const amt = Number(refundAmount)
    if (!amt || isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid refund amount (greater than ₹0)')
      return
    }

    try {
      setRefunding(true)
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          process_refund_paisa: Math.round(amt * 100),
          refund_reason: refundReason.trim() || `Customer refund approval for ₹${amt.toLocaleString('en-IN')}`,
          refund_mode: refundMode,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to process refund')
      }
      const json = await res.json()

      toast.success(`Refund of ₹${amt.toLocaleString('en-IN')} processed successfully! Customer notified & ledger updated.`)
      setRefundAmount('')
      setRefundReason('')
      if (json.wallet) {
        setData(prev => prev ? { ...prev, wallet: json.wallet } : prev)
      }
      await loadTenant(false)
    } catch (err: any) {
      toast.error('Refund processing failed: ' + err.message)
    } finally {
      setRefunding(false)
    }
  }

  // Task 5.9: Dedicated "+/- Voice Minutes Adjustment" Handler
  const handleAdjustMinutes = async () => {
    const delta = Number(adjustMinutesDelta)
    if (!delta || isNaN(delta) || delta === 0) {
      toast.error('Please enter a non-zero minutes delta (e.g. +100 or -50)')
      return
    }

    try {
      setAdjustingMinutes(true)
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjust_voice_minutes: delta,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to adjust voice minutes')
      }

      toast.success(`Adjusted voice minutes by ${delta > 0 ? `+${delta}` : delta} mins! Balance updated. ⏱️`)
      setAdjustMinutesDelta('')
      await loadTenant(false)
    } catch (err: any) {
      toast.error('Minutes adjustment failed: ' + err.message)
    } finally {
      setAdjustingMinutes(false)
    }
  }

  // Task 5.8: Dedicated "Pause / Resume Agent" Action Handler
  const handleToggleAgent = async (agentId: string, currentActive: boolean) => {
    try {
      setTogglingAgentId(agentId)
      const newActive = !currentActive
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          agent_is_active: newActive,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update agent status')
      }

      toast.success(newActive ? 'Agent resumed! Now accepting calls.' : 'Agent paused! Calls will now be rejected. ⏸️')
      await loadTenant(false)
    } catch (err: any) {
      toast.error('Agent toggle failed: ' + err.message)
    } finally {
      setTogglingAgentId(null)
    }
  }

  // General Settings Save Handler
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
          phone_numbers_limit: Number(phoneNumbersQuota),
          billing_model: billingModel, // P5
          spend_limit_paisa: Math.round(Number(spendLimitInr || 0) * 100), // P8
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Failed to update tenant')
      }
      const json = await res.json()

      setStatus(targetStatus)
      if (json.tenant?.billing_model) {
        setBillingModel(json.tenant.billing_model)
      }
      if (json.wallet?.spend_limit_paisa !== undefined) {
        setSpendLimitInr(json.wallet.spend_limit_paisa / 100)
      }
      if (json.wallet) {
        setData(prev => prev ? { ...prev, wallet: json.wallet } : prev)
      }
      toast.success('Tenant settings saved successfully 🚀')
      await loadTenant(false)
    } catch (err: any) {
      toast.error('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSavePhoneQuota = async (newQuota: number) => {
    try {
      setSavingPhoneQuota(true)
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_numbers_limit: newQuota }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Failed to update phone number quota')
      }
      setPhoneNumbersQuota(newQuota)
      toast.success(`Phone line quota updated to ${newQuota} lines for this customer!`)
      await loadTenant(false)
    } catch (err: any) {
      toast.error('Quota update failed: ' + err.message)
    } finally {
      setSavingPhoneQuota(false)
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Prepaid Wallet Balance (Live) */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-zinc-950/80 to-zinc-950/60 border border-emerald-500/30 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Wallet className="w-4 h-4" />
              Prepaid Wallet
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ₹{((data?.wallet?.balance_paisa || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-zinc-500">
            Spend: ₹{((data?.wallet?.current_spend_paisa || 0) / 100).toLocaleString('en-IN')} this mo
          </p>
        </div>

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
                <span className="font-semibold text-white font-mono">{tenant?.gst_number || tenant?.gstin || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Plan Tier</span>
                <span className="font-semibold text-white uppercase">
                  {billingModel === 'credit_based'
                    ? 'Credit-Based'
                    : billingModel === 'outcome_based'
                    ? 'Outcome-Based'
                    : tenant?.plan_tier || 'Starter'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Created Date</span>
                <span className="font-semibold text-white">
                  {tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString('en-IN') : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">KYC Status</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase mt-1 ${
                  tenant?.kyc_status === 'verified'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : tenant?.kyc_status === 'pending_review'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : tenant?.kyc_status === 'rejected'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {tenant?.kyc_status || 'unsubmitted'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Voice Minutes Balance</span>
                <span className="font-semibold text-white font-mono text-sm mt-0.5 block">
                  {tenant?.paid_minutes_remaining ?? 20} min
                </span>
              </div>
              {(tenant?.business_description || tenant?.description) && (
                <div className="col-span-2 pt-2 border-t border-zinc-800/60">
                  <span className="text-zinc-500 block mb-1">Business Description</span>
                  <p className="text-white leading-relaxed">{tenant.business_description || tenant.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Agents */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-violet-400" />
                Deployed Voice & AI Agents ({data?.agents.length || 0})
              </h3>
            </div>

            {(!data?.agents || data.agents.length === 0) ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No active agents deployed for this organization.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.agents.map((agent: any) => {
                  const isAgentActive = agent.is_active !== false
                  const isToggling = togglingAgentId === agent.id

                  return (
                    <div key={agent.id} className="p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80 flex flex-col justify-between gap-3 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-xs text-white">{agent.name || 'Unnamed Agent'}</div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Role: {agent.role || 'Assistant'}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            isAgentActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {isAgentActive ? 'Active' : 'Paused'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-400 bg-zinc-800">
                            {agent.voice_provider || 'Vapi'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">
                          {isAgentActive ? 'Accepting inbound & outbound calls' : 'Calls rejected (Paused)'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleAgent(agent.id, isAgentActive)}
                          disabled={isToggling}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            isAgentActive
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                          }`}
                        >
                          {isToggling ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isAgentActive ? (
                            'Pause Agent'
                          ) : (
                            'Resume Agent'
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Admin Overrides & Notes */}
        <div className="space-y-6">
          {/* 1. Prepaid Wallet Balance & Credit Management Card (P3, P4, P8) - Top Priority */}
          <div className="bg-zinc-950/80 border border-emerald-500/30 rounded-2xl p-6 space-y-5 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                Wallet Balance & Credit Management
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Prepaid Live
              </span>
            </div>

            {/* Current Live Balance Metric */}
            <div className="p-4 bg-gradient-to-br from-emerald-950/30 via-zinc-900/80 to-zinc-900/40 rounded-xl border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">
                  Live Prepaid Balance
                </span>
                <span className="text-3xl font-black text-emerald-400 font-mono mt-1 block">
                  ₹{((data?.wallet?.balance_paisa || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">
                  Current Spend
                </span>
                <span className="text-sm font-semibold text-white font-mono mt-1 block">
                  ₹{((data?.wallet?.current_spend_paisa || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Wallet Action Tabs (Credit, Debit, Refund) */}
            <div className="pt-1 space-y-3">
              <div className="flex rounded-xl bg-zinc-900 border border-zinc-800 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setWalletTab('credit')}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    walletTab === 'credit'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  + Add Credit
                </button>
                <button
                  type="button"
                  onClick={() => setWalletTab('debit')}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    walletTab === 'debit'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  - Debit Balance
                </button>
                <button
                  type="button"
                  onClick={() => setWalletTab('refund')}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    walletTab === 'refund'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Refund
                </button>
              </div>

              {/* TAB 1: ADD CREDIT */}
              {walletTab === 'credit' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                      Add / Adjust Credit
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">Instant Ledger Deposit</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-zinc-500 font-bold">₹</span>
                      <input
                        type="number"
                        placeholder="Enter amount (e.g. 500 or 1000)"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                        min="1"
                        step="50"
                      />
                    </div>

                    <div className="flex gap-1.5">
                      {[500, 1000, 2500, 5000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCreditAmount(String(preset))}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                            creditAmount === String(preset)
                              ? 'bg-emerald-500 text-black font-extrabold'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                          }`}
                        >
                          +₹{preset.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="Optional reason (e.g. Promotional top-up)"
                      value={creditReason}
                      onChange={(e) => setCreditReason(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                      maxLength={120}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCredit}
                    disabled={addingCredit || !creditAmount || Number(creditAmount) <= 0}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {addingCredit ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Crediting...
                      </>
                    ) : (
                      <>
                        <Coins className="w-3.5 h-3.5" />
                        Credit Wallet {creditAmount && Number(creditAmount) > 0 ? `(₹${Number(creditAmount).toLocaleString('en-IN')})` : ''}
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* TAB 2: DEBIT WALLET (Task 5.10) */}
              {walletTab === 'debit' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-rose-400" />
                      Manual Wallet Debit (Task 5.10)
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">Deducts Live Balance</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-zinc-500 font-bold">₹</span>
                      <input
                        type="number"
                        placeholder="Enter debit amount (e.g. 500)"
                        value={debitAmount}
                        onChange={(e) => setDebitAmount(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500"
                        min="1"
                        step="50"
                      />
                    </div>

                    <div className="flex gap-1.5">
                      {[100, 500, 1000, 2500].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setDebitAmount(String(preset))}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                            debitAmount === String(preset)
                              ? 'bg-rose-500 text-white font-extrabold'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                          }`}
                        >
                          -₹{preset.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="Mandatory reason for debit (e.g. Dispute chargeback, Manual correction)"
                      value={debitReason}
                      onChange={(e) => setDebitReason(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500"
                      maxLength={120}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleDebitWallet}
                    disabled={debiting || !debitAmount || Number(debitAmount) <= 0}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {debiting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Debiting...
                      </>
                    ) : (
                      <>
                        <Coins className="w-3.5 h-3.5" />
                        Debit Wallet {debitAmount && Number(debitAmount) > 0 ? `(-₹${Number(debitAmount).toLocaleString('en-IN')})` : ''}
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* TAB 3: REFUND PROCESSOR (Task 5.14) */}
              {walletTab === 'refund' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-amber-400" />
                      Refund Processor (Task 5.14)
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">Statutory Credit Note</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-zinc-500 font-bold">₹</span>
                      <input
                        type="number"
                        placeholder="Refund amount (e.g. 1500)"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                        min="1"
                        step="50"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-400">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="refund_mode"
                          value="credit_back"
                          checked={refundMode === 'credit_back'}
                          onChange={() => setRefundMode('credit_back')}
                        />
                        Credit to Customer Wallet
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer ml-2">
                        <input
                          type="radio"
                          name="refund_mode"
                          value="deduct_balance"
                          checked={refundMode === 'deduct_balance'}
                          onChange={() => setRefundMode('deduct_balance')}
                        />
                        Deduct (External Bank Refund)
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="Reason for refund (e.g. Cooling-off period cancellation, SLA breach)"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                      maxLength={120}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleProcessRefund}
                    disabled={refunding || !refundAmount || Number(refundAmount) <= 0}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {refunding ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Processing Refund...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve & Process Refund {refundAmount && Number(refundAmount) > 0 ? `(₹${Number(refundAmount).toLocaleString('en-IN')})` : ''}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Spend Limit Override */}
            <div className="space-y-1.5 pt-3 border-t border-zinc-800/60">
              <label className="text-xs text-zinc-400 flex items-center justify-between">
                <span>Monthly Spend Limit</span>
                <span className="text-[10px] text-zinc-500">Default ₹2,500</span>
              </label>
              <input
                type="number"
                value={spendLimitInr === 0 ? 0 : spendLimitInr || ''}
                onChange={(e) => setSpendLimitInr(e.target.value === '' ? ('' as any) : Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                min="0"
                step="100"
              />
              <span className="text-[10px] text-zinc-500 block">
                Limits total monthly customer liability. Saved via top "Save Changes" button.
              </span>
            </div>

            {/* Recent Ledger History */}
            {data?.transactions && data.transactions.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-zinc-800/60">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Recent Ledger History
                </span>
                <div className="space-y-1.5">
                  {data.transactions.slice(0, 3).map((tx: any) => (
                    <div key={tx.id} className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-[10px] flex items-center justify-between">
                      <div className="truncate mr-2">
                        <span className="font-semibold text-white block truncate">{tx.description || tx.type}</span>
                        <span className="text-zinc-500">
                          {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className={`font-mono font-bold shrink-0 ${tx.amount_paisa >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tx.amount_paisa >= 0 ? '+' : ''}₹{(tx.amount_paisa / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Exclusive Plan Model Selector */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-violet-400" />
              Billing Plan Model
            </h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Plans are exclusively chosen per customer. Not a both-ways toggle.
            </p>

            <div className="space-y-2">
              {[
                {
                  id: 'subscription',
                  label: 'Subscription Tier',
                  desc: 'Fixed recurring tier (Starter / Pro / Enterprise) with bundled monthly minutes.',
                },
                {
                  id: 'credit_based',
                  label: 'Credit-Based',
                  desc: 'Prepaid wallet pay-as-you-go credits deducted per minute of voice conversation.',
                },
                {
                  id: 'outcome_based',
                  label: 'Outcome-Based',
                  desc: 'Prepaid wallet deducted per successful outcome (e.g. ₹49/appointment, ₹29/lead).',
                },
              ].map((model) => (
                <div
                  key={model.id}
                  onClick={() => setBillingModel(model.id as any)}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    billingModel === model.id
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="billing_model"
                    value={model.id}
                    checked={billingModel === model.id}
                    onChange={() => setBillingModel(model.id as any)}
                    className="mt-0.5 text-violet-600 focus:ring-violet-500 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white">{model.label}</div>
                    <div className="text-[10px] text-zinc-400 leading-snug">{model.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>


          {/* Reliability Score & Emergency Minutes Status */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              Reliability & Emergency Buffer
            </h3>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase font-bold">Reliability Score</span>
                <span className="text-lg font-bold text-white font-mono mt-0.5 block">
                  {data?.wallet?.reliability_score ?? 85} / 100
                </span>
                <span className="text-[9px] text-emerald-400 block mt-0.5">
                  {(data?.wallet?.reliability_score ?? 85) > 80 ? '✓ Eligible for Buffer' : 'Score ≤ 80 (Ineligible)'}
                </span>
              </div>

              <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase font-bold">Emergency Minutes</span>
                <span className="text-lg font-bold text-white font-mono mt-0.5 block">
                  {data?.wallet?.emergency_minutes_available ?? 0} Mins
                </span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">
                  {data?.wallet?.emergency_minutes_claimed_at ? 'Claimed recently' : 'Unclaimed'}
                </span>
              </div>
            </div>
          </div>

          {/* Task 5.9: Manual Voice Minutes Adjustment (+/- Mins) */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Manual Voice Minutes Adjustment (Task 5.9)
              </span>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                Current: {tenant?.paid_minutes_remaining ?? 20}m
              </span>
            </h3>

            <div className="space-y-3">
              <label className="text-xs text-zinc-400 block">
                Adjust balance (+/- minutes). e.g. +100 to top-up, or -50 to revoke.
              </label>
              
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="e.g. +100 or -50"
                  value={adjustMinutesDelta}
                  onChange={(e) => setAdjustMinutesDelta(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleAdjustMinutes}
                  disabled={adjustingMinutes || !adjustMinutesDelta || Number(adjustMinutesDelta) === 0}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {adjustingMinutes ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Apply Adjustment'
                  )}
                </button>
              </div>

              {/* Quick preset buttons */}
              <div className="flex gap-1.5 pt-1">
                {[-100, -50, 50, 100, 500].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAdjustMinutesDelta(String(preset))}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                      adjustMinutesDelta === String(preset)
                        ? 'bg-emerald-500 text-black font-extrabold'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {preset > 0 ? `+${preset}` : preset}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Phone Numbers Allotment Quota Card */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-400" />
                Phone Line Limit & Allotment
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active: {data?.tenant?.assigned_phone_numbers_count ?? 0} Lines
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Base quota is 5 lines. Increase allotment here so this customer can claim or buy more phone numbers.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 flex items-center justify-between mb-1.5">
                  <span>Total Allowed Lines</span>
                  <span className="text-[10px] font-mono text-zinc-500">Base 5 + Extra {Math.max(0, phoneNumbersQuota - 5)}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={phoneNumbersQuota}
                    onChange={(e) => setPhoneNumbersQuota(Math.max(5, Number(e.target.value)))}
                    className="w-28 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleSavePhoneQuota(phoneNumbersQuota)}
                    disabled={savingPhoneQuota}
                    className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {savingPhoneQuota ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Quota
                  </button>
                </div>
              </div>

              {/* Quick preset buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                {[5, 10, 15, 20, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setPhoneNumbersQuota(preset)
                      handleSavePhoneQuota(preset)
                    }}
                    disabled={savingPhoneQuota}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      phoneNumbersQuota === preset
                        ? 'bg-emerald-500 text-zinc-950 font-extrabold shadow-sm'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    {preset} Lines
                  </button>
                ))}
              </div>
            </div>
          </div>

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
