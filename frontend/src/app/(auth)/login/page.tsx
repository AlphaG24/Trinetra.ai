'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/client'
import { getURL } from '@/src/utils/helpers'
import { VaakritiSymbolVector } from '@/components/ui/VaakritiSymbolVector'
import { VaakritiWordmarkVector } from '@/components/ui/VaakritiWordmarkVector'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Mode: 'signin' by default; switches to 'signup' when requested
  const initialMode = searchParams?.get('mode') === 'signup' || searchParams?.get('tab') === 'signup' ? 'signup' : 'signin'
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode)

  // Shared / Sign In Fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [capsLockActive, setCapsLockActive] = useState(false)

  // Sign Up Extra Fields
  const [fullName, setFullName] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(true)

  // Loading & Animation states
  const [isLoading, setIsLoading] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Show toast if user was redirected due to an expired session
  useEffect(() => {
    if (searchParams?.get('expired') === 'true') {
      toast.error('Your session has expired. Please sign in again.', {
        duration: 5000,
        id: 'session-expired',
      })
      const url = new URL(window.location.href)
      url.searchParams.delete('expired')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  // Detect CapsLock for improved UX
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState('CapsLock')) {
      setCapsLockActive(true)
    } else {
      setCapsLockActive(false)
    }
  }

  // ── SUBMIT: SIGN IN ──
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setIsShaking(true)
        setTimeout(() => setIsShaking(false), 500)

        if (error.message.includes('Email not confirmed')) {
          toast.error('Please check your email and verify your account before signing in.', { duration: 6000 })
        } else if (error.message.includes('Failed to fetch')) {
          toast.error('Connection failed. Please check your internet connection.')
        } else {
          toast.error('Invalid email or password.')
        }
        console.error('Sign-in failed:', error)
        return
      }

      if (data.user) {
        toast.success('Welcome back!')
        
        const redirectParam = searchParams ? searchParams.get('redirect') : null
        const userEmail = (data.user.email || '').toLowerCase().trim()
        const isSuperAdminByEmail = userEmail === 'raghav00424@gmail.com' || userEmail === 'raghav@trinetra.ai' || (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').includes(userEmail)
        const metaRole = (data.user.app_metadata?.role || data.user.user_metadata?.role || '').toLowerCase().trim()
        const isMetaAdmin = metaRole === 'admin' || metaRole === 'super_admin'

        // 1. If valid relative path specified (e.g. /dashboard/campaigns) and NOT home or login
        if (redirectParam && redirectParam.startsWith('/') && redirectParam !== '/' && !redirectParam.startsWith('/login')) {
          // If user is superadmin/admin and redirectParam is just the generic root dashboard, route to /admin
          if ((isSuperAdminByEmail || isMetaAdmin) && (redirectParam === '/dashboard' || redirectParam === '/dashboard/')) {
            window.location.href = '/admin'
            return
          }
          window.location.href = redirectParam
          return
        }

        if (redirectParam && redirectParam.toLowerCase().includes('trinetraedu-ai.com')) {
          let target = redirectParam.trim()
          if (!target.startsWith('http://') && !target.startsWith('https://')) {
            target = 'https://' + target
          }
          try {
            const parsed = new URL(target)
            if (parsed.hostname.endsWith('trinetraedu-ai.com')) {
              window.location.href = target
              return
            }
          } catch (e) {
            console.error('Malformed redirectParam:', e)
          }
        }

        // 3. Default direct destination based on user role (superadmin takes immediate priority)
        if (isSuperAdminByEmail || isMetaAdmin) {
          window.location.href = '/admin'
          return
        }

        try {
          const profilePromise = supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single()
          const timeoutPromise = new Promise<{ data: any }>((resolve) => 
            setTimeout(() => resolve({ data: null }), 1500)
          )
          const { data: profile } = await Promise.race([profilePromise, timeoutPromise])
          
          const role = (profile?.role || metaRole || 'client').toLowerCase()
          const isAdmin = isSuperAdminByEmail || role === 'admin' || role === 'super_admin'

          window.location.href = isAdmin ? '/admin' : '/dashboard'
        } catch {
          window.location.href = isSuperAdminByEmail ? '/admin' : '/dashboard'
        }
      }
    } catch (err) {
      console.error('Sign-in error:', err)
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── SUBMIT: SIGN UP ──
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      setIsLoading(false)
      return
    }

    if (!agreeTerms) {
      toast.error('Please agree to the Terms of Service to continue.')
      setIsLoading(false)
      return
    }

    try {
      const redirectURL = getURL('/auth/callback')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectURL,
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        setIsShaking(true)
        setTimeout(() => setIsShaking(false), 500)
        toast.error(error.message || 'Registration failed')
        console.error('Sign-up failed:', error)
        return
      }

      if (data.user) {
        if (data.session) {
          toast.success('Account created successfully! Redirecting...')
          router.push('/dashboard')
          router.refresh()
        } else {
          toast.success('Verification link sent! Please check your inbox.', { duration: 8000 })
          setAuthMode('signin')
        }
      }
    } catch (err) {
      console.error('Sign-up error:', err)
      toast.error('An unexpected error occurred during signup.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── GOOGLE OAUTH ──
  const handleGoogleOAuth = async () => {
    try {
      const redirectURL = getURL('/auth/callback')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectURL,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) throw error
    } catch (err: any) {
      console.error('Google OAuth error:', err)
      toast.error(err.message || 'Failed to authenticate with Google')
    }
  }

  if (!isMounted) {
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

      {/* ── BACK TO HOME BUTTON ── */}
      <div className="absolute top-5 left-5 sm:top-7 sm:left-7 z-50">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 backdrop-blur-xl transition-all duration-200 shadow-sm hover:shadow group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-1 text-slate-700" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* ── MASTER DUAL-PANEL CONTAINER ── */}
      <main className="relative z-10 w-full max-w-[1240px] min-h-[620px] lg:min-h-[700px] grid grid-cols-1 lg:grid-cols-12 rounded-[2.2rem] lg:rounded-[2.8rem] border-2 border-slate-200/90 bg-white/95 backdrop-blur-2xl shadow-[0_20px_70px_-15px_rgba(15,23,42,0.07),0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden">

        {/* ─────────────────────────────────────────────────────────────
            LEFT PANEL: CLEAN BRAND SHOWCASE (ONLY LOGO, NO ORBS, NO TAGS)
           ───────────────────────────────────────────────────────────── */}
        <div className="hidden lg:flex lg:col-span-6 xl:col-span-6 p-4 xl:p-6">
          <div className="relative w-full h-full rounded-[2rem] xl:rounded-[2.4rem] border border-slate-200/80 bg-gradient-to-b from-slate-50/70 via-white to-slate-50/50 overflow-hidden flex flex-col justify-between items-center p-8 xl:p-12 text-center shadow-sm">

            {/* Subtle delicate grid inside card */}
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
              
              {/* Sharp Official Emblem Vector */}
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="mb-7 flex items-center justify-center"
              >
                <VaakritiSymbolVector className="w-28 xl:w-36 h-auto text-slate-900 select-none" />
              </motion.div>

              {/* Sharp Official Wordmark Vector (Clean R with counter cutout) */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-4 flex items-center justify-center w-full max-w-[280px] xl:max-w-[340px]"
              >
                <VaakritiWordmarkVector className="w-full h-auto text-slate-900 select-none" />
              </motion.div>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-[11px] font-mono tracking-[0.38em] text-slate-500 uppercase font-semibold select-none"
              >
                THE CREATION OF VOICE
              </motion.p>
            </div>

            {/* Bottom Copyright */}
            <div className="relative z-10 text-[10px] text-slate-400 tracking-widest uppercase font-semibold">
              © {new Date().getFullYear()} VAAKRITI AI. ALL RIGHTS RESERVED.
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            RIGHT PANEL: PRECISION COMMAND CENTER (NO BLUE TEXT)
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
            {/* Header: Pure dark text (NO blue text) */}
            <div className="mb-7 text-center lg:text-left">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-1.5">
                {authMode === 'signin' ? 'Welcome Back' : 'Create Workspace'}
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm">
                {authMode === 'signin'
                  ? 'Enter your credentials to access the command center.'
                  : 'Set up your autonomous command center in seconds.'}
              </p>
            </div>

            {/* Mode Switcher Pill */}
            <div className="mb-6 p-1 rounded-2xl bg-slate-100 border border-slate-200 flex items-center relative">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all relative z-10 cursor-pointer ${
                  authMode === 'signin' 
                    ? 'text-white' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {authMode === 'signin' && (
                  <motion.div
                    layoutId="auth-tab-pill-neutral"
                    className="absolute inset-0 bg-slate-900 rounded-xl -z-10 shadow-sm"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all relative z-10 cursor-pointer ${
                  authMode === 'signup' 
                    ? 'text-white' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {authMode === 'signup' && (
                  <motion.div
                    layoutId="auth-tab-pill-neutral"
                    className="absolute inset-0 bg-slate-900 rounded-xl -z-10 shadow-sm"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                Create Account
              </button>
            </div>

            {/* Form Container */}
            <div className={`transition-transform duration-200 ${isShaking ? 'animate-shake' : ''}`}>
              <AnimatePresence mode="wait">
                {authMode === 'signin' ? (
                  /* ─────────── SIGN IN FORM ─────────── */
                  <motion.form
                    key="signin-form"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleSignIn}
                    className="space-y-4"
                  >
                    {/* Email Input */}
                    <div className="space-y-1.5 group">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors pointer-events-none" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoComplete="email"
                          className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/10 transition-all text-sm shadow-sm"
                          placeholder="agent@trinetra.ai"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5 group">
                      <div className="flex items-center justify-between pl-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">
                          Password
                        </label>
                        <Link
                          href="/reset-password"
                          className="text-[11px] font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          Forgot?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors pointer-events-none" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={handleKeyDown}
                          required
                          autoComplete="current-password"
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

                      {capsLockActive && (
                        <p className="flex items-center gap-1.5 text-xs text-amber-600 font-medium pl-1 pt-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Caps Lock is ON
                        </p>
                      )}
                    </div>

                    {/* Remember me */}
                    <div className="flex items-center pl-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-800 cursor-pointer"
                        />
                        <span>Keep me signed in for 30 days</span>
                      </label>
                    </div>

                    {/* Sign In Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-2 relative flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-black py-3.5 font-bold text-white text-sm transition-all shadow-[0_4px_16px_rgba(15,23,42,0.18)] hover:shadow-[0_6px_22px_rgba(15,23,42,0.25)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Initializing Session...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In to Console</span>
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                    </button>
                  </motion.form>
                ) : (
                  /* ─────────── SIGN UP FORM ─────────── */
                  <motion.form
                    key="signup-form"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleSignUp}
                    className="space-y-4"
                  >
                    {/* Full Name Input */}
                    <div className="space-y-1.5 group">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors pointer-events-none" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          autoComplete="name"
                          className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/10 transition-all text-sm shadow-sm"
                          placeholder="Alex Morgan"
                        />
                      </div>
                    </div>

                    {/* Email Input */}
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
                          autoComplete="email"
                          className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/10 transition-all text-sm shadow-sm"
                          placeholder="agent@trinetra.ai"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5 group">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">
                        Create Password (min 8 chars)
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors pointer-events-none" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={handleKeyDown}
                          required
                          minLength={8}
                          autoComplete="new-password"
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

                    {/* Agree to terms */}
                    <div className="flex items-start pl-1 pt-1">
                      <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-600 leading-snug">
                        <input
                          type="checkbox"
                          checked={agreeTerms}
                          onChange={(e) => setAgreeTerms(e.target.checked)}
                          required
                          className="w-4 h-4 mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-800 cursor-pointer"
                        />
                        <span>
                          I agree to the <Link href="/terms" className="text-slate-900 font-semibold underline">Terms of Service</Link> and <Link href="/privacy" className="text-slate-900 font-semibold underline">Privacy Policy</Link>.
                        </span>
                      </label>
                    </div>

                    {/* Sign Up Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-2 relative flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-black py-3.5 font-bold text-white text-sm transition-all shadow-[0_4px_16px_rgba(15,23,42,0.18)] hover:shadow-[0_6px_22px_rgba(15,23,42,0.25)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Creating Workspace...</span>
                        </>
                      ) : (
                        <>
                          <span>Create Free Workspace</span>
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Divider: Or Use Provider */}
            <div className="my-5 flex items-center justify-center space-x-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                OR CONTINUE WITH
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Google Workspace Button */}
            <button
              onClick={handleGoogleOAuth}
              type="button"
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 py-3 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-all group cursor-pointer shadow-sm hover:shadow"
            >
              <svg className="w-4.5 h-4.5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Bottom Subtext: NO BLUE TEXT */}
            <div className="mt-6 text-center">
              <p className="text-[12px] text-slate-500">
                {authMode === 'signin' ? (
                  <>
                    New to Vaakriti?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('signup')}
                      className="text-slate-900 font-bold hover:underline cursor-pointer"
                    >
                      Create an account →
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('signin')}
                      className="text-slate-900 font-bold hover:underline cursor-pointer"
                    >
                      Sign In instead →
                    </button>
                  </>
                )}
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}} />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full bg-slate-50" />}>
      <AuthForm />
    </Suspense>
  )
}
