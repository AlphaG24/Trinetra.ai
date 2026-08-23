'use client'

import { useState, useEffect } from 'react'
import { Mail, MessageSquare, Bell, Clock, Inbox, ShieldAlert, Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import TelegramConnectionCard from '@/src/components/dashboard/TelegramConnectionCard'

interface EventPreference {
  email: boolean
  telegram: boolean
  dashboard: boolean
}

interface PreferencesSchema {
  events: {
    new_lead: EventPreference
    payment_confirmed: EventPreference
    usage_warning: EventPreference
    callback_scheduled: EventPreference
    agent_paused: EventPreference
    weekly_report: EventPreference
  }
  quiet_hours: {
    enabled: boolean
    start: string
    end: string
  }
  digest_mode: {
    enabled: boolean
    time: string
  }
}

const defaultPreferences: PreferencesSchema = {
  events: {
    new_lead: { email: true, telegram: true, dashboard: true },
    payment_confirmed: { email: true, telegram: false, dashboard: true },
    usage_warning: { email: true, telegram: true, dashboard: true },
    callback_scheduled: { email: true, telegram: true, dashboard: true },
    agent_paused: { email: true, telegram: false, dashboard: true },
    weekly_report: { email: true, telegram: false, dashboard: false }
  },
  quiet_hours: {
    enabled: false,
    start: '22:00',
    end: '07:00'
  },
  digest_mode: {
    enabled: false,
    time: '18:00'
  }
}

const eventTypesList = [
  { id: 'new_lead', label: 'New Lead Qualified', desc: 'Alert when a customer qualifies as an inbound lead on a live call.' },
  { id: 'payment_confirmed', label: 'Payment & Credits Confirmed', desc: 'Notifications for billing transactions, invoice copies, and top-ups.' },
  { id: 'usage_warning', label: 'Usage Limits & Quota Alert', desc: 'Trigger warning when plan minutes reach 80% or 100% capacity.' },
  { id: 'callback_scheduled', label: 'Callback Scheduled', desc: 'Get notified when an agent schedules a callback task with a customer.' },
  { id: 'agent_paused', label: 'Agent Health & Status', desc: 'Alert if dropped call rates increase or API integrations fail.' },
  { id: 'weekly_report', label: 'Weekly Summary Digest', desc: 'Weekly metrics report for agent engagements and leads captured.' }
]

export function NotificationsTab() {
  const [prefs, setPrefs] = useState<PreferencesSchema>(defaultPreferences)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Fetch initial preferences on mount
  useEffect(() => {
    async function loadPrefs() {
      try {
        setLoading(true)
        const res = await fetch('/api/profiles')
        if (!res.ok) throw new Error('Failed to load profile')
        const data = await res.json()
        if (data.profile?.notification_preferences) {
          // Merge with defaults to ensure all fields are present
          const merged = {
            events: {
              ...defaultPreferences.events,
              ...data.profile.notification_preferences.events
            },
            quiet_hours: {
              ...defaultPreferences.quiet_hours,
              ...data.profile.notification_preferences.quiet_hours
            },
            digest_mode: {
              ...defaultPreferences.digest_mode,
              ...data.profile.notification_preferences.digest_mode
            }
          }
          setPrefs(merged)
        }
      } catch (err) {
        console.error('Failed to load notification settings:', err)
        toast.error('Could not load notification preferences.')
      } finally {
        setLoading(false)
      }
    }
    loadPrefs()
  }, [])

  // Toggle event channel value
  const handleToggleChannel = (eventId: string, channel: 'email' | 'telegram' | 'dashboard') => {
    setPrefs((prev) => {
      const targetEvent = prev.events[eventId as keyof typeof prev.events]
      return {
        ...prev,
        events: {
          ...prev.events,
          [eventId]: {
            ...targetEvent,
            [channel]: !targetEvent[channel]
          }
        }
      }
    })
  }

  // Update nested settings
  const handleUpdateQuietHours = (field: string, value: any) => {
    setPrefs((prev) => ({
      ...prev,
      quiet_hours: {
        ...prev.quiet_hours,
        [field]: value
      }
    }))
  }

  const handleUpdateDigest = (field: string, value: any) => {
    setPrefs((prev) => ({
      ...prev,
      digest_mode: {
        ...prev.digest_mode,
        [field]: value
      }
    }))
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_preferences: prefs })
      })
      if (!res.ok) throw new Error('Save failed')
      toast.success('Notification preferences updated successfully!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save notification settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p className="text-xs text-zinc-400">Loading notification preferences...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Event Toggles & Channel Multi-Select (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 blur-[120px] pointer-events-none rounded-full" />
            
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-violet-400" />
                <div>
                  <h3 className="font-bold font-montserrat text-sm text-[var(--heading)] uppercase tracking-wider">Granular Preferences</h3>
                  <p className="text-[10px] text-[var(--muted)] mt-0.5">Route critical alerts directly to your preferred communication channels.</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[var(--border)] space-y-5">
              {eventTypesList.map((item, index) => {
                const eventPrefs = prefs.events[item.id as keyof typeof prefs.events]
                return (
                  <div key={item.id} className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${index > 0 ? 'pt-5' : ''}`}>
                    <div className="space-y-1 max-w-md">
                      <p className="text-xs font-semibold text-[var(--body)] font-montserrat flex items-center gap-1.5">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-[var(--muted)] leading-relaxed">{item.desc}</p>
                    </div>

                    {/* Channels Multiselect */}
                    <div className="flex items-center gap-4 shrink-0">
                      {/* Email Checkbox */}
                      <button
                        type="button"
                        onClick={() => handleToggleChannel(item.id, 'email')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-semibold tracking-wide uppercase transition ${
                          eventPrefs.email 
                            ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' 
                            : 'bg-[var(--background)]/40 border-[var(--border)] text-[var(--muted)] hover:text-[var(--body)]'
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email</span>
                      </button>

                      {/* Telegram Checkbox */}
                      <button
                        type="button"
                        onClick={() => handleToggleChannel(item.id, 'telegram')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-semibold tracking-wide uppercase transition ${
                          eventPrefs.telegram 
                            ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' 
                            : 'bg-[var(--background)]/40 border-[var(--border)] text-[var(--muted)] hover:text-[var(--body)]'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Telegram</span>
                      </button>

                      {/* Dashboard Checkbox */}
                      <button
                        type="button"
                        onClick={() => handleToggleChannel(item.id, 'dashboard')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-semibold tracking-wide uppercase transition ${
                          eventPrefs.dashboard 
                            ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' 
                            : 'bg-[var(--background)]/40 border-[var(--border)] text-[var(--muted)] hover:text-[var(--body)]'
                        }`}
                      >
                        <Inbox className="w-3.5 h-3.5" />
                        <span>In-App</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              onClick={saveSettings}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-violet-600/50 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-violet-500/10"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Preferences...</span>
                </>
              ) : (
                <span>Save Preferences</span>
              )}
            </button>
          </div>
        </div>

        {/* Quiet Hours & Digest (Right 1 column) */}
        <div className="space-y-6">
          <TelegramConnectionCard />

          {/* Quiet Hours Card */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-400" />
                <h3 className="font-bold font-montserrat text-xs text-[var(--heading)] uppercase tracking-wider">Quiet Hours</h3>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateQuietHours('enabled', !prefs.quiet_hours.enabled)}
                className={`relative inline-flex items-center h-5 w-9 rounded-full transition-all shrink-0 cursor-pointer ${
                  prefs.quiet_hours.enabled
                    ? 'bg-violet-600 border border-violet-500/30'
                    : 'bg-[var(--background)] border border-[var(--border)]'
                }`}
              >
                <span
                  className={`inline-block w-3.5 h-3.5 transform rounded-full bg-white transition-all ${
                    prefs.quiet_hours.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            
            <p className="text-[10px] text-[var(--muted)] leading-relaxed">
              Suppress immediate Email & Telegram pings during specified windows. Dashboard alerts will still collect silently.
            </p>

            {prefs.quiet_hours.enabled && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[10px] text-zinc-400 font-semibold block mb-1 font-montserrat">Start Time</label>
                  <input
                    type="time"
                    value={prefs.quiet_hours.start}
                    onChange={(e) => handleUpdateQuietHours('start', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 font-semibold block mb-1 font-montserrat">End Time</label>
                  <input
                    type="time"
                    value={prefs.quiet_hours.end}
                    onChange={(e) => handleUpdateQuietHours('end', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Digest Mode Card */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <h3 className="font-bold font-montserrat text-xs text-[var(--heading)] uppercase tracking-wider">Digest Mode</h3>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateDigest('enabled', !prefs.digest_mode.enabled)}
                className={`relative inline-flex items-center h-5 w-9 rounded-full transition-all shrink-0 cursor-pointer ${
                  prefs.digest_mode.enabled
                    ? 'bg-violet-600 border border-violet-500/30'
                    : 'bg-[var(--background)] border border-[var(--border)]'
                }`}
              >
                <span
                  className={`inline-block w-3.5 h-3.5 transform rounded-full bg-white transition-all ${
                    prefs.digest_mode.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            
            <p className="text-[10px] text-[var(--muted)] leading-relaxed">
              Roll up all individual real-time alerts into a single, comprehensive summary digest delivered daily.
            </p>

            {prefs.digest_mode.enabled && (
              <div className="pt-2">
                <label className="text-[10px] text-zinc-400 font-semibold block mb-1 font-montserrat">Delivery Schedule</label>
                <input
                  type="time"
                  value={prefs.digest_mode.time}
                  onChange={(e) => handleUpdateDigest('time', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
