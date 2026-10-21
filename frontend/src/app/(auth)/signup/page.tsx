'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/client'
import { getURL } from '@/src/utils/helpers'
import { VaakritiSymbolVector } from '@/components/ui/VaakritiSymbolVector'
import { MoonlitPetalsCanvas } from '@/components/auth/MoonlitPetalsCanvas'

function SignupForm() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(true)
  const [capsLockActive, setCapsLockActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockActive(e.getModifierState('CapsLock'))
  }

  const handleGoogleOAuth = async () => {
    try {
      const redirectURL = getURL('/auth/callback')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectURL,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (error) throw error
    } catch (err: any) {
      toast.error(err.message || 'Failed to authenticate with Google')
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!acceptTerms) {
      toast.error('Please accept the terms of service and privacy policy.')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.')
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
          data: { full_name: fullName.trim() },
        },
      })

      if (error) {
        toast.error(error.message || 'Registration failed')
        return
      }

      if (data.user) {
        if (data.session) {
          toast.success('Workspace created! Redirecting...')
          router.push('/dashboard')
          router.refresh()
        } else {
          toast.success('Verification link sent! Please check your inbox.')
          router.push('/login')
        }
      }
    } catch (err) {
      toast.error('An unexpected error occurred during signup.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isMounted) {
    return <div className="min-h-screen w-full bg-[#030712]" />
  }

  return (
    <div className="min-h-screen w-full bg-white p-1 sm:p-1.5 lg:p-2 flex flex-col lg:flex-row gap-2 sm:gap-2.5 lg:gap-3 selection:bg-purple-500/15 selection:text-[#101828]">

      {/* ── LEFT PANEL — Moonlit Petals ── */}
      <section className="relative w-full lg:w-1/2 h-[340px] sm:h-[440px] lg:h-auto lg:min-h-[calc(100vh-1rem)] rounded-xl sm:rounded-2xl lg:rounded-[20px] overflow-hidden bg-[#030712] shrink-0 border border-slate-200/80 shadow-xs">
        <MoonlitPetalsCanvas isActive={true} speed={40} wind={18} />
      </section>

      {/* ── RIGHT PANEL — Signup Form ── */}
      <section className="relative w-full lg:w-1/2 min-h-full flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-10 py-6 sm:py-10 bg-white">
        <div className="w-full max-w-[410px] mx-auto flex flex-col items-center">

          {/* Logo */}
          <div className="mb-4 flex items-center justify-center">
            <Link href="/" className="group cursor-pointer" aria-label="Vaakriti Home">
              <VaakritiSymbolVector className="w-11 h-11 text-[#18181B] group-hover:scale-105 transition-transform duration-200" />
            </Link>
          </div>

          <h1 className="text-2xl sm:text-[28px] font-semibold text-[#18181B] tracking-tight text-center font-display mb-6">
            Create your account
          </h1>

          {/* Google OAuth */}
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

          {/* Divider */}
          <div className="w-full my-5 flex items-center justify-center gap-3">
            <div className="h-px flex-1 bg-[#E4E4E7]" />
            <span className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider">OR</span>
            <div className="h-px flex-1 bg-[#E4E4E7]" />
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSignUp} className="w-full space-y-3.5">

            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Full name (e.g., Alex Morgan)"
              className="w-full h-[48px] px-4 rounded-xl border border-[#E4E4E7] bg-white text-[#18181B] placeholder-[#A1A1AA] text-sm focus:outline-none focus:border-[#18181B] focus:ring-2 focus:ring-[#18181B]/10 transition-all"
            />

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="Work email (e.g., name@company.com)"
              className="w-full h-[48px] px-4 rounded-xl border border-[#E4E4E7] bg-white text-[#18181B] placeholder-[#A1A1AA] text-sm focus:outline-none focus:border-[#18181B] focus:ring-2 focus:ring-[#18181B]/10 transition-all"
            />

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
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

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
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {capsLockActive && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 font-medium pl-1">
                <AlertCircle className="w-3.5 h-3.5" /> Caps Lock is ON
              </p>
            )}

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
                <Link href="/terms" className="text-[#18181B] font-medium underline underline-offset-2">terms of service</Link>
                {' '}&amp;{' '}
                <Link href="/privacy" className="text-[#18181B] font-medium underline underline-offset-2">privacy policy</Link>
              </label>
            </div>

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

            <div className="pt-4 text-center text-xs text-[#71717A]">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[#18181B] hover:underline">
                Log in
              </Link>
            </div>
          </form>

        </div>
      </section>

    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-[#030712]" />}>
      <SignupForm />
    </Suspense>
  )
}
