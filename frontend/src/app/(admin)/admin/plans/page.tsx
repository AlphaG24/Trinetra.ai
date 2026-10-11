'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  Check,
  AlertCircle,
  Search,
  RefreshCw,
  Sparkles,
  PhoneCall,
  Users,
  ShieldCheck,
  ArrowUpDown,
  Gift,
  DollarSign,
  ShieldAlert,
  Coins,
  Target,
  Activity,
  Globe,
  Save,
  Loader2,
  Percent,
  Phone,
  Euro
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Plan {
  id: string
  name: string
  slug: string
  description: string
  price_monthly: number
  price_annual: number
  max_agents: number
  included_voice_minutes: number
  included_chat_conversations: number
  included_social_posts: number
  overage_voice_per_minute: number
  is_popular: boolean
  is_active: boolean
  badge_text: string | null
  display_order: number
  features: Record<string, any>
  created_at: string
}

export default function PricingPlansAdminPage() {
  const [activeTab, setActiveTab] = useState<'subscription' | 'trial' | 'credits' | 'emergency' | 'international'>('subscription')

  // Plans Catalog State
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')

  // System Pricing Configs State
  const [configs, setConfigs] = useState<Record<string, string>>({})
  const [loadingConfigs, setLoadingConfigs] = useState(false)
  const [savingConfigs, setSavingConfigs] = useState(false)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price_monthly_rupees: 4999,
    price_annual_rupees: 3999,
    max_agents: 1,
    included_voice_minutes: 500,
    overage_voice_rupees: 10,
    is_popular: false,
    is_active: true,
    badge_text: '',
    display_order: 1
  })

  // Load System Configs
  const fetchConfigs = useCallback(async () => {
    try {
      setLoadingConfigs(true)
      const res = await fetch('/api/admin/system-config')
      if (!res.ok) throw new Error('Failed to load system pricing configs')
      const data = await res.json()
      const confMap: Record<string, string> = {}
      ;(data.configs || []).forEach((c: any) => {
        confMap[c.config_key] = c.config_value
      })
      setConfigs(confMap)
    } catch (err: any) {
      console.warn('Error loading system configs:', err)
    } finally {
      setLoadingConfigs(false)
    }
  }, [])

  const handleConfigChange = (key: string, val: string) => {
    setConfigs(prev => ({ ...prev, [key]: val }))
  }

  const handleRupeeChange = (key: string, rupeeStr: string) => {
    const val = parseFloat(rupeeStr)
    const paisa = isNaN(val) ? '0' : Math.round(val * 100).toString()
    handleConfigChange(key, paisa)
  }

  const displayRupees = (paisaStr: string) => {
    const p = parseInt(paisaStr, 10)
    return isNaN(p) ? '0' : (p / 100).toString()
  }

  const handleDollarChange = (key: string, dollarStr: string) => {
    const val = parseFloat(dollarStr)
    const cents = isNaN(val) ? '0' : Math.round(val * 100).toString()
    handleConfigChange(key, cents)
  }

  const displayDollars = (centsStr: string) => {
    const c = parseInt(centsStr, 10)
    return isNaN(c) ? '0' : (c / 100).toString()
  }

  const handleEuroChange = (key: string, euroStr: string) => {
    const val = parseFloat(euroStr)
    const cents = isNaN(val) ? '0' : Math.round(val * 100).toString()
    handleConfigChange(key, cents)
  }

  const displayEuros = (centsStr: string) => {
    const c = parseInt(centsStr, 10)
    return isNaN(c) ? '0' : (c / 100).toString()
  }

  const handleSaveConfigs = async () => {
    try {
      setSavingConfigs(true)
      const payload = Object.entries(configs).map(([config_key, config_value]) => ({
        config_key,
        config_value: String(config_value)
      }))

      const res = await fetch('/api/admin/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: payload })
      })

      if (!res.ok) throw new Error('Failed to persist pricing settings')
      toast.success('Pricing configurations saved successfully!')
      fetchConfigs()
    } catch (err: any) {
      toast.error(err.message || 'Error saving settings')
    } finally {
      setSavingConfigs(false)
    }
  }

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/plans')
      if (!res.ok) throw new Error('Failed to load pricing plans')
      const data = await res.json()
      setPlans(data.plans || [])
    } catch (err: any) {
      toast.error('Error fetching plans: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlans()
    fetchConfigs()
  }, [fetchPlans, fetchConfigs])

  const openCreateModal = () => {
    setEditingPlan(null)
    setFormData({
      name: '',
      slug: '',
      description: '',
      price_monthly_rupees: 4999,
      price_annual_rupees: 3999,
      max_agents: 1,
      included_voice_minutes: 500,
      overage_voice_rupees: 10,
      is_popular: false,
      is_active: true,
      badge_text: '',
      display_order: (plans.length || 0) + 1
    })
    setIsModalOpen(true)
  }

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      price_monthly_rupees: Math.round((plan.price_monthly || 0) / 100),
      price_annual_rupees: Math.round((plan.price_annual || 0) / 100),
      max_agents: plan.max_agents || 1,
      included_voice_minutes: plan.included_voice_minutes || 0,
      overage_voice_rupees: Math.round((plan.overage_voice_per_minute || 1000) / 100),
      is_popular: Boolean(plan.is_popular),
      is_active: Boolean(plan.is_active),
      badge_text: plan.badge_text || '',
      display_order: plan.display_order || 1
    })
    setIsModalOpen(true)
  }

  const handleToggleActive = async (plan: Plan) => {
    try {
      const nextActive = !plan.is_active
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plan.id, is_active: nextActive })
      })
      if (!res.ok) throw new Error('Failed to update status')
      toast.success(`Plan "${plan.name}" ${nextActive ? 'activated' : 'deactivated'}!`)
      fetchPlans()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDeletePlan = async (plan: Plan) => {
    if (!confirm(`Are you sure you want to archive/delete "${plan.name}"? Users will no longer see this plan.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/plans?id=${plan.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to archive plan')
      toast.success(`Plan "${plan.name}" archived successfully.`)
      fetchPlans()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const payload = {
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
        description: formData.description,
        price_monthly: Math.round(Number(formData.price_monthly_rupees) * 100),
        price_annual: Math.round(Number(formData.price_annual_rupees) * 100),
        max_agents: Number(formData.max_agents),
        included_voice_minutes: Number(formData.included_voice_minutes),
        overage_voice_per_minute: Math.round(Number(formData.overage_voice_rupees) * 100),
        is_popular: formData.is_popular,
        is_active: formData.is_active,
        badge_text: formData.badge_text || null,
        display_order: Number(formData.display_order)
      }

      if (editingPlan) {
        const res = await fetch('/api/admin/plans', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingPlan.id, ...payload })
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Failed to update plan')
        }
        toast.success(`Plan "${payload.name}" updated!`)
      } else {
        const res = await fetch('/api/admin/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Failed to create plan')
        }
        toast.success(`New plan "${payload.name}" created! Now visible to users.`)
      }

      setIsModalOpen(false)
      fetchPlans()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredPlans = plans.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterActive === 'all' ||
      (filterActive === 'active' && p.is_active) ||
      (filterActive === 'inactive' && !p.is_active)
    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-[var(--heading)] font-playfair">
              Pricing Plans
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 font-playfair">
              Live Catalog
            </span>
          </div>
          <p className="text-[var(--muted)] text-sm mt-1 font-merriweather">
            Create, modify pricing, adjust included minutes, or deactivate subscription tiers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPlans()}
            className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] transition shadow-2xs"
            title="Refresh plans"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-xs transition shadow-sm font-playfair hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Create New Plan
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
        <button
          onClick={() => setActiveTab('subscription')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'subscription'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
              : 'text-[var(--muted)] hover:text-[var(--heading)] bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--hover-bg)]'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Subscription Plans
        </button>

        <button
          onClick={() => setActiveTab('trial')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'trial'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
              : 'text-[var(--muted)] hover:text-[var(--heading)] bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--hover-bg)]'
          }`}
        >
          <Gift className="w-3.5 h-3.5 text-violet-500" />
          Trial & Onboarding
        </button>

        <button
          onClick={() => setActiveTab('credits')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'credits'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
              : 'text-[var(--muted)] hover:text-[var(--heading)] bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--hover-bg)]'
          }`}
        >
          <Coins className="w-3.5 h-3.5 text-amber-500" />
          Credits & Outcomes
        </button>

        <button
          onClick={() => setActiveTab('emergency')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'emergency'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
              : 'text-[var(--muted)] hover:text-[var(--heading)] bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--hover-bg)]'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-rose-500" />
          Overdraft & Limits
        </button>

        <button
          onClick={() => setActiveTab('international')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'international'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
              : 'text-[var(--muted)] hover:text-[var(--heading)] bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--hover-bg)]'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-sky-500" />
          Global Currencies
        </button>

        {activeTab !== 'subscription' && (
          <button
            onClick={handleSaveConfigs}
            disabled={savingConfigs}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-violet-500/20 cursor-pointer disabled:opacity-50"
          >
            {savingConfigs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save All Changes
          </button>
        )}
      </div>

      {activeTab === 'subscription' && (
        <div className="space-y-6">
          {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search plans by name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-violet-500 transition font-merriweather shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] text-xs w-full sm:w-auto shadow-2xs">
          {(['all', 'active', 'inactive'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterActive(mode)}
              className={`px-3 py-1.5 rounded-lg capitalize font-medium transition font-playfair ${
                filterActive === mode
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--heading)]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] space-y-3 shadow-xs">
          <CreditCard className="w-10 h-10 text-[var(--muted)] mx-auto" />
          <h3 className="text-[var(--heading)] font-bold text-base font-playfair">No pricing plans found</h3>
          <p className="text-[var(--muted)] text-xs max-w-sm mx-auto font-merriweather">
            Try adjusting your search filter or click &quot;Create New Plan&quot; to publish a tier.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                plan.is_active
                  ? 'bg-[var(--card-bg)] border-[var(--border)] hover:border-violet-500/30'
                  : 'bg-[var(--card-bg)] border-dashed border-[var(--border)] opacity-75'
              }`}
            >
              {/* Card Header & Badges */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[var(--muted)]">#{plan.display_order}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                        plan.is_active
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-[var(--muted)]'
                      }`}
                    >
                      {plan.is_active ? 'Active' : 'Deactivated'}
                    </span>
                    {plan.is_popular && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 flex items-center gap-1 font-playfair">
                        <Sparkles className="w-2.5 h-2.5" />
                        Popular
                      </span>
                    )}
                  </div>
                  {plan.badge_text && (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-playfair">
                      {plan.badge_text}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-black text-[var(--heading)] font-playfair">{plan.name}</h3>
                  <p className="text-[var(--muted)] text-xs font-mono mt-0.5">/{plan.slug}</p>
                  <p className="text-[var(--body)] text-xs mt-2 line-clamp-2 min-h-[32px] font-merriweather">
                    {plan.description || 'No description provided.'}
                  </p>
                </div>

                {/* Pricing Info */}
                <div className="pt-3 border-t border-[var(--border)]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[var(--heading)] font-heading">
                      ₹{Math.round((plan.price_monthly || 0) / 100).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-[var(--muted)] font-merriweather">/mo</span>
                  </div>
                  <div className="text-[11px] text-[var(--muted)] mt-0.5 font-merriweather">
                    Annual: ₹{Math.round((plan.price_annual || 0) / 100).toLocaleString('en-IN')}/mo
                  </div>
                </div>

                {/* Quotas */}
                <div className="space-y-2 pt-2 text-xs text-[var(--body)] font-merriweather">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[var(--muted)]">
                      <PhoneCall className="w-3.5 h-3.5 text-sky-500" /> Included Voice
                    </span>
                    <span className="font-semibold font-mono text-[var(--heading)]">
                      {plan.included_voice_minutes} mins
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[var(--muted)]">
                      <Users className="w-3.5 h-3.5 text-indigo-500" /> Max Agents
                    </span>
                    <span className="font-semibold font-mono text-[var(--heading)]">
                      {plan.max_agents}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[var(--muted)]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Overage Rate
                    </span>
                    <span className="font-semibold font-mono text-[var(--heading)]">
                      ₹{((plan.overage_voice_per_minute || 1000) / 100).toFixed(2)}/min
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 bg-zinc-50/50 dark:bg-white/[0.02] border-t border-[var(--border)] flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleActive(plan)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition font-playfair ${
                    plan.is_active
                      ? 'bg-[var(--card-bg)] border border-[var(--border)] text-[var(--body)] hover:bg-rose-500/10 hover:text-rose-500'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                  title={plan.is_active ? 'Deactivate Plan' : 'Activate Plan'}
                >
                  {plan.is_active ? (
                    <>
                      <PowerOff className="w-3.5 h-3.5" /> Deactivate
                    </>
                  ) : (
                    <>
                      <Power className="w-3.5 h-3.5" /> Activate
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(plan)}
                    className="p-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)] transition cursor-pointer"
                    title="Edit Plan"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan)}
                    className="p-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] hover:bg-rose-500/10 text-[var(--muted)] hover:text-rose-500 transition cursor-pointer"
                    title="Archive Plan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )}

      {/* TAB 2: TRIAL & ONBOARDING */}
      {activeTab === 'trial' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-6 shadow-xs">
            <h2 className="text-sm font-bold text-[var(--heading)] uppercase tracking-wider border-b border-[var(--border)] pb-3 flex items-center gap-2">
              <Gift className="w-4 h-4 text-violet-500" />
              Trial Package & Rates
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Free Demo Minutes</label>
                  <input
                    type="number"
                    value={configs.free_demo_minutes || '10'}
                    onChange={(e) => handleConfigChange('free_demo_minutes', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-violet-500 outline-none"
                    min="0"
                  />
                  <span className="text-[9px] text-[var(--muted)] block">Granted for ₹0 web calls before purchase.</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Trial Fee (₹)</label>
                  <input
                    type="number"
                    value={displayRupees(configs.trial_price_paisa || '9900')}
                    onChange={(e) => handleRupeeChange('trial_price_paisa', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-violet-500 outline-none"
                    min="0"
                  />
                  <span className="text-[9px] text-[var(--muted)] block">Upfront trial price (default: ₹99).</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Trial Duration (Days)</label>
                  <input
                    type="number"
                    value={configs.trial_days || '7'}
                    onChange={(e) => handleConfigChange('trial_days', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-violet-500 outline-none"
                    min="1"
                  />
                  <span className="text-[9px] text-[var(--muted)] block">Trial validity before autopay mandate debits.</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Trial Quota (Minutes)</label>
                  <input
                    type="number"
                    value={configs.trial_minutes || '50'}
                    onChange={(e) => handleConfigChange('trial_minutes', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-violet-500 outline-none"
                    min="1"
                  />
                  <span className="text-[9px] text-[var(--muted)] block">Total calling minutes included in trial.</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Trial Max Agents</label>
                  <input
                    type="number"
                    value={configs.max_agents_trial || '2'}
                    onChange={(e) => handleConfigChange('max_agents_trial', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-violet-500 outline-none"
                    min="1"
                  />
                  <span className="text-[9px] text-[var(--muted)] block">Maximum active agents during trial.</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Trial Assign Numbers</label>
                  <select
                    value={configs.trial_can_assign_numbers || 'true'}
                    onChange={(e) => handleConfigChange('trial_can_assign_numbers', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-violet-500 outline-none cursor-pointer"
                  >
                    <option value="true">Allowed (Assign Ded. Numbers)</option>
                    <option value="false">Web Calls Only</option>
                  </select>
                  <span className="text-[9px] text-[var(--muted)] block">Allow trialists to assign phone numbers.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-6 shadow-xs">
            <h2 className="text-sm font-bold text-[var(--heading)] uppercase tracking-wider border-b border-[var(--border)] pb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              Onboarding & Setup Fees
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Onboarding Fee Status</label>
                  <select
                    value={configs.onboarding_fee_enabled || 'false'}
                    onChange={(e) => handleConfigChange('onboarding_fee_enabled', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-violet-500 outline-none cursor-pointer"
                  >
                    <option value="false">Waived / Disabled (Launch Special)</option>
                    <option value="true">Active (Charge Setup Fee)</option>
                  </select>
                  <span className="text-[9px] text-[var(--muted)] block">Charge one-time onboarding setup fee.</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Setup Fee (₹)</label>
                  <input
                    type="number"
                    value={displayRupees(configs.onboarding_fee_paisa || '0')}
                    onChange={(e) => handleRupeeChange('onboarding_fee_paisa', e.target.value)}
                    disabled={configs.onboarding_fee_enabled !== 'true'}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] disabled:opacity-50 focus:border-violet-500 outline-none"
                    min="0"
                  />
                  <span className="text-[9px] text-[var(--muted)] block">Amount charged on first account activation.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CREDITS & OUTCOMES */}
      {activeTab === 'credits' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-6 shadow-xs">
            <h2 className="text-sm font-bold text-[var(--heading)] uppercase tracking-wider border-b border-[var(--border)] pb-3 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              Prepaid Credits (Pay-As-You-Go)
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Credit Rate (₹/min)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={displayRupees(configs.credit_per_minute_paisa || '150')}
                    onChange={(e) => handleRupeeChange('credit_per_minute_paisa', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-amber-500 outline-none"
                    min="0"
                  />
                  <span className="text-[9px] text-[var(--muted)] block">Prepaid calling rate (default: ₹1.50/min).</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Min Wallet Topup (₹)</label>
                  <input
                    type="number"
                    value={displayRupees(configs.wallet_min_topup_paisa || '50000')}
                    onChange={(e) => handleRupeeChange('wallet_min_topup_paisa', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-amber-500 outline-none"
                    min="0"
                  />
                  <span className="text-[9px] text-[var(--muted)] block">Minimum recharge amount (default: ₹500).</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-6 shadow-xs">
            <h2 className="text-sm font-bold text-[var(--heading)] uppercase tracking-wider border-b border-[var(--border)] pb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" />
              Outcome-Based Conversion Rates
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Booked Appointment (₹)</label>
                  <input
                    type="number"
                    value={displayRupees(configs.outcome_appointment_paisa || '4900')}
                    onChange={(e) => handleRupeeChange('outcome_appointment_paisa', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-emerald-500 outline-none"
                    min="0"
                  />
                  <span className="text-[9px] text-[var(--muted)] block">Per confirmed booking (default: ₹49).</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Qualified BANT Lead (₹)</label>
                  <input
                    type="number"
                    value={displayRupees(configs.outcome_lead_paisa || '2900')}
                    onChange={(e) => handleRupeeChange('outcome_lead_paisa', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-emerald-500 outline-none"
                    min="0"
                  />
                  <span className="text-[9px] text-[var(--muted)] block">Per verified lead (default: ₹29).</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EMERGENCY BUFFER & LIMITS */}
      {activeTab === 'emergency' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-6 shadow-xs">
            <h2 className="text-sm font-bold text-[var(--heading)] uppercase tracking-wider border-b border-[var(--border)] pb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-500" />
              Free Emergency Overdraft & Buffer
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Buffer Quota (Mins)</label>
                  <input
                    type="number"
                    value={configs.emergency_minutes_quota || '50'}
                    onChange={(e) => handleConfigChange('emergency_minutes_quota', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:border-rose-500 outline-none"
                    min="1"
                  />
                  <span className="text-[9px] text-[var(--muted)] block">Free buffer minutes.</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Min Reliability</label>
                  <input
                    type="number"
                    value={configs.emergency_minutes_min_reliability_score || '80'}
                    onChange={(e) => handleConfigChange('emergency_minutes_min_reliability_score', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:border-rose-500 outline-none"
                    min="1"
                    max="100"
                  />
                  <span className="text-[9px] text-[var(--muted)] block">Score out of 100.</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Cooldown (Days)</label>
                  <input
                    type="number"
                    value={configs.emergency_minutes_cooldown_days || '30'}
                    onChange={(e) => handleConfigChange('emergency_minutes_cooldown_days', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:border-rose-500 outline-none"
                    min="1"
                  />
                  <span className="text-[9px] text-[var(--muted)] block">Days before re-claim.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-6 shadow-xs">
            <h2 className="text-sm font-bold text-[var(--heading)] uppercase tracking-wider border-b border-[var(--border)] pb-3 flex items-center gap-2">
              <Percent className="w-4 h-4 text-cyan-500" />
              Add-ons & Overages
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Phone Cost (₹/mo)</label>
                  <input
                    type="number"
                    value={displayRupees(configs.inbound_number_cost_paisa || '49900')}
                    onChange={(e) => handleRupeeChange('inbound_number_cost_paisa', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-cyan-500 outline-none"
                    min="0"
                  />
                  <span className="text-[9px] text-[var(--muted)] block">Dedicated DID phone price (default: ₹499).</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Overage Rate (₹/min)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={displayRupees(configs.overage_per_minute_paisa || '1100')}
                    onChange={(e) => handleRupeeChange('overage_per_minute_paisa', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-cyan-500 outline-none"
                    min="0"
                  />
                  <span className="text-[9px] text-[var(--muted)] block">Overage rate per billable minute (default: ₹11).</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: INTERNATIONAL CURRENCIES */}
      {activeTab === 'international' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-6 shadow-xs">
            <h2 className="text-sm font-bold text-[var(--heading)] uppercase tracking-wider border-b border-[var(--border)] pb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-500" />
              US Dollar (USD $) Plan Rates
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Global Starter ($/mo)</label>
                  <input
                    type="number"
                    value={displayDollars(configs.starter_price_usd_cents || '8900')}
                    onChange={(e) => handleDollarChange('starter_price_usd_cents', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-sky-500 outline-none"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Global Pro ($/mo)</label>
                  <input
                    type="number"
                    value={displayDollars(configs.professional_price_usd_cents || '24900')}
                    onChange={(e) => handleDollarChange('professional_price_usd_cents', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-sky-500 outline-none"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Global Enterprise ($/mo)</label>
                  <input
                    type="number"
                    value={displayDollars(configs.enterprise_price_usd_cents || '59900')}
                    onChange={(e) => handleDollarChange('enterprise_price_usd_cents', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-sky-500 outline-none"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Global Trial ($)</label>
                  <input
                    type="number"
                    value={displayDollars(configs.trial_price_usd_cents || '500')}
                    onChange={(e) => handleDollarChange('trial_price_usd_cents', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-sky-500 outline-none"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-6 shadow-xs">
            <h2 className="text-sm font-bold text-[var(--heading)] uppercase tracking-wider border-b border-[var(--border)] pb-3 flex items-center gap-2">
              <Euro className="w-4 h-4 text-blue-500" />
              Euro (EUR €) Plan Rates
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Europe Starter (€/mo)</label>
                  <input
                    type="number"
                    value={displayEuros(configs.starter_price_eur_cents || '7900')}
                    onChange={(e) => handleEuroChange('starter_price_eur_cents', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-blue-500 outline-none"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Europe Pro (€/mo)</label>
                  <input
                    type="number"
                    value={displayEuros(configs.professional_price_eur_cents || '21900')}
                    onChange={(e) => handleEuroChange('professional_price_eur_cents', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-blue-500 outline-none"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Europe Enterprise (€/mo)</label>
                  <input
                    type="number"
                    value={displayEuros(configs.enterprise_price_eur_cents || '49900')}
                    onChange={(e) => handleEuroChange('enterprise_price_eur_cents', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-blue-500 outline-none"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Europe Trial (€)</label>
                  <input
                    type="number"
                    value={displayEuros(configs.trial_price_eur_cents || '400')}
                    onChange={(e) => handleEuroChange('trial_price_eur_cents', e.target.value)}
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:border-blue-500 outline-none"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-xl p-6 space-y-6 shadow-2xl my-8 text-[var(--body)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--heading)] font-playfair">
                  {editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create New Pricing Plan'}
                </h2>
                <p className="text-xs text-[var(--muted)] mt-0.5 font-merriweather">
                  Changes take effect immediately on pricing & checkout flows.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--heading)] text-lg font-mono p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--heading)] block mb-1 font-playfair">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Starter AI"
                    className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 font-merriweather"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--heading)] block mb-1 font-playfair">
                    Slug (URL identifier) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPlan}
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-') })}
                    placeholder="e.g. starter"
                    className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] disabled:opacity-50 focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--heading)] block mb-1 font-playfair">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short tagline describing who this plan is tailored for..."
                  className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 font-merriweather"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--heading)] block mb-1 font-playfair">
                    Monthly Price (₹ INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price_monthly_rupees}
                    onChange={(e) => setFormData({ ...formData, price_monthly_rupees: Number(e.target.value) })}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--heading)] block mb-1 font-playfair">
                    Annual Price/mo (₹ INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price_annual_rupees}
                    onChange={(e) => setFormData({ ...formData, price_annual_rupees: Number(e.target.value) })}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--heading)] block mb-1 font-playfair">
                    Included Voice Minutes
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.included_voice_minutes}
                    onChange={(e) => setFormData({ ...formData, included_voice_minutes: Number(e.target.value) })}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--heading)] block mb-1 font-playfair">
                    Max Agents
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_agents}
                    onChange={(e) => setFormData({ ...formData, max_agents: Number(e.target.value) })}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--heading)] block mb-1 font-playfair">
                    Overage (₹/min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.overage_voice_rupees}
                    onChange={(e) => setFormData({ ...formData, overage_voice_rupees: Number(e.target.value) })}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--heading)] block mb-1 font-playfair">
                    Badge Text (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.badge_text}
                    onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                    placeholder="e.g. MOST POPULAR"
                    className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 font-merriweather"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--heading)] block mb-1 font-playfair">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--body)] font-merriweather">
                  <input
                    type="checkbox"
                    checked={formData.is_popular}
                    onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                    className="w-4 h-4 rounded border-[var(--border)] bg-[var(--card-bg)] text-violet-600 focus:ring-0"
                  />
                  Highlight as Popular
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--body)] font-merriweather">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-[var(--border)] bg-[var(--card-bg)] text-violet-600 focus:ring-0"
                  />
                  Active (visible on website)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--hover-bg)] hover:bg-zinc-200/50 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--heading)] text-xs font-semibold transition font-playfair cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold transition disabled:opacity-50 font-playfair shadow-xs hover:opacity-90 cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingPlan ? 'Save Changes' : 'Publish Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
