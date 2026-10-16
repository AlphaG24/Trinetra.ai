'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, Send } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SubscribeForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanEmail = email.trim()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Please enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to subscribe. Please try again.')
        return
      }

      setSubscribed(true)
      setEmail('')
      toast.success(data.message || '🎉 Subscribed successfully!')
    } catch (err) {
      console.error('[SUBSCRIBE_FORM] Error:', err)
      toast.error('Something went wrong. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  if (subscribed) {
    return (
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-6 py-4 rounded-xl text-emerald-800">
        <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
        <div className="text-sm">
          <p className="font-bold text-[#0F172A]">You're on the list!</p>
          <p className="text-xs text-[#64748B] mt-0.5">Check your inbox for our latest engineering updates.</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full lg:max-w-md">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your work email..."
        disabled={loading}
        required
        className="flex-1 h-12 px-4 rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] focus:bg-white text-[#0F172A] text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all placeholder:text-[#94A3B8]"
      />
      <button
        type="submit"
        disabled={loading}
        className="h-12 px-6 rounded-xl bg-[#2563EB] text-white font-semibold text-sm hover:bg-[#1D4ED8] transition-all shadow-xs flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Subscribing...</span>
          </>
        ) : (
          <>
            <span>Subscribe</span>
            <Send size={14} className="text-white/80" />
          </>
        )}
      </button>
    </form>
  )
}
