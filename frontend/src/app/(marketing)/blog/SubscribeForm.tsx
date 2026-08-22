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
      <div className="flex items-center gap-3 bg-violet-950/40 border border-violet-500/30 px-6 py-4 rounded-xl text-violet-200">
        <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
        <div className="text-sm">
          <p className="font-bold text-white">You're on the list!</p>
          <p className="text-xs text-[#9E99E0] mt-0.5">Check your inbox for a confirmation welcome email.</p>
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
        className="flex-1 h-12 px-4 rounded-xl border border-violet-500/25 bg-black/50 text-white text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-zinc-500"
      />
      <button
        type="submit"
        disabled={loading}
        className="h-12 px-7 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-sm hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Subscribing...</span>
          </>
        ) : (
          <>
            <span>Subscribe</span>
            <Send size={14} className="text-black/80" />
          </>
        )}
      </button>
    </form>
  )
}
