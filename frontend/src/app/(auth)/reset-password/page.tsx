'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/client'
import { VaakritiSymbolVector } from '@/components/ui/VaakritiSymbolVector'
import { AuthArtSwitcher } from '@/components/auth/AuthArtSwitcher'

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
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })

      if (error) {
        toast.error(error.message || 'Failed to send reset email.')
        return
      }

      toast.success('Password reset email sent! Check your inbox.')
      router.push('/login')
    } catch {
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
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isMounted || checkingSession) {
    return <div className="min-h-screen w-full bg-white" />
  }

  return (
    <div className="min-h-screen w-full bg-white p-1 sm:p-1.5 lg:p-2 flex flex-col lg:flex-row gap-2 sm:gap-2.5 lg:gap-3 selection:bg-[#245CFF]/15 selection:text-[#101828]">

      {/* ─────────────────────────────────────────────────────────────
          LEFT PANEL — CRISP LIVING GLOBE WITH PIXEL DISPERSION PHYSICS
          100% crisp high-DPI pixels, NO blur, interactive hover animation
         ───────────────────────────────────────────────────────────── */}
      <section className="relative w-full lg:w-1/2 h-[340px] sm:h-[440px] lg:h-auto lg:min-h-[calc(100vh-1rem)] rounded-xl sm:rounded-2xl lg:rounded-[20px] overflow-hidden bg-[#030712] shrink-0 border border-slate-200/80 shadow-xs">
        <AuthArtSwitcher />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANEL — RECOVERY INTERFACE (50% WIDTH ON DESKTOP)
         ───────────────────────────────────────────────────────────── */}
      <section className="relative w-full lg:w-1/2 min-h-full flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-10 py-6 sm:py-10 bg-white">
        
        <div className="w-full max-w-[410px] mx-auto flex flex-col items-center">

          {/* Emblem on Top Center */}
          <div className="mb-4 flex items-center justify-center">
            <Link href="/" className="group cursor-pointer" aria-label="Vaakriti Home">
              <VaakritiSymbolVector className="w-11 h-11 text-[#18181B] group-hover:scale-105 transition-transform duration-200" />
            </Link>
          </div>

          {user ? (
            /* Set New Password */
            <>
              <h1 className="text-2xl sm:text-[28px] font-semibold text-[#18181B] tracking-tight text-center font-display mb-2">
                Set new password
              </h1>
              <p className="text-sm text-[#71717A] text-center mb-6">
                Configure a strong new password (minimum 12 characters).
              </p>

              <form onSubmit={handleUpdatePassword} className="w-full space-y-3.5">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={12}
                    placeholder="New password (min 12 chars)"
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

                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={12}
                    placeholder="Confirm new password"
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

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[48px] mt-2 rounded-xl bg-[#27272A] hover:bg-[#18181B] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Request Recovery Link */
            <>
              <h1 className="text-2xl sm:text-[28px] font-semibold text-[#18181B] tracking-tight text-center font-display mb-2">
                Reset your password
              </h1>
              <p className="text-sm text-[#71717A] text-center mb-6">
                Enter your work email and we&apos;ll send you a recovery link.
              </p>

              <form onSubmit={handleReset} className="w-full space-y-3.5">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="e.g., name@company.com"
                    className="w-full h-[48px] px-4 rounded-xl border border-[#E4E4E7] bg-white text-[#18181B] placeholder-[#A1A1AA] text-sm focus:outline-none focus:border-[#18181B] focus:ring-2 focus:ring-[#18181B]/10 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[48px] mt-2 rounded-xl bg-[#27272A] hover:bg-[#18181B] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending link...</span>
                    </>
                  ) : (
                    <span>Send Recovery Link</span>
                  )}
                </button>

                <div className="pt-4 text-center text-xs text-[#71717A]">
                  Remember your password?{' '}
                  <Link
                    href="/login"
                    className="font-semibold text-[#18181B] hover:underline cursor-pointer ml-1"
                  >
                    Back to log in
                  </Link>
                </div>
              </form>
            </>
          )}

        </div>
      </section>

    </div>
  )
}
