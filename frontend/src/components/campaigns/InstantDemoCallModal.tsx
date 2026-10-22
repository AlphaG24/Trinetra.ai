'use client'

import React, { useState } from 'react'
import { X, PhoneCall, Loader2, User, Phone, FileText } from 'lucide-react'
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
  const [notes, setNotes] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id || '')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanPhone = phone.trim().replace(/\s+/g, '')
    if (!name.trim()) {
      toast.error('Please enter contact name')
      return
    }
    if (!cleanPhone) {
      toast.error('Please enter phone number')
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
          notes: notes.trim() || undefined
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to place call')
      }

      toast.success(data.message || `Calling ${cleanPhone}...`)
      onSuccess(data)
      onClose()

      // Automatically sync call status, recording, and transcripts after call completion
      setTimeout(() => {
        fetch('/api/campaigns/sync-calls', { method: 'POST' }).catch(() => {})
      }, 20000)
      setTimeout(() => {
        fetch('/api/campaigns/sync-calls', { method: 'POST' }).catch(() => {})
      }, 45000)
    } catch (err: any) {
      console.error('Outbound call error:', err)
      toast.error(err.message || 'Error placing call')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#0c0516] border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shadow-sm">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
                Direct Call
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Place an outbound call to any contact number.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Contact Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" /> Contact Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-zinc-400" /> Phone Number
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 text-sm font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Caller ID: <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">+91 7965481258</span>
            </p>
          </div>

          {/* Agent Persona */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Voice Agent
            </label>
            <div className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5 text-zinc-800 dark:text-zinc-200 text-sm flex items-center justify-between">
              <span className="font-medium">Shubh</span>
              <span className="text-xs font-mono text-zinc-500">+91 7965481258</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-400" /> Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Product inquiry follow up"
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white dark:text-zinc-950 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <PhoneCall className="w-3.5 h-3.5" />
                  Call Now
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
