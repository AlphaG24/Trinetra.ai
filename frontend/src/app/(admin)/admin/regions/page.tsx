'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Globe2,
  Clock,
  Shield,
  FileCheck,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  PhoneCall,
  Sliders,
  History
} from 'lucide-react'
import toast from 'react-hot-toast'

interface RegionConfig {
  region_code: string
  name: string
  dial_prefixes: string[]
  kyc_documents: string[]
  raw_aadhaar_prohibited?: boolean
  dnd_scrub_required: boolean
  dnd_regulation: string
  calling_hours: {
    start: string
    end: string
    window_str?: string
    timezone_default: string
  }
  recording_consent: {
    rule: string
    type: string
    requires_explicit_opt_in: boolean
    statutory_notice: string
    two_party_states?: string[]
  }
  lifecycle: {
    grace_period_days: number
    hold_period_days: number
    cooling_period_days: number
    unavailable_message: string
  }
  retention?: {
    billing_statutory_years: number
    deals_retention_days_default: number
  }
  statutory_note?: string
}

const REGION_TABS = [
  { code: 'IN', label: 'India (Launch)', flag: '🇮🇳' },
  { code: 'US', label: 'United States', flag: '🇺🇸' },
  { code: 'EU', label: 'European Union / UK', flag: '🇪🇺' },
  { code: 'ME', label: 'Middle East', flag: '🇦🇪' },
  { code: 'SEA', label: 'Southeast Asia', flag: '🇸🇬' },
]

