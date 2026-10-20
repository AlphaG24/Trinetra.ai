'use client'

import { useState } from 'react'
import { 
  Bot, Calendar, Cpu, ChevronRight, CheckCircle2, Loader2,
  Target, Activity, Box, AlignLeft, Zap, Shield, PhoneCall 
} from 'lucide-react'
import { toast } from 'sonner'

interface PlatformService {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  icon_url: string | null
  subdomain_url: string | null
  ui_config: any
  created_at: string
  is_active: boolean
  is_visible_in_marketplace: boolean
  is_demo_allowed: boolean
  demo_limit_config: any
  marketplace_metadata: any
}

interface DeployPageClientProps {
  user: {
    id: string
    email?: string
  }
  services: PlatformService[]
}

export function DeployPageClient({ user, services }: DeployPageClientProps) {
  const [selectedAgentId, setSelectedAgentId] = useState(() => {
    return services.length > 0 ? services[0].id : ''
  })
  const [estimatedScale, setEstimatedScale] = useState('1,000 - 10,000 monthly executions / calls')
  const [currentStack, setCurrentStack] = useState('')
  const [requirements, setRequirements] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formspreeEndpoint = process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT || "https://formspree.io/f/mjgnkbay"
    const selectedAgent = services.find(s => s.id === selectedAgentId)

    try {
      const response = await fetch(formspreeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          agentId: selectedAgentId,
          agentName: selectedAgent?.name || '',
          estimatedScale,
          currentStack,
          requirements
        })
      })

      if (response.ok) {
        setIsSuccess(true)
        toast.success("Deployment request submitted successfully!")
      } else {
        throw new Error("Submission failed")
      }
    } catch (err) {
      console.error("Submission failed:", err)
      toast.error("Failed to submit request. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-64px)] pb-16 space-y-8 animate-fade-in text-zinc-900 dark:text-zinc-100">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
          <Bot className="w-6 h-6 text-zinc-900 dark:text-white" />
          Deploy Custom Agent
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
          Submit custom deployment specifications or schedule an onboarding session with our technical team.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Form Card */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 shadow-sm relative overflow-hidden">
          
          {!isSuccess ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-zinc-500" />
                  Custom Deployment Specifications
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Select Autonomous Agent */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                    Select Agent Template
                  </label>
                  <div className="relative">
                    <Target className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <select
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      className="w-full py-2.5 pl-10 pr-10 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white appearance-none cursor-pointer"
                    >
                      {services.length === 0 ? (
                        <option value="">General Custom Voice Agent</option>
                      ) : (
                        services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-zinc-400">
                      <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                    </div>
                  </div>
                </div>

                {/* Estimated Monthly Execution Scale */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                    Estimated Monthly Call Volume
                  </label>
                  <div className="relative">
                    <Activity className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <select
                      value={estimatedScale}
                      onChange={(e) => setEstimatedScale(e.target.value)}
                      className="w-full py-2.5 pl-10 pr-10 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white appearance-none cursor-pointer"
                    >
                      <option value="1,000 - 10,000 monthly calls">1,000 - 10,000 monthly calls</option>
                      <option value="10,000 - 50,000 monthly calls">10,000 - 50,000 monthly calls</option>
                      <option value="50,000 - 250,000 monthly calls">50,000 - 250,000 monthly calls</option>
                      <option value="250,000+ (High Volume)">250,000+ (High Volume)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-zinc-400">
                      <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                    </div>
                  </div>
                </div>

                {/* Current CRM / Software Stack */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                    Existing Software &amp; CRM Tools
                  </label>
                  <div className="relative">
                    <Box className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input
                      type="text"
                      value={currentStack}
                      onChange={(e) => setCurrentStack(e.target.value)}
                      placeholder="e.g. Salesforce, HubSpot, Zoho, Custom ERP, Webhooks..."
                      required
                      className="w-full py-2.5 pl-10 pr-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition-colors"
                    />
                  </div>
                </div>

                {/* Additional Requirements */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                    Custom Business Logic &amp; Integration Goals
                  </label>
                  <div className="relative">
                    <AlignLeft className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <textarea
                      rows={3}
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                      placeholder="Describe your workflows, telephony carriers, languages, or specific objectives..."
                      className="w-full py-2.5 pl-10 pr-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition-colors resize-none"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting Request...
                    </>
                  ) : (
                    <>Submit Request &rarr;</>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-4 animate-scale-in">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Request Received</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-sm">
                  Our technical team has received your parameters and will get in touch within 24 hours.
                </p>
              </div>
              <button
                onClick={() => setIsSuccess(false)}
                className="text-xs text-zinc-700 dark:text-zinc-300 hover:underline font-semibold cursor-pointer"
              >
                Submit another request
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Direct Discovery */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="inline-flex px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-bold uppercase tracking-wider rounded-md">
              Direct Assistance
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              Technical Discovery Session
            </h3>

            <div className="space-y-2.5 pt-2 border-t border-zinc-200 dark:border-white/5 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 mt-1.5 shrink-0" />
                <p>Connect voice agents directly to your Indian telephony &amp; CRM</p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 mt-1.5 shrink-0" />
                <p>Configure automated call routing, DND checks, and fallback triggers</p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 mt-1.5 shrink-0" />
                <p>Set up dedicated Hindi, English, and regional dialect configurations</p>
              </div>
            </div>

            {/* Calendly / Support Trigger Button */}
            <button
              onClick={() => {
                const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com'
                window.open(calendlyUrl, '_blank')
              }}
              className="w-full mt-2 py-2.5 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/10 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              Book Discovery Call
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl p-3.5 flex flex-col items-center justify-center text-center">
              <Zap className="w-4 h-4 text-zinc-500 mb-1.5" />
              <span className="text-[11px] font-bold text-zinc-900 dark:text-white">Instant Response</span>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl p-3.5 flex flex-col items-center justify-center text-center">
              <Cpu className="w-4 h-4 text-zinc-500 mb-1.5" />
              <span className="text-[11px] font-bold text-zinc-900 dark:text-white">Custom Integration</span>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl p-3.5 flex flex-col items-center justify-center text-center">
              <Shield className="w-4 h-4 text-zinc-500 mb-1.5" />
              <span className="text-[11px] font-bold text-zinc-900 dark:text-white">Enterprise Security</span>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl p-3.5 flex flex-col items-center justify-center text-center">
              <PhoneCall className="w-4 h-4 text-zinc-500 mb-1.5" />
              <span className="text-[11px] font-bold text-zinc-900 dark:text-white">Dedicated Support</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
