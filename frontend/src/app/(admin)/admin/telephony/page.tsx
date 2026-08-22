'use client'

import { useEffect, useState } from 'react'
import { 
  PhoneCall, Settings, DollarSign, Package, 
  Eye, EyeOff, Loader2, Save, RefreshCw, Activity,
  ServerCrash
} from 'lucide-react'
import toast from 'react-hot-toast'

type Tab = 'setup' | 'pricing' | 'inventory'

type Configs = {
  VOICELINK_API_KEY: string
  VOICELINK_API_BASE_URL: string
  TWILIO_ACCOUNT_SID: string
  TWILIO_AUTH_TOKEN: string
  TRINETRA_WEBHOOK_BASE_URL: string
  voicelink_mobile_did_cost_paisa: string
  voicelink_landline_did_cost_paisa: string
  voicelink_tollfree_did_cost_paisa: string
  voicelink_92series_did_cost_paisa: string
  twilio_US_local_cost_paisa: string
  twilio_UK_local_cost_paisa: string
  twilio_IN_mobile_cost_paisa: string
  trinetra_number_markup_percent: string
  show_number_prices_to_users: string
  max_phone_numbers_per_org: string
}

export default function AdminTelephonyPage() {
  const [activeTab, setActiveTab] = useState<Tab>('setup')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [configs, setConfigs] = useState<Configs>({
    VOICELINK_API_KEY: '',
    VOICELINK_API_BASE_URL: '',
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    TRINETRA_WEBHOOK_BASE_URL: '',
    voicelink_mobile_did_cost_paisa: '0',
    voicelink_landline_did_cost_paisa: '0',
    voicelink_tollfree_did_cost_paisa: '0',
    voicelink_92series_did_cost_paisa: '0',
    twilio_US_local_cost_paisa: '0',
    twilio_UK_local_cost_paisa: '0',
    twilio_IN_mobile_cost_paisa: '0',
    trinetra_number_markup_percent: '20',
    show_number_prices_to_users: 'false',
    max_phone_numbers_per_org: '10'
  })
  
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({})
  const [inventory, setInventory] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [activityLoading, setActivityLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  
  useEffect(() => {
    loadConfigs()
  }, [])
  
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    if (activeTab === 'inventory') {
      loadInventory()
      loadActivity()
    }
  }, [activeTab])

  async function loadConfigs() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/telephony/config')
      if (res.status === 403) {
        toast.error('Super Admin access required')
        return
      }
      if (!res.ok) throw new Error('Failed to load configurations')
      const data = await res.json()
      if (data.success && data.data?.configs) {
        setConfigs(prev => ({ ...prev, ...data.data.configs }))
        setIsDirty(false)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading configurations')
    } finally {
      setLoading(false)
    }
  }

  async function loadInventory() {
    try {
      setInventoryLoading(true)
      const res = await fetch('/api/admin/telephony/inventory')
      const data = await res.json()
      if (data.success) {
        setInventory(data.data.numbers)
      }
    } catch (e) {
      toast.error('Failed to load inventory')
    } finally {
      setInventoryLoading(false)
    }
  }
  
  async function loadActivity() {
    try {
      setActivityLoading(true)
      const res = await fetch('/api/admin/telephony/activity?limit=10')
      const data = await res.json()
      if (data.success) {
        setActivity(data.data.activity)
      }
    } catch (e) {
      toast.error('Failed to load activity')
    } finally {
      setActivityLoading(false)
    }
  }

  async function exportActivityCsv() {
    try {
      setExporting(true)
      const res = await fetch('/api/admin/telephony/activity?format=csv')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `telephony-activity-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      toast.error('Failed to export CSV')
    } finally {
      setExporting(false)
    }
  }

  const handleChange = (key: keyof Configs, value: string) => {
    setConfigs(prev => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }
  
  const handleRupeeChange = (key: keyof Configs, rupeeValueStr: string) => {
    const rupees = parseFloat(rupeeValueStr || '0')
    const paisa = isNaN(rupees) ? 0 : Math.round(rupees * 100)
    handleChange(key, String(paisa))
  }
  
  const displayRupees = (paisaStr: string) => {
    const paisa = parseInt(paisaStr || '0', 10)
    return isNaN(paisa) ? 0 : paisa / 100
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/admin/telephony/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save configuration')
      }
      toast.success('Configuration saved successfully')
      setIsDirty(false)
      loadConfigs() // reload to get masked versions
    } catch (err: any) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async (provider: string) => {
    try {
      setTestStatus(prev => ({ ...prev, [provider]: 'testing' }))
      
      const payload: any = { provider }
      
      // If dirty, send the modified keys to test them without saving first
      if (isDirty) {
        if (provider === 'voicelink') {
          payload.api_key = configs.VOICELINK_API_KEY
          payload.base_url = configs.VOICELINK_API_BASE_URL
        } else if (provider === 'twilio') {
          payload.account_sid = configs.TWILIO_ACCOUNT_SID
          payload.auth_token = configs.TWILIO_AUTH_TOKEN
        }
      }
      
      const res = await fetch('/api/admin/telephony/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      if (data.success) {
        setTestStatus(prev => ({ ...prev, [provider]: 'success' }))
        toast.success(`Connected to ${provider} (${data.details?.response_time_ms}ms)`)
        setTimeout(() => setTestStatus(prev => ({ ...prev, [provider]: 'idle' })), 3000)
      } else {
        setTestStatus(prev => ({ ...prev, [provider]: 'error' }))
        toast.error(`Test failed: ${data.error || data.message}`)
        setTimeout(() => setTestStatus(prev => ({ ...prev, [provider]: 'idle' })), 5000)
      }
    } catch (e: any) {
      setTestStatus(prev => ({ ...prev, [provider]: 'error' }))
      toast.error(`Test failed: ${e.message}`)
      setTimeout(() => setTestStatus(prev => ({ ...prev, [provider]: 'idle' })), 5000)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-[var(--muted)]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Loading telephony configuration...</p>
      </div>
    )
  }
  
  const calcRetail = (paisaStr: string) => {
    const cost = parseInt(paisaStr || '0', 10)
    const markup = parseFloat(configs.trinetra_number_markup_percent || '0')
    const retail = Math.round(cost * (1 + markup / 100))
    return (retail / 100).toFixed(2)
  }

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--heading)] font-[family-name:var(--font-playfair)]">
          Telephony Configuration
        </h1>
        <p className="text-[var(--muted)] text-sm mt-2 font-[family-name:var(--font-montserrat)]">
          Manage phone number providers, pricing, and inventory
        </p>
        
        <div className="flex items-center gap-4 mt-6">
          <div className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--border)] px-3 py-1.5 rounded-lg text-xs">
            <span className={`w-2 h-2 rounded-full ${configs.VOICELINK_API_KEY && !configs.VOICELINK_API_KEY.startsWith('•') || configs.VOICELINK_API_KEY.startsWith('•') ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            <span className="text-[var(--heading)] font-semibold">VoiceLink</span>
          </div>
          <div className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--border)] px-3 py-1.5 rounded-lg text-xs">
            <span className={`w-2 h-2 rounded-full ${configs.TWILIO_ACCOUNT_SID && !configs.TWILIO_ACCOUNT_SID.startsWith('•') || configs.TWILIO_ACCOUNT_SID.startsWith('•') ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            <span className="text-[var(--heading)] font-semibold">Twilio</span>
          </div>
          <div className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--border)] px-3 py-1.5 rounded-lg text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-[var(--heading)] font-semibold">Simulated (Dev)</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] overflow-x-auto no-scrollbar">
        {[
          { id: 'setup', label: 'Provider Setup', icon: Settings },
          { id: 'pricing', label: 'Pricing & Limits', icon: DollarSign },
          { id: 'inventory', label: 'Inventory & Activity', icon: Package }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as Tab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap
              ${activeTab === t.id 
                ? 'border-[var(--primary-bg)] text-[var(--heading)] bg-[var(--primary-bg)]/10' 
                : 'border-transparent text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--card-bg)]/50'
              }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SETUP */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          {/* VoiceLink */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-[var(--border)] pb-3">
              <h2 className="text-lg font-bold text-[var(--heading)] font-[family-name:var(--font-montserrat)]">VoiceLink</h2>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">Indian Numbers</span>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">API Key</label>
                <div className="relative">
                  <input 
                    type={showKey['vl_key'] ? 'text' : 'password'}
                    value={configs.VOICELINK_API_KEY}
                    onChange={(e) => handleChange('VOICELINK_API_KEY', e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg pl-3 pr-10 py-2.5 text-sm text-[var(--heading)] focus:border-[var(--primary-bg)] outline-none transition-colors"
                  />
                  <button type="button" onClick={() => setShowKey(p => ({...p, vl_key: !p.vl_key}))} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--heading)]">
                    {showKey['vl_key'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">API Base URL</label>
                <input 
                  type="url"
                  placeholder="https://api.voicelink.in/v1"
                  value={configs.VOICELINK_API_BASE_URL}
                  onChange={(e) => handleChange('VOICELINK_API_BASE_URL', e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--heading)] focus:border-[var(--primary-bg)] outline-none transition-colors"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleTestConnection('voicelink')}
                disabled={testStatus['voicelink'] === 'testing'}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-[var(--secondary)] border border-[var(--border)] hover:bg-[var(--border)] text-[var(--heading)] transition-all flex items-center gap-2"
              >
                {testStatus['voicelink'] === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                {testStatus['voicelink'] === 'success' ? 'Connected ✅' : testStatus['voicelink'] === 'error' ? 'Failed ❌' : 'Test Connection'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-[var(--primary-bg)] hover:brightness-110 text-[var(--heading)] transition-all flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save VoiceLink
              </button>
            </div>
          </div>

          {/* Twilio */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-[var(--border)] pb-3">
              <h2 className="text-lg font-bold text-[var(--heading)] font-[family-name:var(--font-montserrat)]">Twilio</h2>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20">International Numbers</span>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Account SID</label>
                <div className="relative">
                  <input 
                    type={showKey['tw_sid'] ? 'text' : 'password'}
                    value={configs.TWILIO_ACCOUNT_SID}
                    onChange={(e) => handleChange('TWILIO_ACCOUNT_SID', e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg pl-3 pr-10 py-2.5 text-sm text-[var(--heading)] focus:border-[var(--primary-bg)] outline-none transition-colors"
                  />
                  <button type="button" onClick={() => setShowKey(p => ({...p, tw_sid: !p.tw_sid}))} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--heading)]">
                    {showKey['tw_sid'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Auth Token</label>
                <div className="relative">
                  <input 
                    type={showKey['tw_auth'] ? 'text' : 'password'}
                    value={configs.TWILIO_AUTH_TOKEN}
                    onChange={(e) => handleChange('TWILIO_AUTH_TOKEN', e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg pl-3 pr-10 py-2.5 text-sm text-[var(--heading)] focus:border-[var(--primary-bg)] outline-none transition-colors"
                  />
                  <button type="button" onClick={() => setShowKey(p => ({...p, tw_auth: !p.tw_auth}))} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--heading)]">
                    {showKey['tw_auth'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleTestConnection('twilio')}
                disabled={testStatus['twilio'] === 'testing'}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-[var(--secondary)] border border-[var(--border)] hover:bg-[var(--border)] text-[var(--heading)] transition-all flex items-center gap-2"
              >
                {testStatus['twilio'] === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                {testStatus['twilio'] === 'success' ? 'Connected ✅' : testStatus['twilio'] === 'error' ? 'Failed ❌' : 'Test Connection'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-[var(--primary-bg)] hover:brightness-110 text-[var(--heading)] transition-all flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Twilio
              </button>
            </div>
          </div>

          {/* Webhook Configuration */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-[var(--heading)] font-[family-name:var(--font-montserrat)] border-b border-[var(--border)] pb-3">Global Webhook URL</h2>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Trinetra Webhook Base URL</label>
              <input 
                type="url"
                placeholder="https://api.trinetraedu-ai.com"
                value={configs.TRINETRA_WEBHOOK_BASE_URL}
                onChange={(e) => handleChange('TRINETRA_WEBHOOK_BASE_URL', e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--heading)] focus:border-[var(--primary-bg)] outline-none transition-colors"
              />
              <p className="text-xs text-[var(--muted)] mt-1">Used for incoming call webhooks across all providers.</p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-[var(--primary-bg)] hover:brightness-110 text-[var(--heading)] transition-all flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Webhook URL
            </button>
          </div>

          {/* Simulated */}
          <div className="bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-6 space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-[var(--heading)] font-[family-name:var(--font-montserrat)]">Simulated Provider</h2>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20">Development</span>
            </div>
            <p className="text-sm text-[var(--muted)]">Used for local development and testing. No API keys required. Generates fake Indian numbers with 5% random failure rate for error handling testing.</p>
          </div>
        </div>
      )}

      {/* TAB 2: PRICING */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Markup & Limits */}
            <div className="space-y-6">
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[var(--heading)] font-[family-name:var(--font-montserrat)] border-b border-[var(--border)] pb-3">Trinetra Markup</h2>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Markup Percentage (%)</label>
                  <input 
                    type="number"
                    step="0.5"
                    min="0"
                    value={configs.trinetra_number_markup_percent}
                    onChange={(e) => handleChange('trinetra_number_markup_percent', e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--heading)] focus:border-[var(--primary-bg)] outline-none"
                  />
                </div>
                
                {parseFloat(configs.trinetra_number_markup_percent) > 100 && (
                  <p className="text-xs text-amber-400">High markup — this may affect competitiveness</p>
                )}
                {parseFloat(configs.trinetra_number_markup_percent) < 0 && (
                  <p className="text-xs text-red-400">Negative markup — selling below cost</p>
                )}
                {parseFloat(configs.trinetra_number_markup_percent) === 0 && (
                  <p className="text-xs text-sky-400">Zero markup — selling at cost</p>
                )}

                <div className="mt-4 p-4 bg-[var(--background)] border border-[var(--border)] rounded-lg">
                  <p className="text-xs font-semibold text-[var(--muted)] mb-2">Example: VoiceLink Mobile DID</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted)]">Cost: ₹{displayRupees(configs.voicelink_mobile_did_cost_paisa).toFixed(2)}</span>
                    <span className="text-[var(--primary-bg)] font-bold">+{configs.trinetra_number_markup_percent}%</span>
                    <span className="text-[var(--heading)] font-bold">Retail: ₹{calcRetail(configs.voicelink_mobile_did_cost_paisa)}/mo</span>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[var(--heading)] font-[family-name:var(--font-montserrat)] border-b border-[var(--border)] pb-3">Display Settings</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--heading)]">Show prices to users</p>
                    <p className="text-xs text-[var(--muted)] mt-1">When disabled, users won't see specific pricing.</p>
                  </div>
                  <button 
                    role="switch" 
                    aria-checked={configs.show_number_prices_to_users === 'true'}
                    onClick={() => handleChange('show_number_prices_to_users', configs.show_number_prices_to_users === 'true' ? 'false' : 'true')}
                    className={`relative w-12 h-6 rounded-full transition-colors ${configs.show_number_prices_to_users === 'true' ? 'bg-[var(--primary-bg)]' : 'bg-[var(--muted)]/50'}`}
                  >
                    <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${configs.show_number_prices_to_users === 'true' ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-center">
                  Users currently see: <span className="font-bold text-[var(--heading)]">{configs.show_number_prices_to_users === 'true' ? `₹${calcRetail(configs.voicelink_mobile_did_cost_paisa)}/month` : 'Billed monthly'}</span>
                </div>
              </div>

              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[var(--heading)] font-[family-name:var(--font-montserrat)] border-b border-[var(--border)] pb-3">Organization Limits</h2>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Maximum phone numbers per organization</label>
                  <input 
                    type="number"
                    min="1"
                    value={configs.max_phone_numbers_per_org}
                    onChange={(e) => handleChange('max_phone_numbers_per_org', e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--heading)] focus:border-[var(--primary-bg)] outline-none"
                  />
                  <p className="text-xs text-[var(--muted)] mt-1">Organizations exceeding this limit will see an upgrade prompt.</p>
                </div>
              </div>
            </div>

            {/* Provider Pricing Tables */}
            <div className="space-y-6">
              {/* VoiceLink Table */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-[var(--border)]">
                  <h2 className="font-bold text-[var(--heading)]">VoiceLink DID Costs</h2>
                  <p className="text-xs text-[var(--muted)]">Cost Price to Trinetra</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[var(--background)] text-[var(--muted)] text-xs uppercase">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-semibold">DID Type</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Cost (₹/mo)</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Retail (₹/mo)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {[
                        { type: 'Mobile', key: 'voicelink_mobile_did_cost_paisa' },
                        { type: 'Landline', key: 'voicelink_landline_did_cost_paisa' },
                        { type: 'Toll-Free', key: 'voicelink_tollfree_did_cost_paisa' },
                        { type: '92 Series', key: 'voicelink_92series_did_cost_paisa' }
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-[var(--background)]/50 transition-colors text-[var(--heading)]">
                          <td className="px-4 py-3 font-medium">{row.type}</td>
                          <td className="px-4 py-2">
                            <input 
                              type="number"
                              step="0.01"
                              min="0"
                              value={displayRupees(configs[row.key as keyof Configs]) || ''}
                              onChange={(e) => handleRupeeChange(row.key as keyof Configs, e.target.value)}
                              className="w-24 bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-sm outline-none focus:border-[var(--primary-bg)]"
                            />
                          </td>
                          <td className="px-4 py-2 bg-[var(--secondary)]/30 font-semibold text-[var(--muted)]">
                            ₹{calcRetail(configs[row.key as keyof Configs])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Twilio Table */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-[var(--border)]">
                  <h2 className="font-bold text-[var(--heading)]">Twilio DID Costs</h2>
                  <p className="text-xs text-[var(--muted)]">Cost Price to Trinetra</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[var(--background)] text-[var(--muted)] text-xs uppercase">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-semibold">Country & Type</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Cost (₹/mo)</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Retail (₹/mo)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {[
                        { type: 'US Local', key: 'twilio_US_local_cost_paisa' },
                        { type: 'UK Local', key: 'twilio_UK_local_cost_paisa' },
                        { type: 'IN Mobile', key: 'twilio_IN_mobile_cost_paisa' }
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-[var(--background)]/50 transition-colors text-[var(--heading)]">
                          <td className="px-4 py-3 font-medium">{row.type}</td>
                          <td className="px-4 py-2">
                            <input 
                              type="number"
                              step="0.01"
                              min="0"
                              value={displayRupees(configs[row.key as keyof Configs]) || ''}
                              onChange={(e) => handleRupeeChange(row.key as keyof Configs, e.target.value)}
                              className="w-24 bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-sm outline-none focus:border-[var(--primary-bg)]"
                            />
                          </td>
                          <td className="px-4 py-2 bg-[var(--secondary)]/30 font-semibold text-[var(--muted)]">
                            ₹{calcRetail(configs[row.key as keyof Configs])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="w-full py-3 rounded-xl font-bold bg-[var(--primary-bg)] hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100 text-[var(--heading)] transition-all flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Pricing Configuration
          </button>
        </div>
      )}

      {/* TAB 3: INVENTORY & ACTIVITY */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Inventory Table */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="font-bold text-[var(--heading)]">Purchased DIDs Inventory</h2>
                <p className="text-xs text-[var(--muted)]">Active and released phone numbers</p>
              </div>
              <button 
                onClick={loadInventory}
                disabled={inventoryLoading}
                className="p-2 text-[var(--muted)] hover:text-[var(--heading)] bg-[var(--background)] rounded-lg border border-[var(--border)]"
              >
                <RefreshCw className={`w-4 h-4 ${inventoryLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-sm text-left">
                <thead className="bg-[var(--background)] text-[var(--muted)] text-xs uppercase sticky top-0 shadow-sm">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Number</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Provider & Type</th>
                    <th scope="col" className="px-4 py-3 font-semibold">City</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Organization</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {inventory.length === 0 && !inventoryLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">No numbers found in inventory</td>
                    </tr>
                  )}
                  {inventory.map((item, i) => (
                    <tr key={i} className="hover:bg-[var(--background)]/50 text-[var(--heading)]">
                      <td className="px-4 py-3 font-medium">{item.phone_number}</td>
                      <td className="px-4 py-3">
                        <div className="capitalize">{item.provider}</div>
                        <div className="text-[10px] text-[var(--muted)] capitalize">{item.did_type}</div>
                      </td>
                      <td className="px-4 py-3">{item.city || '-'}</td>
                      <td className="px-4 py-3">{item.organizations?.name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border
                          ${item.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                            item.status === 'provisioning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                            'bg-[var(--muted)]/10 text-[var(--muted)] border-[var(--border)]'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'active' ? 'bg-emerald-500' : item.status === 'provisioning' ? 'bg-amber-500' : 'bg-[var(--muted)]'}`}></span>
                          <span className="capitalize">{item.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-bold text-[var(--heading)]">Recent Provisioning Activity</h2>
                <p className="text-xs text-[var(--muted)]">Latest changes to phone number pool</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={loadActivity}
                  disabled={activityLoading}
                  className="p-2 text-[var(--muted)] hover:text-[var(--heading)] bg-[var(--background)] rounded-lg border border-[var(--border)]"
                >
                  <RefreshCw className={`w-4 h-4 ${activityLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={exportActivityCsv}
                  disabled={exporting}
                  className="px-3 py-1.5 text-xs font-semibold text-[var(--heading)] bg-[var(--background)] rounded-lg border border-[var(--border)] hover:bg-[var(--border)] flex items-center gap-2"
                >
                  {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Export CSV
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[var(--background)] text-[var(--muted)] text-xs uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Organization</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Number</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Provider</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {activity.length === 0 && !activityLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">No recent activity</td>
                    </tr>
                  )}
                  {activity.map((item, i) => (
                    <tr key={i} className="hover:bg-[var(--background)]/50 text-[var(--heading)]">
                      <td className="px-4 py-3 text-xs text-[var(--muted)]">{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}</td>
                      <td className="px-4 py-3">{item.organizations?.name || '-'}</td>
                      <td className="px-4 py-3 font-medium">{item.phone_number}</td>
                      <td className="px-4 py-3 capitalize">{item.provider}</td>
                      <td className="px-4 py-3 capitalize text-xs">
                        <span className={
                          item.status === 'active' ? 'text-emerald-400' :
                          item.status === 'released' ? 'text-[var(--muted)]' : 'text-red-400'
                        }>{item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
