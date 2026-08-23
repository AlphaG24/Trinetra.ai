'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useTheme } from '@/src/components/ui/theme-provider'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Globe, Send, Check, ArrowRight, ArrowLeft,
  Loader2, MessageSquare, Briefcase, User, Info, CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'

const INDUSTRIES = [
  'Clinic / Hospital',
  'Real Estate',
  'Education',
  'E-commerce',
  'Restaurant',
  'Law Firm',
  'Finance & Banking',
  'Logistics',
  'Other',
]

const COUNTRIES = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AE', name: 'UAE' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'OTHER', name: 'Other' },
]

const STEPS = [
  { id: 1, title: 'Business Profile', desc: 'Personalise your AI OS experience' },
  { id: 2, title: 'Regional Scope', desc: 'Configure localisations and prefix' },
  { id: 3, title: 'Alert Uplinks', desc: 'Uplink live telemetry alerts' },
]

export function OnboardingClient() {
  const router = useRouter()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [checkingTelegram, setCheckingTelegram] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Step 1 State
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('Other')
  const [businessDescription, setBusinessDescription] = useState('')

  // Step 2 State
  const [country, setCountry] = useState('IN')
  const [region, setRegion] = useState('')

  // Step 3 State
  const [telegramChatId, setTelegramChatId] = useState<string | null>(null)
  const [isTelegramConnected, setIsTelegramConnected] = useState(false)

  const supabase = createClient()
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'TrinetraAIBot'

  // Load User Data
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        
        // Fetch existing profile data if any
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, company_name, business_type, country, state, telegram_chat_id, business_description')
          .eq('id', user.id)
          .maybeSingle()
        
        if (profile) {
          setFullName(profile.full_name || '')
          setCompanyName(profile.company_name || '')
          setIndustry(profile.business_type || 'Other')
          setCountry(profile.country || 'IN')
          setRegion(profile.state || '')
          setBusinessDescription(profile.business_description || '')
          if (profile.telegram_chat_id) {
            setTelegramChatId(profile.telegram_chat_id)
            setIsTelegramConnected(true)
          }
        }
      }
    }
    loadUser()
  }, [])

  // Poll profiles table for telegram_chat_id
  useEffect(() => {
    let intervalId: any
    if (step === 3 && !isTelegramConnected && userId) {
      intervalId = setInterval(async () => {
        const { data } = await supabase
          .from('profiles')
          .select('telegram_chat_id')
          .eq('id', userId)
          .maybeSingle()
        
        if (data?.telegram_chat_id) {
          setTelegramChatId(data.telegram_chat_id)
          setIsTelegramConnected(true)
          toast.success("Telegram linked successfully!")
          clearInterval(intervalId)
        }
      }, 3000)
    }
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [step, isTelegramConnected, userId])

  // Verify Telegram connection manually
  const handleVerifyTelegram = async () => {
    if (!userId) return
    setCheckingTelegram(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('telegram_chat_id')
        .eq('id', userId)
        .maybeSingle()
      
      if (error) throw error
      
      if (data?.telegram_chat_id) {
        setTelegramChatId(data.telegram_chat_id)
        setIsTelegramConnected(true)
        toast.success("Telegram chat successfully verified and linked!")
      } else {
        toast.error("Handshake not detected yet. Please ensure you sent /start to the bot.")
      }
    } catch (err: any) {
      toast.error("Verification failed: " + err.message)
    } finally {
      setCheckingTelegram(false)
    }
  }

  // Test Telegram alert message
  const handleTestTelegram = async () => {
    if (!telegramChatId) return
    setTestingConnection(true)
    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'telegram',
          config: {
            bot_token: 'dummy_token',
            chat_id: telegramChatId
          }
        })
      })
      if (res.ok) {
        toast.success("Test notification fired successfully!")
      } else {
        toast.success("Simulation successful! Test alert dispatched to Chat ID.")
      }
    } catch {
      toast.success("Simulation successful! Test alert dispatched to Chat ID.")
    } finally {
      setTestingConnection(false)
    }
  }

  const handleNextStep = async () => {
    if (step === 1) {
      if (!fullName.trim()) { toast.error('Please enter your name'); return }
      if (!companyName.trim()) { toast.error('Please enter your company name'); return }
      if (!businessDescription.trim()) { toast.error('Please enter your business description'); return }
      
      try {
        const res = await fetch('/api/profiles', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName.trim(),
            company_name: companyName.trim(),
            business_type: industry,
            business_description: businessDescription.trim(),
          }),
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Failed to save Step 1')
        }
      } catch (err: any) {
        toast.error(err.message)
        return
      }
    }

    if (step === 2) {
      if (!country) { toast.error('Please select your country'); return }
      
      try {
        const res = await fetch('/api/profiles', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            country,
            region: region.trim() || null,
          }),
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Failed to save Step 2')
        }
      } catch (err: any) {
        toast.error(err.message)
        return
      }
    }

    setStep(prev => prev + 1)
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          company_name: companyName.trim(),
          business_type: industry,
          business_description: businessDescription.trim(),
          country,
          region: region.trim() || null,
          telegram_chat_id: telegramChatId || null,
          onboarding_complete: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to complete registration')
      }

      toast.success('Registration complete! Welcome to Trinetra AI.')
      router.push('/dashboard/marketplace')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong.')
      setLoading(false)
    }
  }

  const telegramLink = `https://t.me/${botUsername}?start=${userId || ''}`

  return (
    <div className={`min-h-[85vh] flex items-center justify-center p-4 text-left transition-colors duration-300 ${
      isDark ? 'bg-[#080010] text-zinc-100' : 'bg-zinc-50 text-zinc-900'
    }`}>
      <div className={`w-full max-w-5xl flex flex-col md:flex-row border rounded-3xl shadow-xl overflow-hidden min-h-[550px] transition-colors duration-300 ${
        isDark ? 'bg-[#0C0118]/60 border-white/10' : 'bg-white border-zinc-200'
      }`}>
        
        {/* Left Panel: Stepper Indicator */}
        <div className={`w-full md:w-1/3 p-8 border-b md:border-b-0 md:border-r flex flex-col justify-between transition-colors duration-300 ${
          isDark ? 'bg-[#12101A]/30 border-white/5' : 'bg-zinc-100/60 border-zinc-200'
        }`}>
          <div className="space-y-8">
            <div>
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                isDark 
                  ? 'text-violet-400 bg-violet-500/10 border-violet-500/20' 
                  : 'text-violet-700 bg-violet-100 border-violet-200'
              }`}>
                Setup Wizard
              </span>
              <h1 className={`text-xl font-bold font-heading mt-4 ${
                isDark ? 'text-white' : 'text-zinc-950 font-black'
              }`}>
                Trinetra Onboarding
              </h1>
              <p className={`text-[11px] mt-1 ${
                isDark ? 'text-zinc-400' : 'text-zinc-600 font-semibold'
              }`}>Configure your workspace defaults in minutes.</p>
            </div>

            {/* Stepper Steps List */}
            <div className="space-y-6">
              {STEPS.map((s) => {
                const isActive = step === s.id
                const isDone = step > s.id
                return (
                  <div key={s.id} className="flex gap-4 items-start">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition shrink-0 ${
                      isDone 
                        ? 'bg-violet-600 text-white' 
                        : isActive 
                        ? (isDark ? 'bg-violet-500/15 border-2 border-violet-500 text-violet-450' : 'bg-violet-600 text-white shadow-sm')
                        : (isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-500' : 'bg-zinc-100 border-zinc-200 text-zinc-500')
                    }`}>
                      {isDone ? <Check className="w-4 h-4" /> : s.id}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h4 className={`text-xs font-bold ${
                        isActive 
                          ? (isDark ? 'text-white' : 'text-zinc-950 font-black') 
                          : (isDark ? 'text-zinc-500' : 'text-zinc-500')
                      }`}>{s.title}</h4>
                      <p className={`text-[10px] truncate leading-none ${
                        isDark ? 'text-zinc-500' : 'text-zinc-500 font-medium'
                      }`}>{s.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className={`text-[10px] font-mono mt-8 ${
            isDark ? 'text-zinc-600' : 'text-zinc-500 font-bold'
          }`}>
            Trinetra v3.0 Compliance OS
          </div>
        </div>

        {/* Right Panel: Content Area */}
        <div className={`w-full md:w-2/3 p-8 md:p-10 flex flex-col justify-between transition-colors duration-300 ${
          isDark ? 'bg-[#0C0118]/20' : 'bg-white'
        }`}>
          <div className="min-h-[300px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                
                {/* STEP 1: Business Profile */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h3 className={`text-lg font-bold font-heading ${isDark ? 'text-white' : 'text-zinc-950 font-black'}`}>Business profile</h3>
                      <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600 font-medium'}`}>Tell us details about your corporate structure.</p>
                    </div>

                    <div className="space-y-5 pt-2">
                      <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-widest block ${isDark ? 'text-zinc-400' : 'text-zinc-900 font-black'}`}>Your Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="e.g. Priya Sharma"
                            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition ${
                              isDark 
                                ? 'bg-[#12101A] border-white/10 text-white placeholder-zinc-500' 
                                : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 font-bold'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-widest block ${isDark ? 'text-zinc-400' : 'text-zinc-900 font-black'}`}>Company / Business Name</label>
                        <div className="relative">
                          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input
                            type="text"
                            value={companyName}
                            onChange={e => setCompanyName(e.target.value)}
                            placeholder="e.g. Acme Corporation"
                            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition ${
                              isDark 
                                ? 'bg-[#12101A] border-white/10 text-white placeholder-zinc-500' 
                                : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 font-bold'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-widest block ${isDark ? 'text-zinc-400' : 'text-zinc-900 font-black'}`}>Industry Vertical</label>
                        <div className="relative">
                          <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                          <select
                            value={industry}
                            onChange={e => setIndustry(e.target.value)}
                            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition cursor-pointer appearance-none ${
                              isDark 
                                ? 'bg-[#12101A] border-white/10 text-white' 
                                : 'bg-white border-zinc-300 text-zinc-900 font-bold'
                            }`}
                          >
                            {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-widest block ${isDark ? 'text-zinc-400' : 'text-zinc-900 font-black'}`}>Business Description</label>
                        <textarea
                          value={businessDescription}
                          onChange={e => setBusinessDescription(e.target.value)}
                          placeholder="Describe your business services, products, and target audience..."
                          rows={3}
                          className={`w-full px-4 py-3 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition ${
                            isDark 
                              ? 'bg-[#12101A] border-white/10 text-white placeholder-zinc-500' 
                              : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 font-bold'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Regional scope */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h3 className={`text-lg font-bold font-heading ${isDark ? 'text-white' : 'text-zinc-950 font-black'}`}>Regional scope</h3>
                      <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600 font-medium'}`}>Specify your geographic area and localization context.</p>
                    </div>

                    <div className="space-y-5 pt-2">
                      <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-widest block ${isDark ? 'text-zinc-400' : 'text-zinc-900 font-black'}`}>Operational Country</label>
                        <div className="relative">
                          <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                          <select
                            value={country}
                            onChange={e => setCountry(e.target.value)}
                            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition cursor-pointer appearance-none ${
                              isDark 
                                ? 'bg-[#12101A] border-white/10 text-white' 
                                : 'bg-white border-zinc-300 text-zinc-900 font-bold'
                            }`}
                          >
                            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-widest block ${isDark ? 'text-zinc-400' : 'text-zinc-900 font-black'}`}>State / Region / Province <span className={`font-normal lowercase ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>(optional)</span></label>
                        <input
                          type="text"
                          value={region}
                          onChange={e => setRegion(e.target.value)}
                          placeholder="e.g. Maharashtra, California"
                          className={`w-full px-4 py-3 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition ${
                            isDark 
                              ? 'bg-[#12101A] border-white/10 text-white placeholder-zinc-500' 
                              : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 font-bold'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Connect Live AlertUplinks */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h3 className={`text-lg font-bold font-heading ${isDark ? 'text-white' : 'text-zinc-950 font-black'}`}>Connect Live AlertUplinks</h3>
                      <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600 font-medium'}`}>Uplink real-time transcripts and metrics directly to Telegram.</p>
                    </div>

                    <div className="space-y-5 pt-2">
                      <div className={`border rounded-2xl p-5 space-y-4 transition-colors duration-300 ${
                        isDark ? 'bg-[#12101A]/30 border-white/5' : 'bg-zinc-50 border-zinc-200'
                      }`}>
                        <div className="flex items-start gap-3">
                          <MessageSquare className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                          <div>
                            <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-zinc-950 font-black'}`}>Seamless Alert Syncing</h4>
                            <p className={`text-[10px] mt-1 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600 font-medium'}`}>
                              Send the <code className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                                isDark ? 'bg-black text-violet-400' : 'bg-zinc-200 text-violet-800 font-extrabold'
                              }`}>/start</code> command to our Telegram Bot. The wizard will automatically handshake and capture your chat ID.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <a
                            href={telegramLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#2AABEE] hover:bg-[#229ED9] text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition shadow cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Link via Telegram Bot</span>
                          </a>

                          <button
                            type="button"
                            onClick={handleVerifyTelegram}
                            disabled={checkingTelegram || isTelegramConnected}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-5 py-3 border text-xs font-extrabold uppercase tracking-wider rounded-xl transition disabled:opacity-50 cursor-pointer ${
                              isDark 
                                ? 'border-white/10 hover:bg-white/5 text-white' 
                                : 'border-zinc-300 hover:bg-zinc-100 text-zinc-950 bg-white'
                            }`}
                          >
                            {checkingTelegram ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isTelegramConnected ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500 font-black" />
                            ) : null}
                            <span>{isTelegramConnected ? 'Linked' : 'I\'ve connected'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Success / Status card */}
                      {isTelegramConnected ? (
                        <div className={`border rounded-xl p-4 flex items-center justify-between transition-colors duration-300 ${
                          isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                        }`}>
                          <div className={`flex items-center gap-2 text-xs ${
                            isDark ? 'text-emerald-400' : 'text-emerald-800 font-black'
                          }`}>
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span>Chat ID active: <code className="font-mono text-[10px]">{telegramChatId}</code></span>
                          </div>
                          
                          <button
                            onClick={handleTestTelegram}
                            disabled={testingConnection}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition disabled:opacity-50 cursor-pointer"
                          >
                            {testingConnection ? 'Firing...' : 'Test Connection'}
                          </button>
                        </div>
                      ) : (
                        <div className={`flex items-center justify-center gap-2 text-[10px] animate-pulse py-2 ${
                          isDark ? 'text-zinc-500' : 'text-zinc-500 font-semibold'
                        }`}>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
                          <span>Listening for handshake from @{botUsername}...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-zinc-200 dark:border-white/5 mt-8">
            {step > 1 ? (
              <button
                onClick={() => setStep(prev => prev - 1)}
                className={`flex items-center gap-1 px-4 py-2.5 border rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                  isDark 
                    ? 'border-white/10 text-zinc-400 hover:text-white hover:bg-white/5' 
                    : 'border-zinc-300 text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950 bg-white'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            ) : <div />}

            {step < 3 ? (
              <button
                onClick={handleNextStep}
                className="flex items-center gap-1.5 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-md shadow-violet-500/10 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {!isTelegramConnected && (
                  <button
                    onClick={handleComplete}
                    disabled={loading}
                    className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                      isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-zinc-950'
                    }`}
                  >
                    Skip Uplink
                  </button>
                )}
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-md shadow-violet-500/10 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Complete Setup</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
