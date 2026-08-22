'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Bot, Sparkles, Building, Briefcase, Users, LayoutList, Loader2, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface AgentSetupWizardClientProps {
  agent: {
    id: string
    name: string
    system_prompt: string | null
  }
  profile: {
    id: string
    company_name: string | null
    business_type: string | null
    business_description: string | null
  }
  bundleAgents?: any[]
}

export function AgentSetupWizardClient({ agent, profile, bundleAgents = [] }: AgentSetupWizardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const isBundleMode = searchParams?.get('bundle') === 'true' && bundleAgents && bundleAgents.length > 0
  const [useSameProfile, setUseSameProfile] = useState(true)

  // Form states pre-filled from profile
  const [businessName, setBusinessName] = useState(profile.company_name || '')
  const [industry, setIndustry] = useState(profile.business_type || '')
  const [servicesOffered, setServicesOffered] = useState('')
  const [targetAudience, setTargetAudience] = useState('')

  const [step, setStep] = useState(1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Build the updated system prompt
      const contextBlock = `=== BUSINESS CONTEXT ===
Business Name: ${businessName}
Industry: ${industry}
Services Offered: ${servicesOffered}
Target Audience: ${targetAudience}
========================\n\n`

      // 2. Determine target agents
      const targetAgents = (isBundleMode && useSameProfile)
        ? bundleAgents
        : [agent]

      await Promise.all(targetAgents.map(async (currAgent) => {
        const existingPrompt = currAgent.system_prompt || ''
        // Strip any existing BUSINESS CONTEXT block
        const cleanPrompt = existingPrompt.replace(/=== BUSINESS CONTEXT ===[\s\S]*?========================\n\n/, '')
        const newPrompt = contextBlock + cleanPrompt

        // Update agent table record
        const { error: agentErr } = await supabase
          .from('agents')
          .update({
            system_prompt: newPrompt
          })
          .eq('id', currAgent.id)

        if (agentErr) throw agentErr
      }))

      // 3. Update profile record with business details
      const descText = `Services: ${servicesOffered} | Audience: ${targetAudience}`
      try {
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({
            company_name: businessName,
            business_type: industry,
            business_description: descText.slice(0, 500)
          })
          .eq('id', profile.id)

        if (profileErr) {
          if (profileErr.code === 'PGRST204' || profileErr.message?.includes('business_description')) {
            console.warn('[Wizard] profiles.business_description missing in schema, retrying without it')
            const { error: retryErr } = await supabase
              .from('profiles')
              .update({
                company_name: businessName,
                business_type: industry
              })
              .eq('id', profile.id)
            if (retryErr) throw retryErr
          } else {
            throw profileErr
          }
        }
      } catch (err: any) {
        console.error('[Wizard] Failed to update profile:', err)
        // If the error does not relate to missing column, rethrow
        if (!err.message?.includes('business_description') && err.code !== 'PGRST204') {
          throw err
        }
      }

      toast.success(
        (isBundleMode && useSameProfile)
          ? `All ${bundleAgents.length} agents compiled successfully!`
          : 'Agent system prompt compiled successfully!'
      )
      router.push(`/dashboard/agents/${agent.id}`)
      router.refresh()
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to save setup data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 font-montserrat">
      {/* Wizard Header */}
      <div className="text-center space-y-3 mb-10">
        <div className="w-14 h-14 bg-violet-600/10 border border-violet-500/30 rounded-2xl flex items-center justify-center text-violet-400 mx-auto shadow-lg">
          <Sparkles className="w-7 h-7 animate-pulse" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--heading)] tracking-tight leading-tight" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
          Configure Your Premium Assistant
        </h1>
        <p className="text-xs text-[var(--muted)] leading-relaxed max-w-md mx-auto">
          Help your autonomous AI voice agent understand your business context, services, and core target audience.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-8 max-w-xs mx-auto">
        <div className="flex items-center gap-2">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-violet-600 text-white' : 'bg-[var(--background)] border border-[var(--border)] text-[var(--muted)]'}`}>
            1
          </span>
          <span className="text-[10px] uppercase font-bold text-[var(--heading)] tracking-wider">Business</span>
        </div>
        <div className="flex-1 h-0.5 bg-[var(--border)] mx-3" />
        <div className="flex items-center gap-2">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-violet-600 text-white' : 'bg-[var(--background)] border border-[var(--border)] text-[var(--muted)]'}`}>
            2
          </span>
          <span className="text-[10px] uppercase font-bold text-[var(--heading)] tracking-wider">Services</span>
        </div>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        
        {isBundleMode && (
          <div className="p-4 bg-violet-950/20 border border-violet-500/20 rounded-2xl space-y-3">
            <div className="text-[10px] uppercase font-bold text-violet-400 tracking-wider">📦 Purchased Bundle Agents</div>
            <div className="flex flex-wrap gap-2">
              {bundleAgents.map((a: any) => (
                <div key={a.id} className="flex items-center gap-1.5 px-3 py-1 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] font-semibold">
                  <Bot className="w-3.5 h-3.5 text-violet-400" />
                  <span>{a.name.replace(/^\[[^\]]+\]\s*/, '')}</span>
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-2.5 pt-2 border-t border-[var(--border)]">
              <input 
                type="checkbox" 
                id="useSameProfile"
                checked={useSameProfile}
                onChange={(e) => setUseSameProfile(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] text-violet-600 focus:ring-violet-500 bg-[var(--background)]"
              />
              <label htmlFor="useSameProfile" className="text-xs font-bold text-[var(--heading)] select-none">
                Use same business profile for all agents?
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
              <Building className="w-4 h-4 text-violet-400" />
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-[var(--heading)]">Business Settings</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-widest text-[var(--heading)] mb-2">
                  Business / Company Name
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--heading)] text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-600 transition-all font-semibold shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-widest text-[var(--heading)] mb-2">
                  Industry / Business Type
                </label>
                <input
                  type="text"
                  required
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Healthcare, Legal Services, Real Estate..."
                  className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--heading)] text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-600 transition-all font-semibold shadow-inner"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (businessName.trim() && industry.trim()) {
                  setStep(2)
                } else {
                  toast.error('Please enter Business Name and Industry to proceed.')
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-555 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
              <Briefcase className="w-4 h-4 text-violet-400" />
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-[var(--heading)]">Services & Audience</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-widest text-[var(--heading)] mb-2">
                  What services do you offer?
                </label>
                <textarea
                  required
                  value={servicesOffered}
                  onChange={(e) => setServicesOffered(e.target.value)}
                  placeholder="We schedule dental appointments, explain pricing plans, and capture inbound lead intents..."
                  rows={3}
                  className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--heading)] text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-600 transition-all font-semibold shadow-inner resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-widest text-[var(--heading)] mb-2">
                  Target Audience
                </label>
                <textarea
                  required
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Local patients needing cosmetic dentistry, new homeowners needing insurance quotes..."
                  rows={3}
                  className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--heading)] text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-600 transition-all font-semibold shadow-inner resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl border border-[var(--border)] bg-transparent text-[var(--body)] hover:text-[var(--heading)] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-555 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 animate-pulse" />}
                <span>{loading ? 'Compiling Prompt...' : 'Complete & Save'}</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
