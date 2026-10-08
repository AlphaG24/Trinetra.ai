'use client'

import { useEffect, useState } from 'react'
import { ApiKeyManager } from '@/components/admin/ApiKeyManager'
import { 
  Sliders, Key, Send, CreditCard, RefreshCw, Save, Loader2, AlertTriangle,
  Gift, DollarSign, ShieldAlert, Cpu, Percent, WrenchIcon, Globe, Lock,
  Coins, Target, Activity, Phone, Euro
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/client'

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({
    VAPI_PUBLIC_KEY: '',
    VAPI_PRIVATE_KEY: '',
    VAPI_WEBHOOK_SECRET: '',
    DEEPGRAM_API_KEY: '',
    SARVAM_API_KEY: '',
    ELEVENLABS_API_KEY: '',
    GEMINI_API_KEY: '',
    OPENAI_API_KEY: '',
    TELEGRAM_BOT_TOKEN: '',
    TELEGRAM_CHAT_ID: '',
    RAZORPAY_KEY_ID: '',
    RAZORPAY_KEY_SECRET: '',
    
    // Default values for billing & plan features (Master Plan Decisions P1-P11)
    free_demo_minutes: '10',
    trial_price_paisa: '9900', // P2: ₹99
    trial_days: '7',           // P2: 7 days
    trial_minutes: '50',       // P2: 50 min quota (editable via admin panel)
    max_agents_trial: '2',     // P2: 2 agents limit (editable via admin panel)
    trial_can_assign_numbers: 'true', // P2: can buy & assign numbers
    starter_price_paisa: '499900',
    starter_minutes: '500',
    professional_price_paisa: '1499900',
    professional_minutes: '2000',
    enterprise_price_paisa: '0',
    enterprise_minutes: '10000',
    max_agents_free: '1',
    max_agents_starter: '3',
    max_agents_professional: '10',
    inbound_number_cost_paisa: '49900',
    overage_per_minute_paisa: '1100', // P6: ₹11/min (range ₹10–₹12/min)
    maintenance_mode: 'false',

    // P3: Credit-based plans (Admin-editable pricing; prepaid wallet)
    credit_per_minute_paisa: '150',   // ₹1.50/min
    wallet_min_topup_paisa: '50000',  // ₹500 min topup

    // P4: Outcome-based plans (Admin-editable per-outcome pricing; prepaid wallet)
    outcome_appointment_paisa: '4900', // ₹49/appointment
    outcome_lead_paisa: '2900',        // ₹29/lead

    // P7: Free emergency minutes (50 free overdraft buffer mins, Reliability Score > 80, 30-day cooldown)
    emergency_minutes_quota: '50',
    emergency_minutes_min_reliability_score: '80',
    emergency_minutes_cooldown_days: '30',

    // P8: Spend limit (₹2,500 default; admin can override per customer)
    default_spend_limit_paisa: '250000', // ₹2,500 default

    // P9: Onboarding fee (Not active now; enabled via admin toggle; shown in pricing plan editor)
    onboarding_fee_enabled: 'false',
    onboarding_fee_paisa: '0',

    // Number limits & lifecycle configurations
    max_pooled_numbers_per_org: '10',
    hold_period_days: '14',
    auto_pool_threshold: '10',

    // P11: Multi-currency aware (INR, USD, EUR) — International (USD)
    starter_price_usd_cents: '8900',
    professional_price_usd_cents: '24900',
    enterprise_price_usd_cents: '59900',
    trial_price_usd_cents: '500',
    foreign_number_cost_usd_cents: '1500',
    overage_per_minute_usd_cents: '12',

    // P11: European (EUR) Plan Pricing
    starter_price_eur_cents: '7900',
    professional_price_eur_cents: '21900',
    enterprise_price_eur_cents: '49900',
    trial_price_eur_cents: '400',
    foreign_number_cost_eur_cents: '1500',
    overage_per_minute_eur_cents: '11',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showRotateModal, setShowRotateModal] = useState(false)
  const [stepUpModalOpen, setStepUpModalOpen] = useState(false)
  const [stepUpPassword, setStepUpPassword] = useState('')
  const [stepUpLoading, setStepUpLoading] = useState(false)
  const [pendingSaveRotation, setPendingSaveRotation] = useState(false)

  useEffect(() => {
    async function loadConfigs() {
      try {
        setLoading(true)
        const res = await fetch('/api/admin/system-config')
        if (res.status === 403) {
          toast.error('Super Admin access required for system configuration')
          return
        }
        if (!res.ok) throw new Error('Failed to load system configurations')
        const data = await res.json()
        if (data.configs) {
          setConfigs((prev) => ({ ...prev, ...data.configs }))
        }
      } catch (err: any) {
        toast.error(err.message || 'Error loading system configuration')
      } finally {
        setLoading(false)
      }
    }

    loadConfigs()

    // Setup Supabase Realtime subscription for system_config updates
    const supabase = createClient()
    const channel = supabase
      .channel(`system_config_realtime_${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_config' },
        (payload: any) => {
          if (payload.new) {
            const { config_key, config_value } = payload.new
            if (config_key) {
              setConfigs((prev) => ({
                ...prev,
                [config_key]: config_value || '',
              }))
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleChange = (key: string, value: string) => {
    setConfigs((prev) => ({ ...prev, [key]: value }))
  }

  // Maintenance mode toggle — auto-saves immediately without needing "Save All Changes"
  const [maintenanceSaving, setMaintenanceSaving] = useState(false)

  const handleMaintenanceToggle = async () => {
    const newValue = configs.maintenance_mode === 'true' ? 'false' : 'true'
    setConfigs((prev) => ({ ...prev, maintenance_mode: newValue }))
    try {
      setMaintenanceSaving(true)
      const res = await fetch('/api/admin/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: { maintenance_mode: newValue } }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to save')
      }
      toast.success(
        newValue === 'true'
          ? '🔒 Maintenance mode ON — users will see the maintenance screen'
          : '✅ Maintenance mode OFF — platform is live'
      )
    } catch (err: any) {
      // Revert on failure
      setConfigs((prev) => ({ ...prev, maintenance_mode: newValue === 'true' ? 'false' : 'true' }))
      toast.error(err.message || 'Failed to toggle maintenance mode')
    } finally {
      setMaintenanceSaving(false)
    }
  }

  const displayRupees = (paisaStr: string) => {
    const paisa = parseInt(paisaStr || '0', 10)
    return isNaN(paisa) ? 0 : paisa / 100
  }

  const handleRupeeChange = (key: string, rupeeValueStr: string) => {
    const rupees = parseFloat(rupeeValueStr || '0')
    const paisa = isNaN(rupees) ? 0 : Math.round(rupees * 100)
    handleChange(key, String(paisa))
  }

  const displayDollars = (centsStr: string) => {
    const cents = parseInt(centsStr || '0', 10)
    return isNaN(cents) ? 0 : cents / 100
  }

  const handleDollarChange = (key: string, dollarValueStr: string) => {
    const dollars = parseFloat(dollarValueStr || '0')
    const cents = isNaN(dollars) ? 0 : Math.round(dollars * 100)
    handleChange(key, String(cents))
  }

  const displayEuros = (centsStr: string) => {
    const cents = parseInt(centsStr || '0', 10)
    return isNaN(cents) ? 0 : cents / 100
  }

  const handleEuroChange = (key: string, euroValueStr: string) => {
    const euros = parseFloat(euroValueStr || '0')
    const cents = isNaN(euros) ? 0 : Math.round(euros * 100)
    handleChange(key, String(cents))
  }

  const handleRotateSingle = (key: string) => {
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    const rotatedVal = `rotated_${key.toLowerCase()}_${randomHex}`
    setConfigs((prev) => ({ ...prev, [key]: rotatedVal }))
    toast.success(`Rotated ${key}. Click "Save All Changes" to persist.`)
  }

  const handleSaveAll = async (isRotation = false, stepUpToken?: string) => {
    try {
      setSaving(true)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (stepUpToken) {
        headers['x-step-up-token'] = stepUpToken
      }

      const res = await fetch('/api/admin/system-config', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ configs, is_rotation: isRotation, step_up_token: stepUpToken }),
      })

      if (res.status === 403) {
        const json = await res.json()
        if (json.step_up_required) {
          setPendingSaveRotation(isRotation)
          setStepUpModalOpen(true)
          toast.error('Privileged action requires Super Admin re-authentication')
          return
        }
        throw new Error(json.error || 'Access forbidden')
      }

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to save configuration')
      }

      toast.success(isRotation ? 'All keys successfully rotated & persisted 🔄' : 'System configuration saved successfully 🚀')
      setShowRotateModal(false)
      setStepUpModalOpen(false)
      setStepUpPassword('')
    } catch (err: any) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleStepUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stepUpPassword) {
      toast.error('Please enter your admin password')
      return
    }

    try {
      setStepUpLoading(true)
      const res = await fetch('/api/admin/step-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: pendingSaveRotation ? 'credential_update' : 'price_change',
          credential: stepUpPassword,
          credential_type: 'password'
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Step-up verification failed')
      }

      toast.success('Admin verified! Applying changes...')
      setStepUpModalOpen(false)
      setStepUpPassword('')
      await handleSaveAll(pendingSaveRotation, data.token)
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed')
    } finally {
      setStepUpLoading(false)
    }
  }

  const handleRotateAll = () => {
    const keysToRotate = [
      'VAPI_PUBLIC_KEY', 'VAPI_PRIVATE_KEY', 'VAPI_WEBHOOK_SECRET',
      'DEEPGRAM_API_KEY', 'SARVAM_API_KEY', 'ELEVENLABS_API_KEY',
      'GEMINI_API_KEY', 'OPENAI_API_KEY', 'RAZORPAY_KEY_SECRET'
    ]

    const newConfigs = { ...configs }
    keysToRotate.forEach((key) => {
      const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
      newConfigs[key] = `rotated_${key.toLowerCase()}_${randomHex}`
    })

    setConfigs(newConfigs)
    handleSaveAll(true)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        <p className="text-xs">Loading system configuration secrets...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
            System Configuration
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Manage provider credentials, onboarding trials, platform pricing, and agent subscription limits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowRotateModal(true)}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Rotate All Keys
          </button>

          <button
            type="button"
            onClick={() => handleSaveAll(false)}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20 transition-all flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save All Changes
          </button>
        </div>
      </div>

      {/* Maintenance Mode Toggle */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-xl">
            <WrenchIcon className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Platform Maintenance Mode</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              When enabled, all non-admin users will be blocked from accessing the dashboard and shown a maintenance screen.
            </p>
          </div>
        </div>
        <button
          type="button"
          id="maintenance-mode-toggle"
          onClick={handleMaintenanceToggle}
          disabled={maintenanceSaving}
          className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${
            configs.maintenance_mode === 'true'
              ? 'bg-amber-500 border-amber-600'
              : 'bg-zinc-700 border-zinc-600'
          }`}
          aria-pressed={configs.maintenance_mode === 'true'}
          role="switch"
        >
          {maintenanceSaving ? (
            <span className="flex items-center justify-center h-full">
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
            </span>
          ) : (
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ${
                configs.maintenance_mode === 'true' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          )}
        </button>
      </div>

      {/* Grid containing configuration blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* TRIAL & DEMO SETTINGS */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-3 flex items-center gap-2">
            <Gift className="w-4 h-4 text-violet-400" />
            Trial & Demo Settings
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Free Demo Minutes</label>
                <input 
                  type="number"
                  value={configs.free_demo_minutes || ''}
                  onChange={(e) => handleChange('free_demo_minutes', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Trial Price (₹)</label>
                <input 
                  type="number"
                  value={displayRupees(configs.trial_price_paisa || '0')}
                  onChange={(e) => handleRupeeChange('trial_price_paisa', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Trial Duration (Days)</label>
                <input 
                  type="number"
                  value={configs.trial_days || ''}
                  onChange={(e) => handleChange('trial_days', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Trial Quota (Minutes)</label>
                <input 
                  type="number"
                  value={configs.trial_minutes || ''}
                  onChange={(e) => handleChange('trial_minutes', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Trial Max Agents</label>
                <input 
                  type="number"
                  value={configs.max_agents_trial || '2'}
                  onChange={(e) => handleChange('max_agents_trial', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Trial Assign Numbers</label>
                <select
                  value={configs.trial_can_assign_numbers || 'true'}
                  onChange={(e) => handleChange('trial_can_assign_numbers', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none cursor-pointer"
                >
                  <option value="true">Allowed (Can Buy & Assign)</option>
                  <option value="false">Web-Call Only</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* PLAN PRICING */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Plan Pricing & Minutes
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Starter Price (₹/mo)</label>
                <input 
                  type="number"
                  value={displayRupees(configs.starter_price_paisa || '0')}
                  onChange={(e) => handleRupeeChange('starter_price_paisa', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Starter Included Mins</label>
                <input 
                  type="number"
                  value={configs.starter_minutes || ''}
                  onChange={(e) => handleChange('starter_minutes', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pro Price (₹/mo)</label>
                <input 
                  type="number"
                  value={displayRupees(configs.professional_price_paisa || '0')}
                  onChange={(e) => handleRupeeChange('professional_price_paisa', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pro Included Mins</label>
                <input 
                  type="number"
                  value={configs.professional_minutes || ''}
                  onChange={(e) => handleChange('professional_minutes', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Enterprise Price (₹, 0 = Custom)</label>
                <input 
                  type="number"
                  value={displayRupees(configs.enterprise_price_paisa || '0')}
                  onChange={(e) => handleRupeeChange('enterprise_price_paisa', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Enterprise Included Mins</label>
                <input 
                  type="number"
                  value={configs.enterprise_minutes || ''}
                  onChange={(e) => handleChange('enterprise_minutes', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                  min="0"
                />
              </div>
            </div>

            {/* Onboarding Fee in Pricing Plan Editor */}
            <div className="pt-3 border-t border-zinc-900/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-violet-400" />
                  Onboarding Fee
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  configs.onboarding_fee_enabled === 'true'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {configs.onboarding_fee_enabled === 'true' ? 'Active' : 'Not Active (Waived)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Onboarding Fee Status</label>
                  <select
                    value={configs.onboarding_fee_enabled || 'false'}
                    onChange={(e) => handleChange('onboarding_fee_enabled', e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none cursor-pointer"
                  >
                    <option value="false">Disabled (Not active now)</option>
                    <option value="true">Enabled (Active)</option>
                  </select>
                  <span className="text-[9px] text-zinc-500 block">Admin toggle to enable/disable one-time setup fee.</span>
                </div>
                {configs.onboarding_fee_enabled === 'true' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Onboarding Fee Amount (₹)</label>
                    <input 
                      type="number"
                      value={displayRupees(configs.onboarding_fee_paisa || '0')}
                      onChange={(e) => handleRupeeChange('onboarding_fee_paisa', e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                      min="0"
                    />
                    <span className="text-[9px] text-zinc-500 block">One-time setup fee charged for new accounts.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* INTERNATIONAL (USD) PLAN PRICING */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400" />
            International (USD) Plan Pricing
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Global Starter Price ($/mo)</label>
                <input 
                  type="number"
                  value={displayDollars(configs.starter_price_usd_cents || '8900')}
                  onChange={(e) => handleDollarChange('starter_price_usd_cents', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-sky-500 outline-none"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Global Pro Price ($/mo)</label>
                <input 
                  type="number"
                  value={displayDollars(configs.professional_price_usd_cents || '24900')}
                  onChange={(e) => handleDollarChange('professional_price_usd_cents', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-sky-500 outline-none"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Global Enterprise ($/mo)</label>
                <input 
                  type="number"
                  value={displayDollars(configs.enterprise_price_usd_cents || '59900')}
                  onChange={(e) => handleDollarChange('enterprise_price_usd_cents', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-sky-500 outline-none"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Global Trial Price ($)</label>
                <input 
                  type="number"
                  value={displayDollars(configs.trial_price_usd_cents || '500')}
                  onChange={(e) => handleDollarChange('trial_price_usd_cents', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-sky-500 outline-none"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Foreign Number Cost ($/mo)</label>
                <input 
                  type="number"
                  value={displayDollars(configs.foreign_number_cost_usd_cents || '1500')}
                  onChange={(e) => handleDollarChange('foreign_number_cost_usd_cents', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-sky-500 outline-none"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Overage Rate ($/min)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={displayDollars(configs.overage_per_minute_usd_cents || '12')}
                  onChange={(e) => handleDollarChange('overage_per_minute_usd_cents', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-sky-500 outline-none"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* AGENT LIMITS */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Agent Creation Limits
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Free Tier</label>
              <input 
                type="number"
                value={configs.max_agents_free || ''}
                onChange={(e) => handleChange('max_agents_free', e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Trial Tier</label>
              <input 
                type="number"
                value={configs.max_agents_trial || '2'}
                onChange={(e) => handleChange('max_agents_trial', e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Starter Plan</label>
              <input 
                type="number"
                value={configs.max_agents_starter || ''}
                onChange={(e) => handleChange('max_agents_starter', e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pro Plan</label>
              <input 
                type="number"
                value={configs.max_agents_professional || ''}
                onChange={(e) => handleChange('max_agents_professional', e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* ADD-ONS */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-3 flex items-center gap-2">
            <Percent className="w-4 h-4 text-cyan-400" />
            Add-ons & Overages
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Phone Cost (₹/mo)</label>
              <input 
                type="number"
                value={displayRupees(configs.inbound_number_cost_paisa || '0')}
                onChange={(e) => handleRupeeChange('inbound_number_cost_paisa', e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Overage Rate (₹/min)</label>
              <input 
                type="number"
                step="0.5"
                value={displayRupees(configs.overage_per_minute_paisa || '1100')}
                onChange={(e) => handleRupeeChange('overage_per_minute_paisa', e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                min="0"
              />
              <span className="text-[9px] text-zinc-500 block">Recommended range: ₹10–₹12/min (default: ₹11/min). Final rate applied to billable overage minutes.</span>
            </div>
          </div>
        </div>

        {/* CREDIT-BASED PLANS */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-3 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            Credit-Based Plans
          </h2>

          <div className="space-y-4">
            <p className="text-xs text-zinc-400">
              Admin-editable per-minute credit pricing and prepaid wallet minimum top-up rules.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Credit Rate (₹/min)</label>
                <input 
                  type="number"
                  step="0.05"
                  value={displayRupees(configs.credit_per_minute_paisa || '150')}
                  onChange={(e) => handleRupeeChange('credit_per_minute_paisa', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Min Wallet Topup (₹)</label>
                <input 
                  type="number"
                  value={displayRupees(configs.wallet_min_topup_paisa || '50000')}
                  onChange={(e) => handleRupeeChange('wallet_min_topup_paisa', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* OUTCOME-BASED PLANS */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            Outcome-Based Plans
          </h2>

          <div className="space-y-4">
            <p className="text-xs text-zinc-400">
              Admin-editable pricing deducted from prepaid wallet upon successful business conversion.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Booked Appointment (₹)</label>
                <input 
                  type="number"
                  value={displayRupees(configs.outcome_appointment_paisa || '4900')}
                  onChange={(e) => handleRupeeChange('outcome_appointment_paisa', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Qualified Lead (₹)</label>
                <input 
                  type="number"
                  value={displayRupees(configs.outcome_lead_paisa || '2900')}
                  onChange={(e) => handleRupeeChange('outcome_lead_paisa', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* FREE EMERGENCY MINUTES */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-400" />
            Free Emergency Minutes & Reliability
          </h2>

          <div className="space-y-4">
            <p className="text-xs text-zinc-400">
              Overdraft buffer when quota reaches 100%. "Reliability Score" replaces credit score with transparent rules and zero mid-call disconnect.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Buffer Quota (Mins)</label>
                <input 
                  type="number"
                  value={configs.emergency_minutes_quota || '50'}
                  onChange={(e) => handleChange('emergency_minutes_quota', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-rose-500 outline-none"
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Min Reliability Score</label>
                <input 
                  type="number"
                  value={configs.emergency_minutes_min_reliability_score || '80'}
                  onChange={(e) => handleChange('emergency_minutes_min_reliability_score', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-rose-500 outline-none"
                  min="1"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cooldown (Days)</label>
                <input 
                  type="number"
                  value={configs.emergency_minutes_cooldown_days || '30'}
                  onChange={(e) => handleChange('emergency_minutes_cooldown_days', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-rose-500 outline-none"
                  min="1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SPEND LIMIT & ONBOARDING FEE */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-violet-400" />
            Spend Limits & Onboarding Fee
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Default Spend Limit (₹)</label>
                <input 
                  type="number"
                  value={displayRupees(configs.default_spend_limit_paisa || '250000')}
                  onChange={(e) => handleRupeeChange('default_spend_limit_paisa', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                  min="0"
                />
                <span className="text-[9px] text-zinc-500 block">Default ₹2,500. Admin can override per customer in Tenant Details.</span>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Onboarding Fee Status</label>
                <select
                  value={configs.onboarding_fee_enabled || 'false'}
                  onChange={(e) => handleChange('onboarding_fee_enabled', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none cursor-pointer"
                >
                  <option value="false">Disabled (Not active now)</option>
                  <option value="true">Enabled (Active)</option>
                </select>
                <span className="text-[9px] text-zinc-500 block">Toggle onboarding fee requirement for new signups.</span>
              </div>
            </div>

            {configs.onboarding_fee_enabled === 'true' && (
              <div className="space-y-2 pt-2 border-t border-zinc-900">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Onboarding Fee Amount (₹)</label>
                <input 
                  type="number"
                  value={displayRupees(configs.onboarding_fee_paisa || '0')}
                  onChange={(e) => handleRupeeChange('onboarding_fee_paisa', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                  min="0"
                />
              </div>
            )}
          </div>
        </div>

        {/* POOLED NUMBER LIMITS & LIFECYCLE */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-3 flex items-center gap-2">
            <Phone className="w-4 h-4 text-cyan-400" />
            Pooled Numbers & Lifecycle Policies
          </h2>

          <div className="space-y-4">
            <p className="text-xs text-zinc-400">
              Virtual number quota is pooled across customer accounts with automatic lifecycle management and inventory monitoring.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Max Pooled Numbers</label>
                <input 
                  type="number"
                  value={configs.max_pooled_numbers_per_org || '10'}
                  onChange={(e) => handleChange('max_pooled_numbers_per_org', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 outline-none"
                  min="1"
                />
                <span className="text-[9px] text-zinc-500 block">Shared organization pool. Zero per-number quota cap.</span>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Admin Hold Period (Days)</label>
                <input 
                  type="number"
                  value={configs.hold_period_days || '14'}
                  onChange={(e) => handleChange('hold_period_days', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 outline-none"
                  min="1"
                />
                <span className="text-[9px] text-zinc-500 block">Hold period following 15-day grace before pool release.</span>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Auto-Pool Alert Threshold</label>
                <input 
                  type="number"
                  value={configs.auto_pool_threshold || '10'}
                  onChange={(e) => handleChange('auto_pool_threshold', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 outline-none"
                  min="1"
                />
                <span className="text-[9px] text-zinc-500 block">Trigger replenishment alert when available pool drops below count.</span>
              </div>
            </div>
          </div>
        </div>

        {/* EUROPEAN (EUR) PLAN PRICING */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-3 flex items-center gap-2">
            <Euro className="w-4 h-4 text-blue-400" />
            European (EUR €) Plan Pricing
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Europe Starter Price (€/mo)</label>
                <input 
                  type="number"
                  value={displayEuros(configs.starter_price_eur_cents || '7900')}
                  onChange={(e) => handleEuroChange('starter_price_eur_cents', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Europe Pro Price (€/mo)</label>
                <input 
                  type="number"
                  value={displayEuros(configs.professional_price_eur_cents || '21900')}
                  onChange={(e) => handleEuroChange('professional_price_eur_cents', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Europe Enterprise (€/mo)</label>
                <input 
                  type="number"
                  value={displayEuros(configs.enterprise_price_eur_cents || '49900')}
                  onChange={(e) => handleEuroChange('enterprise_price_eur_cents', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Europe Trial Price (€)</label>
                <input 
                  type="number"
                  value={displayEuros(configs.trial_price_eur_cents || '400')}
                  onChange={(e) => handleEuroChange('trial_price_eur_cents', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Foreign Number Cost (€/mo)</label>
                <input 
                  type="number"
                  value={displayEuros(configs.foreign_number_cost_eur_cents || '1500')}
                  onChange={(e) => handleEuroChange('foreign_number_cost_eur_cents', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Overage Rate (€/min)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={displayEuros(configs.overage_per_minute_eur_cents || '11')}
                  onChange={(e) => handleEuroChange('overage_per_minute_eur_cents', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* API Keys Credentials Section */}
      <div className="space-y-4 pt-4 border-t border-zinc-800/80">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Key className="w-5 h-5 text-violet-400" />
          AI & Voice Provider Credentials
        </h2>

        <div className="grid grid-cols-1 gap-3">
          <ApiKeyManager
            label="Vapi Public Key"
            configKey="VAPI_PUBLIC_KEY"
            value={configs.VAPI_PUBLIC_KEY || ''}
            onChange={handleChange}
            onRotate={handleRotateSingle}
          />
          <ApiKeyManager
            label="Vapi Private Key"
            configKey="VAPI_PRIVATE_KEY"
            value={configs.VAPI_PRIVATE_KEY || ''}
            onChange={handleChange}
            onRotate={handleRotateSingle}
          />
          <ApiKeyManager
            label="Vapi Webhook Secret"
            configKey="VAPI_WEBHOOK_SECRET"
            value={configs.VAPI_WEBHOOK_SECRET || ''}
            onChange={handleChange}
            onRotate={handleRotateSingle}
          />
          <ApiKeyManager
            label="Deepgram API Key"
            configKey="DEEPGRAM_API_KEY"
            value={configs.DEEPGRAM_API_KEY || ''}
            onChange={handleChange}
            onRotate={handleRotateSingle}
          />
          <ApiKeyManager
            label="Sarvam AI API Key"
            configKey="SARVAM_API_KEY"
            value={configs.SARVAM_API_KEY || ''}
            onChange={handleChange}
            onRotate={handleRotateSingle}
          />
          <ApiKeyManager
            label="ElevenLabs API Key"
            configKey="ELEVENLABS_API_KEY"
            value={configs.ELEVENLABS_API_KEY || ''}
            onChange={handleChange}
            onRotate={handleRotateSingle}
          />
          <ApiKeyManager
            label="Gemini 2.0 Flash API Key"
            configKey="GEMINI_API_KEY"
            value={configs.GEMINI_API_KEY || ''}
            onChange={handleChange}
            onRotate={handleRotateSingle}
          />
          <ApiKeyManager
            label="OpenAI API Key"
            configKey="OPENAI_API_KEY"
            value={configs.OPENAI_API_KEY || ''}
            onChange={handleChange}
            onRotate={handleRotateSingle}
          />
        </div>
      </div>

      {/* Telegram Section */}
      <div className="space-y-4 pt-4 border-t border-zinc-800/80">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Send className="w-5 h-5 text-sky-400" />
          Telegram Notification Gateway
        </h2>

        <div className="grid grid-cols-1 gap-3">
          <ApiKeyManager
            label="Telegram Bot Token"
            configKey="TELEGRAM_BOT_TOKEN"
            value={configs.TELEGRAM_BOT_TOKEN || ''}
            onChange={handleChange}
          />
          <ApiKeyManager
            label="Default Alert Chat ID"
            configKey="TELEGRAM_CHAT_ID"
            value={configs.TELEGRAM_CHAT_ID || ''}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Payment Credentials */}
      <div className="space-y-4 pt-4 border-t border-zinc-800/80">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-400" />
          Razorpay Payment Gateway
        </h2>

        <div className="grid grid-cols-1 gap-3">
          <ApiKeyManager
            label="Razorpay Key ID"
            configKey="RAZORPAY_KEY_ID"
            value={configs.RAZORPAY_KEY_ID || ''}
            onChange={handleChange}
          />
          <ApiKeyManager
            label="Razorpay Key Secret"
            configKey="RAZORPAY_KEY_SECRET"
            value={configs.RAZORPAY_KEY_SECRET || ''}
            onChange={handleChange}
            onRotate={handleRotateSingle}
          />
        </div>
      </div>

      {/* Confirmation Rotate Modal */}
      {showRotateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">Rotate All API Keys?</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This action will generate new pseudo-tokens for all active integrations and immediately log the security event to audit logs.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRotateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRotateAll}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-zinc-950 hover:bg-amber-400"
              >
                Confirm Rotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step-Up Re-Authentication Modal (Master Plan Section 18.4 & 18.5) */}
      {stepUpModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-violet-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-violet-400">
              <Lock className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-white">Privileged Step-Up Auth</h3>
                <p className="text-xs text-zinc-400">Master Plan Section 18.4 Re-authentication</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Modifying commercial pricing plans or rotating live credentials is a high-security action. Enter your admin password to proceed.
            </p>

            <form onSubmit={handleStepUpSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Admin Password</label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={stepUpPassword}
                  onChange={(e) => setStepUpPassword(e.target.value)}
                  placeholder="Enter administrator password..."
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-violet-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={stepUpLoading}
                  onClick={() => {
                    setStepUpModalOpen(false)
                    setStepUpPassword('')
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={stepUpLoading || !stepUpPassword}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {stepUpLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Verify & Persist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