export default function RegionConfigEditorPage() {
  const [activeTab, setActiveTab] = useState<string>('IN')
  const [regions, setRegions] = useState<Record<string, RegionConfig>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)

  // Editable local state for the active region
  const [callingStart, setCallingStart] = useState<string>('09:00')
  const [callingEnd, setCallingEnd] = useState<string>('21:00')
  const [timezoneDefault, setTimezoneDefault] = useState<string>('Asia/Kolkata')
  const [coolingPeriodDays, setCoolingPeriodDays] = useState<number>(0)
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(15)
  const [holdPeriodDays, setHoldPeriodDays] = useState<number>(14)
  const [dndRegulation, setDndRegulation] = useState<string>('')
  const [dndScrubRequired, setDndScrubRequired] = useState<boolean>(true)
  const [kycDocs, setKycDocs] = useState<string[]>([])
  const [newKycDoc, setNewKycDoc] = useState<string>('')
  const [statutoryNotice, setStatutoryNotice] = useState<string>('')
  const [consentType, setConsentType] = useState<string>('')

  const fetchRegions = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/regions')
      if (!res.ok) throw new Error('Failed to load regions')
      const data = await res.json()
      if (data.regions) {
        setRegions(data.regions)
      }
    } catch (err: any) {
      toast.error('Error fetching regional configuration: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRegions()
  }, [fetchRegions])

  // Sync active region values to local form fields
  useEffect(() => {
    const cur = regions[activeTab]
    if (cur) {
      setCallingStart(cur.calling_hours?.start || '09:00')
      setCallingEnd(cur.calling_hours?.end || '21:00')
      setTimezoneDefault(cur.calling_hours?.timezone_default || 'UTC')
      setCoolingPeriodDays(cur.lifecycle?.cooling_period_days ?? 0)
      setGracePeriodDays(cur.lifecycle?.grace_period_days ?? 15)
      setHoldPeriodDays(cur.lifecycle?.hold_period_days ?? 14)
      setDndRegulation(cur.dnd_regulation || '')
      setDndScrubRequired(cur.dnd_scrub_required ?? true)
      setKycDocs(cur.kyc_documents || [])
      setStatutoryNotice(cur.recording_consent?.statutory_notice || '')
      setConsentType(cur.recording_consent?.type || 'audible_disclosure')
    }
  }, [activeTab, regions])

  const handleAddKycDoc = () => {
    const clean = newKycDoc.trim().toLowerCase().replace(/\s+/g, '_')
    if (clean && !kycDocs.includes(clean)) {
      setKycDocs([...kycDocs, clean])
      setNewKycDoc('')
    }
  }

  const handleRemoveKycDoc = (doc: string) => {
    setKycDocs(kycDocs.filter(d => d !== doc))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const updates = {
        calling_hours: {
          start: callingStart,
          end: callingEnd,
          timezone_default: timezoneDefault,
        },
        lifecycle: {
          cooling_period_days: Number(coolingPeriodDays),
          grace_period_days: Number(gracePeriodDays),
          hold_period_days: Number(holdPeriodDays),
        },
        dnd_regulation: dndRegulation,
        dnd_scrub_required: dndScrubRequired,
        kyc_documents: kycDocs,
        recording_consent: {
          type: consentType,
          statutory_notice: statutoryNotice,
        }
      }

      const res = await fetch('/api/admin/regions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region_code: activeTab,
          updates
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to update region')
      }

      const data = await res.json()
      toast.success(`Regional rules for ${activeTab} updated successfully! 🌐`)

      // Update in local state
      setRegions(prev => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          ...updates,
          calling_hours: {
            ...prev[activeTab]?.calling_hours,
            ...updates.calling_hours,
            window_str: `${callingStart}–${callingEnd} ${timezoneDefault}`
          },
          lifecycle: {
            ...prev[activeTab]?.lifecycle,
            ...updates.lifecycle
          },
          recording_consent: {
            ...prev[activeTab]?.recording_consent,
            ...updates.recording_consent
          }
        }
      }))
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const activeRegion = regions[activeTab]

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-[var(--heading)] font-playfair">
              Regional Compliance Rules
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-playfair">
              Rule of Law
            </span>
          </div>
          <p className="text-[var(--muted)] text-sm mt-1 font-merriweather">
            Configure statutory DND hours, cooling periods, and required KYC document types per jurisdiction.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRegions()}
            className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] transition shadow-2xs"
            title="Refresh rules"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-xs transition shadow-sm font-playfair hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Region Rules'}
          </button>
        </div>
      </div>

      {/* Region Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[var(--border)] custom-scrollbar">
        {REGION_TABS.map((tab) => (
          <button
            key={tab.code}
            onClick={() => setActiveTab(tab.code)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap font-playfair ${
              activeTab === tab.code
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
            }`}
          >
            <span>{tab.flag}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />
          <div className="h-64 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />
        </div>
      ) : !activeRegion ? (
        <div className="p-12 text-center rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] text-[var(--muted)] text-xs font-merriweather shadow-xs">
          Loading regional rules for {activeTab}...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 1: Calling Hours & DND Scrubbing */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--heading)] uppercase tracking-wider flex items-center gap-2 font-playfair">
                <Clock className="w-4 h-4 text-sky-500" />
                Calling Hours & DND Regulation
              </h3>
              <span className="text-[10px] font-mono text-[var(--muted)] uppercase">
                Prefixes: {activeRegion.dial_prefixes?.join(', ')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[var(--heading)] block mb-1 font-playfair">
                  DND Window Start
                </label>
                <input
                  type="time"
                  value={callingStart}
                  onChange={(e) => setCallingStart(e.target.value)}
                  className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--heading)] block mb-1 font-playfair">
                  DND Window End
                </label>
                <input
                  type="time"
                  value={callingEnd}
                  onChange={(e) => setCallingEnd(e.target.value)}
                  className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--heading)] block mb-1 font-playfair">
                Timezone Default
              </label>
              <input
                type="text"
                value={timezoneDefault}
                onChange={(e) => setTimezoneDefault(e.target.value)}
                className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--heading)] block mb-1 font-playfair">
                Statutory DND Regulation
              </label>
              <input
                type="text"
                value={dndRegulation}
                onChange={(e) => setDndRegulation(e.target.value)}
                placeholder="e.g. TRAI TCCCPR 2018 Regulation 12"
                className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-sky-500 font-merriweather"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--body)] font-merriweather">
                <input
                  type="checkbox"
                  checked={dndScrubRequired}
                  onChange={(e) => setDndScrubRequired(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border)] bg-[var(--card-bg)] text-sky-500 focus:ring-0"
                />
                Mandatory National Do-Not-Disturb (DND) scrub before dial
              </label>
            </div>
          </div>

          {/* Section 2: Lifecycle & Cooling Period */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--heading)] uppercase tracking-wider flex items-center gap-2 font-playfair">
                <Sliders className="w-4 h-4 text-emerald-500" />
                Lifecycle & Cooling Periods
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-playfair">
                Section 3 Rules
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[var(--heading)] font-playfair">
                    Cooling Period (Days)
                  </label>
                  <span className="text-[11px] font-mono text-[var(--muted)]">
                    Mandatory: 0 for all regions
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={coolingPeriodDays}
                  onChange={(e) => setCoolingPeriodDays(Number(e.target.value))}
                  className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[11px] text-[var(--muted)] mt-1 font-merriweather">
                  Wait duration required after customer cancellation before resource reclamation.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--heading)] block mb-1 font-playfair">
                    Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={gracePeriodDays}
                    onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--heading)] block mb-1 font-playfair">
                    Hold Period (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={holdPeriodDays}
                    onChange={(e) => setHoldPeriodDays(Number(e.target.value))}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--heading)] block mb-1 font-playfair">
                  Recording Consent Type
                </label>
                <select
                  value={consentType}
                  onChange={(e) => setConsentType(e.target.value)}
                  className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-emerald-500 font-merriweather"
                >
                  <option value="audible_disclosure">Audible Disclosure (1-Party)</option>
                  <option value="two_party_opt_in">Explicit Opt-In (2-Party Consent)</option>
                  <option value="written_opt_in">Written Prior Express Consent</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--heading)] block mb-1 font-playfair">
                  Statutory Call Recording Notice
                </label>
                <textarea
                  rows={2}
                  value={statutoryNotice}
                  onChange={(e) => setStatutoryNotice(e.target.value)}
                  className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-emerald-500 font-merriweather"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Statutory KYC Requirements */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-4 lg:col-span-2 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--heading)] uppercase tracking-wider flex items-center gap-2 font-playfair">
                <FileCheck className="w-4 h-4 text-violet-500" />
                Required & Permitted KYC Document Types
              </h3>
              {activeRegion.raw_aadhaar_prohibited && (
                <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-playfair">
                  <Lock className="w-3 h-3" /> Raw Aadhaar Strictly Prohibited
                </span>
              )}
            </div>

            <p className="text-xs text-[var(--muted)] font-merriweather">
              Only documents matching this approved list will be permitted for submission by tenants in {activeRegion.name}.
            </p>

            {/* Tags list */}
            <div className="flex flex-wrap gap-2 pt-1">
              {kycDocs.map((doc) => (
                <span
                  key={doc}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-[var(--border)] text-xs font-mono text-[var(--heading)]"
                >
                  {doc}
                  <button
                    onClick={() => handleRemoveKycDoc(doc)}
                    className="text-[var(--muted)] hover:text-rose-500 font-bold ml-1 text-sm cursor-pointer"
                    title="Remove document type"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Add new KYC doc type */}
            <div className="flex items-center gap-2 pt-2 max-w-md">
              <input
                type="text"
                placeholder="e.g. certificate_of_incorporation"
                value={newKycDoc}
                onChange={(e) => setNewKycDoc(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKycDoc() } }}
                className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500 font-mono"
              />
              <button
                type="button"
                onClick={handleAddKycDoc}
                className="px-4 py-2 rounded-xl bg-[var(--hover-bg)] hover:bg-zinc-200/50 dark:hover:bg-white/10 text-[var(--heading)] border border-[var(--border)] text-xs font-semibold whitespace-nowrap transition cursor-pointer font-playfair"
              >
                + Add Type
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
