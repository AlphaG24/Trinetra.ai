'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ApiKeyManager } from '@/src/components/admin/ApiKeyManager'
import { 
  Sliders, Key, Send, CreditCard, RefreshCw, Save, Loader2, AlertTriangle,
  Gift, DollarSign, ShieldAlert, CheckCircle2, Cpu, Percent, WrenchIcon, Globe, Lock,
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
    TELEPHONY_ROUTING_MODE: 'sarvam_managed', // 'sarvam_managed' (Sarvam AI Cloud) or 'custom_pipeline' (LiveKit / In-House)

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
      .channel('system_config_realtime_admin')
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

  // Maintenance mode toggle — auto-saves immediately with optimistic state & cross-tab broadcast
  const [maintenanceSaving, setMaintenanceSaving] = useState(false)

  const handleMaintenanceToggle = async () => {
    if (maintenanceSaving) return
    const newValue = configs.maintenance_mode === 'true' ? 'false' : 'true'
    
    // Instant optimistic UI update
    setConfigs((prev) => ({ ...prev, maintenance_mode: newValue }))
    setMaintenanceSaving(true)

    // Broadcast immediately across all open tabs
    if (typeof window !== 'undefined') {
      try {
        const bc = new BroadcastChannel('vaakriti_maintenance_channel')
        bc.postMessage({ maintenance_mode: newValue })
        bc.close()
      } catch {}
      window.dispatchEvent(new CustomEvent('vaakriti-maintenance-update', { detail: { maintenance_mode: newValue } }))
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

      const res = await fetch('/api/admin/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: { maintenance_mode: newValue } }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to save')
      }

      // Bust cache asynchronously without blocking the UI
      fetch(`/api/public/config?t=${Date.now()}&fresh=true`, { cache: 'no-store' }).catch(() => {})

      toast.success(
        newValue === 'true'
          ? '🔒 Maintenance mode ON — public visitors will see the maintenance screen'
          : '✅ Maintenance mode OFF — platform is live'
      )
    } catch (err: any) {
      // Revert on failure
      const reverted = newValue === 'true' ? 'false' : 'true'
      setConfigs((prev) => ({ ...prev, maintenance_mode: reverted }))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vaakriti-maintenance-update', { detail: { maintenance_mode: reverted } }))
      }
      toast.error(err.message || 'Failed to toggle maintenance mode')
    } finally {
      setMaintenanceSaving(false)
    }
  }

  // Telephony Voice Pipeline Toggle — Instant switch between Sarvam Cloud and In-House Custom Pipeline
  const [pipelineRoutingSaving, setPipelineRoutingSaving] = useState(false)

  const handleRoutingModeToggle = async () => {
    const isSarvamNow = (configs.TELEPHONY_ROUTING_MODE || 'sarvam_managed') === 'sarvam_managed'
    const newMode = isSarvamNow ? 'custom_pipeline' : 'sarvam_managed'
    setConfigs((prev) => ({ ...prev, TELEPHONY_ROUTING_MODE: newMode }))
    try {
      setPipelineRoutingSaving(true)
      const res = await fetch('/api/admin/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: { TELEPHONY_ROUTING_MODE: newMode } }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to update telephony routing mode')
      }
      toast.success(
        newMode === 'sarvam_managed'
          ? 'Standard Cloud Voice Pipeline is now ACTIVE'
          : '⚡ In-House Custom Voice Pipeline is now ACTIVE'
      )
    } catch (err: any) {
      // Revert on failure
      setConfigs((prev) => ({ ...prev, TELEPHONY_ROUTING_MODE: isSarvamNow ? 'sarvam_managed' : 'custom_pipeline' }))
      toast.error(err.message || 'Failed to toggle voice pipeline mode')
    } finally {
      setPipelineRoutingSaving(false)
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
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token

      const res = await fetch('/api/admin/step-up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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

      {/* Platform Maintenance Mode Control Card */}
      <div className={`border rounded-2xl p-6 transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm ${
        configs.maintenance_mode === 'true'
          ? 'bg-zinc-900 border-amber-500/40 ring-1 ring-amber-500/30'
          : 'bg-zinc-900/60 border-zinc-800'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 mt-0.5 border ${
            configs.maintenance_mode === 'true'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400'
          }`}>
            <WrenchIcon className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm font-bold text-white tracking-wide">
                Platform Maintenance Mode
              </h2>
              {configs.maintenance_mode === 'true' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                  Maintenance Active (Public Blocked)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live (Normal Access)
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
              {configs.maintenance_mode === 'true'
                ? 'Public visitors and regular users are currently shown the maintenance screen. Admins maintain full system access.'
                : 'Platform is operating normally. Toggle maintenance mode during scheduled system upgrades.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
          <button
            type="button"
            id="maintenance-mode-toggle"
            onClick={handleMaintenanceToggle}
            disabled={maintenanceSaving}
            className={`group px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
              configs.maintenance_mode === 'true'
                ? 'bg-white text-zinc-950 hover:bg-zinc-200 border border-white'
                : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
            }`}
          >
            {maintenanceSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                <span>Updating...</span>
              </>
            ) : configs.maintenance_mode === 'true' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Resume Live Platform</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Schedule Maintenance</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Voice Telephony Pipeline Controller (Sarvam Managed vs Custom In-House LiveKit Pipeline) */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-blue-600/15 border border-blue-500/20 rounded-xl text-blue-400 shrink-0 mt-0.5">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white font-montserrat tracking-wide">
                Voice Telephony Pipeline Routing
              </h2>
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md tracking-wider ${
                (configs.TELEPHONY_ROUTING_MODE || 'sarvam_managed') === 'sarvam_managed'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {(configs.TELEPHONY_ROUTING_MODE || 'sarvam_managed') === 'sarvam_managed' ? 'Standard Cloud Pipeline' : 'Custom In-House Pipeline'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              {(configs.TELEPHONY_ROUTING_MODE || 'sarvam_managed') === 'sarvam_managed'
                ? 'Outbound & inbound voice calls route through the managed cloud telephony infrastructure. Custom voice cloning is locked in this mode. Switch to Custom Pipeline to enable custom voice cloning.'
                : 'Calls route through your in-house custom pipeline with custom voice cloning and custom synthesis unlocked. Switch to Standard Cloud Pipeline to resume managed cloud routing.'}
            </p>
          </div>
        </div>

        {/* Action Toggle Button */}
        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={handleRoutingModeToggle}
            disabled={pipelineRoutingSaving}
            className={`px-4 py-2.5 rounded-xl text-xs font-montserrat font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border shadow-sm ${
              (configs.TELEPHONY_ROUTING_MODE || 'sarvam_managed') === 'sarvam_managed'
                ? 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700 hover:border-zinc-600'
                : 'bg-white hover:bg-zinc-100 text-zinc-950 border-white shadow-md'
            }`}
          >
            {pipelineRoutingSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Cpu className="w-3.5 h-3.5" />
            )}
            <span>
              {(configs.TELEPHONY_ROUTING_MODE || 'sarvam_managed') === 'sarvam_managed'
                ? 'Switch to Custom Pipeline'
                : 'Switch to Standard Cloud'}
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Settings Centralized in /admin/plans */}
      <div className="bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-violet-600/5 border border-violet-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-600/15 rounded-xl text-violet-600 dark:text-violet-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--heading)]">
              Pricing Plans, Trial Packages & Overdraft Centralized
            </h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              All subscription catalogs, ₹99 trial settings, per-minute credits, outcome rates, and emergency buffers are now managed in the dedicated Pricing Plans console.
            </p>
          </div>
        </div>
        <Link
          href="/admin/plans"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition shadow-sm shrink-0"
        >
          Open Pricing Plans &rarr;
        </Link>
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
