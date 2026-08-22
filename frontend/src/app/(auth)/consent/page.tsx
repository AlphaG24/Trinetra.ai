'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Check, Loader2, Sparkles, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/utils/supabase/client'

export default function ConsentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Checkbox states
  const [personalConsent, setPersonalConsent] = useState(false)
  const [recordingsConsent, setRecordingsConsent] = useState(false)
  const [termsAgreement, setTermsAgreement] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function checkConsentStatus() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          router.push('/login')
          return
        }

        // Fetch role to determine admin bypass
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        const role = profile?.role || 'client'

        // Admins never need to consent — send them directly to admin panel
        if (role === 'admin' || role === 'super_admin') {
          router.push('/admin')
          return
        }

        // Check consent via consent_records (source of truth — profiles.consented may not exist yet)
        const { data: consentRecord } = await supabase
          .from('consent_records')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (consentRecord) {
          // Already consented — go to dashboard
          router.push('/dashboard')
          return
        }

        // Not yet consented — show the form
        setChecking(false)
      } catch (err: any) {
        console.error('Error verifying consent records:', err)
        setErrorMsg('Failed to verify existing consent status: ' + err.message)
        setChecking(false)
      }
    }
    checkConsentStatus()
  }, [router, supabase])


  // Continue button enabled only if all 3 checkboxes are checked
  const canContinue = personalConsent && recordingsConsent && termsAgreement

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canContinue) {
      toast.error("Please accept all required consent terms to proceed.")
      return
    }

    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordings_consent: recordingsConsent
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit consent")
      }

      toast.success("Consent recorded successfully!")
      router.push('/dashboard')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "Failed to record consent. Please try again.")
      toast.error(err.message || "Failed to record consent. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#080010] flex items-center justify-center p-6 text-zinc-850 dark:text-zinc-100 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="text-center space-y-4 relative z-10">
          <Loader2 className="w-10 h-10 animate-spin text-violet-500 mx-auto" />
          <p className="text-sm text-zinc-500 dark:text-zinc-455">Verifying authorization status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#080010] flex items-center justify-center p-6 text-zinc-850 dark:text-zinc-100 selection:bg-violet-500/30 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg bg-white dark:bg-[#0C0118]/60 border border-zinc-200 dark:border-white/10 rounded-3xl p-8 shadow-2xl space-y-8 relative z-10 animate-in fade-in duration-300">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 mx-auto">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Data Consent</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 uppercase tracking-widest font-semibold">DPDP Act 2023 Compliance</p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3 text-xs text-rose-600 dark:text-rose-400 items-start">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="space-y-1">
              <span className="font-bold block">Status Error:</span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Notice Content */}
        <div className="bg-zinc-100 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 rounded-2xl p-5 space-y-3 text-xs leading-relaxed text-zinc-650 dark:text-zinc-400">
          <p>
            Trinetra AI collects and processes your personal data to provide AI voice agent services. 
            This includes your name, email, phone number, business details, and call recordings.
          </p>
          <p>
            Your data is encrypted (AES-256), stored securely, and never shared without consent. 
            You can request deletion at any time from your dashboard settings.
          </p>
        </div>

        {/* Form checkboxes */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            
            {/* 1. Required Personal Consent */}
            <label className="flex gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={personalConsent}
                onChange={(e) => setPersonalConsent(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                personalConsent 
                  ? 'bg-violet-650 border-violet-600 text-white' 
                  : 'bg-white dark:bg-[#12101A] border-zinc-200 dark:border-white/10 group-hover:border-zinc-300 dark:group-hover:border-white/20'
              }`}>
                {personalConsent && <Check className="w-3.5 h-3.5" />}
              </div>
              <span className="text-xs text-zinc-700 dark:text-zinc-300 select-none leading-relaxed">
                I consent to Trinetra AI processing my personal data for service delivery <span className="text-rose-500 font-bold">*</span>
              </span>
            </label>

            {/* 2. Required Recordings Consent */}
            <label className="flex gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={recordingsConsent}
                onChange={(e) => setRecordingsConsent(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                recordingsConsent 
                  ? 'bg-violet-650 border-violet-600 text-white' 
                  : 'bg-white dark:bg-[#12101A] border-zinc-200 dark:border-white/10 group-hover:border-zinc-300 dark:group-hover:border-white/20'
              }`}>
                {recordingsConsent && <Check className="w-3.5 h-3.5" />}
              </div>
              <span className="text-xs text-zinc-700 dark:text-zinc-300 select-none leading-relaxed">
                I consent to call recordings for agent execution, transcriptions, and quality improvements <span className="text-rose-500 font-bold">*</span>
              </span>
            </label>

            {/* 3. Required Terms & Privacy Agreement */}
            <label className="flex gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={termsAgreement}
                onChange={(e) => setTermsAgreement(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                termsAgreement 
                  ? 'bg-violet-650 border-violet-600 text-white' 
                  : 'bg-white dark:bg-[#12101A] border-zinc-200 dark:border-white/10 group-hover:border-zinc-300 dark:group-hover:border-white/20'
              }`}>
                {termsAgreement && <Check className="w-3.5 h-3.5" />}
              </div>
              <span className="text-xs text-zinc-700 dark:text-zinc-300 select-none leading-relaxed">
                I agree to the <a href="/terms" target="_blank" className="text-violet-600 dark:text-violet-400 hover:underline">Terms of Service</a> and <a href="/privacy" target="_blank" className="text-violet-600 dark:text-violet-400 hover:underline">Privacy Policy</a> <span className="text-rose-500 font-bold">*</span>
              </span>
            </label>

          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canContinue || loading}
            className="w-full py-3.5 bg-violet-650 hover:bg-violet-600 text-white font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 group shadow-md shadow-violet-500/10 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span>Confirm &amp; Continue</span>
            )}
          </button>
        </form>

      </div>
    </div>
  )
}

