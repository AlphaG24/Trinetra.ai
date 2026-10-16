'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, ArrowRight, ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/client'
import { VaakritiSymbolVector } from '@/components/ui/VaakritiSymbolVector'
import { VaakritiWordmarkVector } from '@/components/ui/VaakritiWordmarkVector'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [user, setUser] = useState<any>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (err) {
        console.error('Failed to get session:', err)
      } finally {
        setCheckingSession(false)
      }
    }
    checkSession()
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })

      if (error) {
        toast.error(error.message || 'Failed to send reset email.')
        return
      }

      toast.success('Password reset email sent! Check your inbox.')
      router.push('/login')
    } catch (err) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 12) {
      toast.error('Password must be at least 12 characters long.')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        toast.error(error.message || 'Failed to update password.')
        return
      }

      toast.success('Password updated successfully!')
      
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1500)
    } catch (err) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isMounted || checkingSession) {
    return <div className="flex h-screen w-full bg-slate-50" />
  }

  return (
    <div className="flex min-h-screen w-full bg-[#F8FAFC] text-slate-900 overflow-x-hidden font-sans selection:bg-slate-200 selection:text-slate-900 relative items-center justify-center p-3 sm:p-5 lg:p-7">

      {/* ── AMBIENT SUBTLE BACKGROUND GRID & SOFT GRADIENT ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "radial-gradient(#CBD5E1 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div 
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.03) 25%, transparent 60%)",
          }}
        />
      </div>

      {/* ── BACK TO LOGIN BUTTON ── */}
      <div className="absolute top-5 left-5 sm:top-7 sm:left-7 z-50">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 backdrop-blur-xl transition-all duration-200 shadow-sm hover:shadow group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-1 text-slate-700" />
          <span>Back to Sign In</span>
        </Link>
      </div>

      {/* ── MASTER DUAL-PANEL CONTAINER ── */}
      <main className="relative z-10 w-full max-w-[1240px] min-h-[620px] lg:min-h-[700px] grid grid-cols-1 lg:grid-cols-12 rounded-[2.2rem] lg:rounded-[2.8rem] border-2 border-slate-200/90 bg-white/95 backdrop-blur-2xl shadow-[0_20px_70px_-15px_rgba(15,23,42,0.07),0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden">

        {/* ─────────────────────────────────────────────────────────────
            LEFT PANEL: CLEAN BRAND SHOWCASE (ONLY LOGO, NO ORBS, NO TAGS)
           ───────────────────────────────────────────────────────────── */}
        <div className="hidden lg:flex lg:col-span-6 xl:col-span-6 p-4 xl:p-6">
          <div className="relative w-full h-full rounded-[2rem] xl:rounded-[2.4rem] border border-slate-200/80 bg-gradient-to-b from-slate-50/70 via-white to-slate-50/50 overflow-hidden flex flex-col justify-between items-center p-8 xl:p-12 text-center shadow-sm">

            <div 
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: "linear-gradient(rgba(148, 163, 184, 0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.25) 1px, transparent 1px)",
                backgroundSize: "36px 36px",
              }}
            />

            {/* Top spacer for clean vertical balance */}
            <div className="w-full h-4" />

            {/* Center: Sharp Logo Lockup (Emblem + Wordmark + Tagline) */}
            <div className="relative z-10 flex flex-col items-center justify-center my-auto py-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="mb-7 flex items-center justify-center"
              >
                <VaakritiSymbolVector className="w-28 xl:w-36 h-auto text-slate-900 select-none" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-4 flex items-center justify-center w-full max-w-[280px] xl:max-w-[340px]"
              >
                <VaakritiWordmarkVector className="w-full h-auto text-slate-900 select-none" />
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-[11px] font-mono tracking-[0.38em] text-slate-500 uppercase font-semibold select-none"
              >
                THE CREATION OF VOICE
              </motion.p>
            </div>

            <div className="relative z-10 text-[10px] text-slate-400 tracking-widest uppercase font-semibold">
              © {new Date().getFullYear()} VAAKRITI AI. ALL RIGHTS RESERVED.
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            RIGHT PANEL: RECOVERY FORM (NO BLUE TEXT)
           ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-center items-center p-6 sm:p-10 xl:p-14 relative z-10 border-t lg:border-t-0 lg:border-l-2 border-slate-200/90 bg-white">

          {/* Mobile Only: Header */}
          <div className="flex lg:hidden flex-col items-center mb-8 text-center">
            <VaakritiSymbolVector className="w-16 h-auto text-slate-900 mb-3 select-none drop-shadow-sm" />
            <VaakritiWordmarkVector className="w-48 h-auto text-slate-900 mb-2 select-none" />
            <p className="text-[10px] font-mono tracking-[0.3em] text-slate-500 uppercase font-semibold">
              THE CREATION OF VOICE
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-[400px]"
          >
            {user ? (
              /* UPDATE PASSWORD */
              <>
                <div className="mb-7 text-center lg:text-left">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-1.5">
                    Set New Password
                  </h1>
                  <p className="text-slate-500 text-xs sm:text-sm">
                    Configure a strong new password (minimum 12 characters).
                  </p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-1.5 group">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={12}
                        className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 rounded-2xl py-3 pl-11 pr-11 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/10 transition-all text-sm shadow-sm"
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors pointer-events-none" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={12}
                        className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 rounded-2xl py-3 pl-11 pr-11 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/10 transition-all text-sm shadow-sm"
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-4 relative flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-black py-3.5 font-bold text-white text-sm transition-all shadow-[0_4px_16px_rgba(15,23,42,0.18)] hover:shadow-[0_6px_22px_rgba(15,23,42,0.25)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <span>Update Password</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                  </button>
                </form>
              </>
            ) : (
              /* REQUEST RESET LINK */
              <>
                <div className="mb-7 text-center lg:text-left">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-1.5">
                    Reset Password
                  </h1>
                  <p className="text-slate-500 text-xs sm:text-sm">
                    Enter your work email and we'll send you a recovery link.
                  </p>
                </div>

                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-1.5 group">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/10 transition-all text-sm shadow-sm"
                        placeholder="agent@trinetra.ai"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-4 relative flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-black py-3.5 font-bold text-white text-sm transition-all shadow-[0_4px_16px_rgba(15,23,42,0.18)] hover:shadow-[0_6px_22px_rgba(15,23,42,0.25)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending Recovery Link...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Recovery Link</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                  </button>
                </form>

                <div className="mt-7 text-center">
                  <p className="text-[12px] text-slate-500">
                    Remember your password?{' '}
                    <Link
                      href="/login"
                      className="text-slate-900 font-bold hover:underline cursor-pointer"
                    >
                      Sign In instead →
                    </Link>
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  )
}
