'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, ArrowRight, CheckCircle } from 'lucide-react'

interface SubscribeWidgetProps {
  variant?: 'sidebar' | 'inline' | 'banner'
}

export function SubscribeWidget({ variant = 'sidebar' }: SubscribeWidgetProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const supabase = createClient()

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    
    setStatus('loading')
    
    try {
      const { error } = await supabase
        .from('subscribers')
        .insert({ email: email.trim() })
      
      if (error) {
        if (error.code === '23505') {
          setMessage('Already subscribed!')
          setStatus('success')
        } else {
          throw error
        }
      } else {
        setMessage('Subscribed successfully!')
        setStatus('success')
        setEmail('')
      }
    } catch (err: any) {
      setMessage('Something went wrong. Try again.')
      setStatus('error')
    }
  }

  if (variant === 'sidebar') {
    return (
      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/20 
                      border border-purple-500/30 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <Mail size={16} className="text-purple-400" />
          </div>
          <span className="text-xs font-medium text-purple-400 uppercase tracking-wider">
            Newsletter
          </span>
        </div>

        <div>
          <h3 className="text-xl font-bold text-white leading-snug">
            Get the latest{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r 
                             from-purple-400 to-pink-400">
              AI insights
            </span>
            {' '}weekly
          </h3>
          <p className="text-sm text-white/50 mt-2">
            Join 10,000+ business leaders reading Trinetra newsletter.
          </p>
        </div>

        {status === 'success' ? (
          <div className="flex items-center gap-2 text-green-400 bg-green-500/10 
                          border border-green-500/20 rounded-xl px-4 py-3">
            <CheckCircle size={18} />
            <span className="text-sm font-medium">{message}</span>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full bg-white/10 border border-white/20 rounded-xl 
                         px-4 py-3 text-white placeholder-white/30 text-sm
                         focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 
                         hover:from-purple-500 hover:to-pink-500
                         text-white font-medium py-3 px-4 rounded-xl
                         flex items-center justify-center gap-2
                         transition-all duration-300 hover:scale-[1.02]
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Subscribing...' : (
                <>Subscribe <ArrowRight size={16} /></>
              )}
            </button>
            {status === 'error' && (
              <p className="text-red-400 text-xs text-center">{message}</p>
            )}
          </form>
        )}
      </div>
    )
  }

  // Inline variant for blog post bottom
  return (
    <div className="border-t border-white/10 pt-8 mt-8">
      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/20
                      border border-purple-500/20 rounded-2xl p-8 text-center space-y-4">
        <h3 className="text-2xl font-bold text-white">
          Enjoyed this article?
        </h3>
        <p className="text-white/60 max-w-md mx-auto">
          Get more AI insights delivered to your inbox weekly.
        </p>
        {status === 'success' ? (
          <div className="flex items-center justify-center gap-2 text-green-400">
            <CheckCircle size={20} />
            <span>{message}</span>
          </div>
        ) : (
          <form 
            onSubmit={handleSubscribe}
            className="flex gap-3 max-w-sm mx-auto"
          >
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 bg-white/10 border border-white/20 rounded-xl 
                         px-4 py-2.5 text-white placeholder-white/30 text-sm
                         focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-purple-600 hover:bg-purple-500 text-white 
                         px-5 py-2.5 rounded-xl font-medium transition-all
                         disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              {status === 'loading' ? '...' : <>Subscribe <ArrowRight size={14} /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
