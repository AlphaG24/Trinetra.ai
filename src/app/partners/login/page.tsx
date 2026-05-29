'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

export default function PartnerLoginPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  // If already logged in AND has a partner record, redirect to dashboard
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // Verify partner record exists in the database
          const { data: partner } = await supabase
            .from('partners')
            .select('id, full_name, status')
            .or(`user_id.eq.${session.user.id},auth_user_id.eq.${session.user.id}`)
            .maybeSingle()

          if (partner) {
            router.push('/partners/dashboard')
            return
          }
        }
      } catch {
        // Ignore errors and show login form
      }
      setCheckingSession(false)
    }
    checkExistingSession()
  }, [supabase, router])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Step 1: Authenticate with Supabase Auth
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      if (!authData.session) {
        setError('Authentication failed. Please try again.')
        setLoading(false)
        return
      }

      // Step 2: Auth succeeded — redirect to dashboard.
      // Use window.location.href to bypass Next.js client-side router cache
      // which might otherwise instantly redirect back to login if dashboard was 
      // previously visited while unauthenticated.
      window.location.href = '/partners/dashboard'
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080010]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080010] relative overflow-hidden px-4 py-10">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-25">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-600/60 via-amber-500/20 to-transparent blur-[120px] rounded-full" />
        </div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] opacity-15">
          <div className="absolute inset-0 bg-gradient-to-tl from-amber-500/40 to-transparent blur-[100px] rounded-full" />
        </div>
      </div>
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay pointer-events-none" />

      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute top-6 left-6 z-20"
      >
        <Link
          href="/partners"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Partners
        </Link>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, type: 'spring', bounce: 0.15 }}
        className="relative z-10 w-full max-w-[480px]"
      >
        {/* Outer glow border */}
        <div className="absolute -inset-[1px] bg-gradient-to-b from-white/10 via-amber-500/10 to-transparent rounded-3xl pointer-events-none" />

        <div className="bg-[#0f0a1c]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
          {/* Card background accent */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <Link href="/" className="mb-4 hover:opacity-90 transition-opacity">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <Image
                  src="/trident.png"
                  alt="Trinetra AI"
                  width={100}
                  height={100}
                  className="h-24 md:h-28 w-auto object-contain drop-shadow-[0_0_25px_rgba(245,197,24,0.15)]"
                  priority
                />
              </motion.div>
            </Link>
            <h1 className="font-display font-bold text-3xl text-white tracking-tight">
              Welcome Back
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 4 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500" htmlFor="partner-email">
                Email Address
              </label>
              <div className="relative group">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors" />
                <input
                  id="partner-email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500" htmlFor="partner-password">
                Password
              </label>
              <div className="relative group">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors" />
                <input
                  id="partner-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-12 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                href="/partners/reset-password"
                className="text-xs text-zinc-500 hover:text-amber-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-zinc-500 text-sm text-center">
              Don&apos;t have a partner account?{' '}
              <Link
                href="/partners/signup"
                className="text-white hover:underline decoration-amber-400 underline-offset-4 transition-all"
              >
                Apply Now
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  )
}
