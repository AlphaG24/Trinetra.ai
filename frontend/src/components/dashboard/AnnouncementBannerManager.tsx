'use client'

import React, { useState, useEffect } from 'react'
import { Megaphone, Save, RotateCcw, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface AnnouncementConfig {
  enabled: boolean
  tag: string
  text: string
  action_text: string
  action_url: string
}

const DEFAULT_CONFIG: AnnouncementConfig = {
  enabled: false,
  tag: 'PLATFORM',
  text: 'How Autonomous Voice Agents handle complex Indian calls',
  action_text: 'Experience Live',
  action_url: '',
}

export function AnnouncementBannerManager() {
  const [config, setConfig] = useState<AnnouncementConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/developer/announcement')
      .then((res) => {
        if (!res.ok) return null
        return res.json()
      })
      .then((data) => {
        if (data?.data) {
          setConfig(data.data)
        }
      })
      .catch((err) => {
        console.warn('Developer announcement notice:', err?.message || err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/developer/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save announcement')

      toast.success(
        config.enabled
          ? 'Announcement banner published to topbar!'
          : 'Saved! Topbar will display default Platform message.'
      )
      if (data?.data) {
        setConfig(data.data)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating announcement banner')
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefault = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/developer/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(DEFAULT_CONFIG),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reset')

      setConfig(DEFAULT_CONFIG)
      toast.success('Reset to default platform message.')
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
        <span className="text-xs text-zinc-400">Loading announcement configuration...</span>
      </div>
    )
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-emerald-400" /> Topbar Announcements & Special Offers
          </h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Configure the message connected to the topbar. If custom mode is off or empty, the default Platform message remains automatically.
          </p>
        </div>

        {/* Toggle Custom vs Default */}
        <div className="flex items-center gap-3 bg-black/30 p-1.5 rounded-xl border border-[var(--border)]">
          <span className="text-xs font-semibold text-zinc-400 pl-2">Custom Banner:</span>
          <button
            type="button"
            onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              config.enabled
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {config.enabled ? 'Active (Custom)' : 'Default (Platform)'}
          </button>
        </div>
      </div>

      {/* Live Preview */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Live Topbar Strip Preview
        </label>
        <div className="w-full bg-[#F0FDFA] border border-teal-900/20 rounded-xl py-2 px-4 shadow-inner">
          <div className="flex items-center justify-center gap-2 sm:gap-2.5 text-[11px] sm:text-[12px] font-sans text-slate-800">
            <span className="text-[#0D9488] text-[9.5px]">✦</span>
            <span className="px-1.5 py-0.5 rounded text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider bg-[#0D9488]/15 text-[#0F766E]">
              {config.enabled && config.tag ? config.tag : 'PLATFORM'}
            </span>
            <span className="text-slate-700 font-medium truncate max-w-md">
              {config.enabled && config.text
                ? config.text
                : 'How Autonomous Voice Agents handle complex Indian calls'}
            </span>
            <span className="font-semibold text-[#0B0F17] underline decoration-slate-300 underline-offset-2">
              {config.enabled && config.action_text
                ? config.action_text
                : 'Experience Live'}
            </span>
            <span className="text-[#0D9488] text-[9.5px]">✦</span>
          </div>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1.5">
          {config.enabled
            ? '✓ Custom message will be displayed on the public landing page topbar.'
            : 'ℹ Custom message is disabled. The site will show the default Platform message.'}
        </p>
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tag / Badge */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Badge / Category Tag
            </label>
            <input
              type="text"
              value={config.tag}
              onChange={(e) => setConfig({ ...config, tag: e.target.value.toUpperCase() })}
              placeholder="e.g. OFFER, ANNOUNCEMENT, PLATFORM"
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-[var(--border)] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              maxLength={30}
            />
            <div className="flex gap-1.5 mt-2">
              {['OFFER', 'ANNOUNCEMENT', 'PLATFORM', 'NEW'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setConfig({ ...config, tag: preset })}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 transition"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button Text */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Action Link Text
            </label>
            <input
              type="text"
              value={config.action_text}
              onChange={(e) => setConfig({ ...config, action_text: e.target.value })}
              placeholder="e.g. Experience Live, Claim 50% Off, Read More"
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-[var(--border)] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              maxLength={50}
            />
          </div>

          {/* Action URL */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Action Target Link (optional)
            </label>
            <input
              type="text"
              value={config.action_url}
              onChange={(e) => setConfig({ ...config, action_url: e.target.value })}
              placeholder="e.g. /pricing or leave empty for Demo Modal"
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-[var(--border)] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              maxLength={200}
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Leave empty to trigger live voice callback popup.
            </span>
          </div>
        </div>

        {/* Message Text */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            Announcement / Offer Headline
          </label>
          <input
            type="text"
            value={config.text}
            onChange={(e) => setConfig({ ...config, text: e.target.value })}
            placeholder="e.g. How Autonomous Voice Agents handle complex Indian calls"
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[var(--border)] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            maxLength={200}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset to Default
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-500/10 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" /> Save & Update Topbar
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
