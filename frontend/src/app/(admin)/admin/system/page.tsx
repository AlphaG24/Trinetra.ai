'use client'

import { useEffect, useState } from 'react'
import { ApiKeyManager } from '@/components/admin/ApiKeyManager'
import { 
  Sliders, Key, Send, CreditCard, RefreshCw, Save, Loader2, AlertTriangle,
  Gift, DollarSign, ShieldAlert, Cpu, Percent, WrenchIcon, Globe
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
    
    // Default values for billing & plan features
    free_demo_minutes: '10',
    trial_price_paisa: '9900',
    trial_days: '7',
    trial_minutes: '100',
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
    overage_per_minute_paisa: '200',
    maintenance_mode: 'false',

    // International (USD) plan pricing & numbers
    starter_price_usd_cents: '8900',
    professional_price_usd_cents: '24900',
    enterprise_price_usd_cents: '59900',
    trial_price_usd_cents: '500',
    foreign_number_cost_usd_cents: '1500',
    overage_per_minute_usd_cents: '12',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showRotateModal, setShowRotateModal] = useState(false)

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

  const handleRotateSingle = (key: string) => {
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    const rotatedVal = `rotated_${key.toLowerCase()}_${randomHex}`
    setConfigs((prev) => ({ ...prev, [key]: rotatedVal }))
    toast.success(`Rotated ${key}. Click "Save All Changes" to persist.`)
  }

  const handleSaveAll = async (isRotation = false) => {
    try {
      setSaving(true)
      const res = await fetch('/api/admin/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs, is_rotation: isRotation }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to save configuration')
      }

      toast.success(isRotation ? 'All keys successfully rotated & persisted 🔄' : 'System configuration saved successfully 🚀')
      setShowRotateModal(false)
    } catch (err: any) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
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
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Trial Included Minutes</label>
                <input 
                  type="number"
                  value={configs.trial_minutes || ''}
                  onChange={(e) => handleChange('trial_minutes', e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                  min="0"
                />
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Free Plan Limit</label>
              <input 
                type="number"
                value={configs.max_agents_free || ''}
                onChange={(e) => handleChange('max_agents_free', e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Starter Plan Limit</label>
              <input 
                type="number"
                value={configs.max_agents_starter || ''}
                onChange={(e) => handleChange('max_agents_starter', e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pro Plan Limit</label>
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
                value={displayRupees(configs.overage_per_minute_paisa || '0')}
                onChange={(e) => handleRupeeChange('overage_per_minute_paisa', e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                min="0"
              />
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
    </div>
  )
}
