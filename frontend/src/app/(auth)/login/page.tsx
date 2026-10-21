'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Eye, 
  EyeOff, 
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/client'
import { getURL } from '@/src/utils/helpers'
import { VaakritiSymbolVector } from '@/components/ui/VaakritiSymbolVector'
import { AuthArtSwitcher } from '@/components/auth/AuthArtSwitcher'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Mode: 'signin' by default; switches to 'signup' when requested
  const initialMode = searchParams?.get('mode') === 'signup' || searchParams?.get('tab') === 'signup' ? 'signup' : 'signin'
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode)

  // Form Fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(true)
  const [rememberMe, setRememberMe] = useState(true)
  const [capsLockActive, setCapsLockActive] = useState(false)

  // State
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Expired session notification
  useEffect(() => {
    if (searchParams?.get('expired') === 'true') {
      toast.error('Your session has expired. Please sign in again.')
      const url = new URL(window.location.href)
      url.searchParams.delete('expired')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  // CapsLock Detection
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
        email: email.trim(),
        password,
      })

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast.error('Please check your email and verify your account before signing in.')
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

        if (redirectParam && redirectParam.startsWith('/') && redirectParam !== '/' && !redirectParam.startsWith('/login')) {
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
          } catch (err) {
            console.error('Malformed redirectParam:', err)
          }
        }

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

    if (!acceptTerms) {
      toast.error('Please accept the terms of service and privacy policy to continue.')
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      return
    }

    if (confirmPassword && password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setIsLoading(true)

    try {
      const redirectURL = getURL('/auth/callback')
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectURL,
          data: {
            full_name: fullName.trim(),
          },
        },
      })

      if (error) {
        toast.error(error.message || 'Registration failed')
        console.error('Sign-up failed:', error)
        return
      }

      if (data.user) {
        if (data.session) {
          toast.success('Workspace created successfully! Redirecting...')
          router.push('/dashboard')
          router.refresh()
        } else {
          toast.success('Verification link sent! Please check your inbox.')
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
    return <div className="min-h-screen w-full bg-white" />
  }

  return (
    <div className="min-h-screen w-full bg-white p-1 sm:p-1.5 lg:p-2 flex flex-col lg:flex-row gap-2 sm:gap-2.5 lg:gap-3 selection:bg-[#245CFF]/15 selection:text-[#101828]">

      {/* ─────────────────────────────────────────────────────────────
          LEFT PANEL — CRISP LIVING GLOBE WITH PIXEL DISPERSION PHYSICS
          100% crisp high-DPI pixels, NO blur, interactive hover animation
          NO logo, NO text on artwork as requested
         ───────────────────────────────────────────────────────────── */}
      <section className="relative w-full lg:w-1/2 h-[340px] sm:h-[440px] lg:h-auto lg:min-h-[calc(100vh-1rem)] rounded-xl sm:rounded-2xl lg:rounded-[20px] overflow-hidden bg-[#030712] shrink-0 border border-slate-200/80 shadow-xs">
        <AuthArtSwitcher />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANEL — MINIMALIST AUTHENTICATION INTERFACE
          Decreased side borders, centered emblem, crisp pill controls
         ───────────────────────────────────────────────────────────── */}
      <section className="relative w-full lg:w-1/2 min-h-full flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-10 py-6 sm:py-10 bg-white">
        
        <div className="w-full max-w-[410px] mx-auto flex flex-col items-center">

          {/* 1. Official Emblem Vector on Top Center */}
          <div className="mb-4 flex items-center justify-center">
            <Link href="/" className="group cursor-pointer" aria-label="Vaakriti Home">
              <VaakritiSymbolVector className="w-11 h-11 text-[#18181B] group-hover:scale-105 transition-transform duration-200" />
            </Link>
          </div>

          {/* 2. Editorial Heading */}
          <h1 className="text-2xl sm:text-[28px] font-semibold text-[#18181B] tracking-tight text-center font-display mb-6">
            {authMode === 'signin' ? 'Log into your account' : 'Create your account'}
          </h1>

          {/* 3. Primary Social Continue Button (Pill shape) */}
          <button
            type="button"
            onClick={handleGoogleOAuth}
            className="w-full h-[48px] rounded-full bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#18181B] font-medium text-sm flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer shadow-2xs border border-transparent hover:border-[#D4D4D8]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* 4. Elegant OR Divider */}
          <div className="w-full my-5 flex items-center justify-center gap-3">
            <div className="h-px flex-1 bg-[#E4E4E7]" />
            <span className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider">
              OR
            </span>
            <div className="h-px flex-1 bg-[#E4E4E7]" />
          </div>

          {/* 5. Authentication Form */}
          {authMode === 'signin' ? (
            /* ─────────── LOG IN FORM ─────────── */
            <form onSubmit={handleSignIn} className="w-full space-y-3.5">
              
              {/* Email Input */}
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="e.g., name@company.com"
                  className="w-full h-[48px] px-4 rounded-xl border border-[#E4E4E7] bg-white text-[#18181B] placeholder-[#A1A1AA] text-sm focus:outline-none focus:border-[#18181B] focus:ring-2 focus:ring-[#18181B]/10 transition-all"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="w-full h-[48px] pl-4 pr-11 rounded-xl border border-[#E4E4E7] bg-white text-[#18181B] placeholder-[#A1A1AA] text-sm focus:outline-none focus:border-[#18181B] focus:ring-2 focus:ring-[#18181B]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B] transition-colors p-1 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {capsLockActive && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-600 font-medium pl-1 pt-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Caps Lock is ON
                  </p>
                )}
              </div>

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-[#71717A] hover:text-[#18181B] select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#D4D4D8] text-[#18181B] focus:ring-[#18181B] cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
                <Link
                  href="/reset-password"
                  className="font-medium text-[#71717A] hover:text-[#18181B] hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Terms checkbox */}
              <div className="flex items-start gap-2 pt-1 text-xs text-[#71717A]">
                <input
                  type="checkbox"
                  id="login-terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-[#D4D4D8] text-[#18181B] focus:ring-[#18181B] cursor-pointer"
                />
                <label htmlFor="login-terms" className="cursor-pointer select-none leading-relaxed">
                  I accept the{' '}
                  <Link href="/terms" className="text-[#18181B] font-medium underline underline-offset-2">
                    terms of service
                  </Link>{' '}
                  &amp;{' '}
                  <Link href="/privacy" className="text-[#18181B] font-medium underline underline-offset-2">
                    privacy policy
                  </Link>
                </label>
              </div>

              {/* Primary Continue Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[48px] mt-2 rounded-xl bg-[#27272A] hover:bg-[#18181B] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Continuing...</span>
                  </>
                ) : (
                  <span>Continue</span>
                )}
              </button>

              {/* Bottom Switch Link */}
              <div className="pt-4 text-center text-xs text-[#71717A]">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className="font-semibold text-[#18181B] hover:underline cursor-pointer ml-1"
                >
                  Create one
                </button>
              </div>
            </form>
          ) : (
            /* ─────────── SIGN UP FORM ─────────── */
            <form onSubmit={handleSignUp} className="w-full space-y-3.5">
              
              {/* Full Name */}
              <div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Full name (e.g., Alex Morgan)"
                  className="w-full h-[48px] px-4 rounded-xl border border-[#E4E4E7] bg-white text-[#18181B] placeholder-[#A1A1AA] text-sm focus:outline-none focus:border-[#18181B] focus:ring-2 focus:ring-[#18181B]/10 transition-all"
                />
              </div>

              {/* Work Email */}
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="Work email (e.g., name@company.com)"
                  className="w-full h-[48px] px-4 rounded-xl border border-[#E4E4E7] bg-white text-[#18181B] placeholder-[#A1A1AA] text-sm focus:outline-none focus:border-[#18181B] focus:ring-2 focus:ring-[#18181B]/10 transition-all"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Create password (min 8 characters)"
                  className="w-full h-[48px] pl-4 pr-11 rounded-xl border border-[#E4E4E7] bg-white text-[#18181B] placeholder-[#A1A1AA] text-sm focus:outline-none focus:border-[#18181B] focus:ring-2 focus:ring-[#18181B]/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B] transition-colors p-1 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Confirm password"
                  className="w-full h-[48px] pl-4 pr-11 rounded-xl border border-[#E4E4E7] bg-white text-[#18181B] placeholder-[#A1A1AA] text-sm focus:outline-none focus:border-[#18181B] focus:ring-2 focus:ring-[#18181B]/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B] transition-colors p-1 cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-2 pt-1 text-xs text-[#71717A]">
                <input
                  type="checkbox"
                  id="signup-terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  required
                  className="w-4 h-4 mt-0.5 rounded border-[#D4D4D8] text-[#18181B] focus:ring-[#18181B] cursor-pointer"
                />
                <label htmlFor="signup-terms" className="cursor-pointer select-none leading-relaxed">
                  I accept the{' '}
                  <Link href="/terms" className="text-[#18181B] font-medium underline underline-offset-2">
                    terms of service
                  </Link>{' '}
                  &amp;{' '}
                  <Link href="/privacy" className="text-[#18181B] font-medium underline underline-offset-2">
                    privacy policy
                  </Link>
                </label>
              </div>

              {/* Primary Continue Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[48px] mt-2 rounded-xl bg-[#27272A] hover:bg-[#18181B] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <span>Create account</span>
                )}
              </button>

              {/* Bottom Switch Link */}
              <div className="pt-4 text-center text-xs text-[#71717A]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="font-semibold text-[#18181B] hover:underline cursor-pointer ml-1"
                >
                  Log in
                </button>
              </div>
            </form>
          )}

        </div>
      </section>

    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-white" />}>
      <AuthForm />
    </Suspense>
  )
}
