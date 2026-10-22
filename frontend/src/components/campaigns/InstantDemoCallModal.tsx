'use client'

import React, { useState } from 'react'
import { X, PhoneCall, Sparkles, Loader2, ShieldCheck, User, Phone, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

interface InstantDemoCallModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (data?: any) => void
  agents?: Array<{ id: string; name: string; phone_number?: string }>
}

export function InstantDemoCallModal({
  isOpen,
  onClose,
  onSuccess,
  agents = []
}: InstantDemoCallModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('Live Presentation Demo')
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id || '')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanPhone = phone.trim().replace(/\s+/g, '')
    if (!name.trim()) {
      toast.error('Please enter prospect / recipient name')
      return
    }
    if (!cleanPhone) {
      toast.error('Please enter a phone number')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/campaigns/instant-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          agent_id: selectedAgentId || undefined,
          notes: notes.trim()
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to place outbound call')
      }

      toast.success(data.message || `Calling ${cleanPhone} via Shubh!`)
      onSuccess(data)
      onClose()
    } catch (err: any) {
      console.error('Instant call error:', err)
      toast.error(err.message || 'Error launching instant call')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0E071A] border border-violet-500/30 rounded-2xl p-6 shadow-2xl text-left overflow-hidden">
        {/* Top ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-violet-600/20 to-transparent blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <PhoneCall className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-display">Direct Live Call</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  Ultra-low Latency
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Trigger a real-time call to any mobile phone directly from your platform.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 relative z-10">
          {/* Prospect Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-violet-400" /> Recipient / Prospect Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-violet-400" /> Phone Number (Mobile)
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 text-white placeholder-zinc-500 text-sm font-mono focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Caller ID will display as verified Indian Number <span className="text-violet-400 font-mono font-semibold">+91 7965481258</span>.
            </p>
          </div>

          {/* Agent Voice Persona */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" /> Active Voice Agent
            </label>
            <div className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/60 border border-white/10 text-white text-sm flex items-center justify-between">
              <span className="font-medium">Shubh (Sales & Support Persona)</span>
              <span className="text-xs font-mono text-zinc-400">+917965481258</span>
            </div>
          </div>

          {/* Demo Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-violet-400" /> Demo Notes / Campaign Tag
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. VIP Presentation Demo"
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
            />
          </div>

          {/* Guarantee banner */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[11px] text-zinc-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Real-time synchronization enabled. Audio transcript and lead data will load live into your dashboard upon completion.
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:brightness-110 shadow-lg shadow-violet-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Initiating Live Call...
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4" />
                  Launch Live Call
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
