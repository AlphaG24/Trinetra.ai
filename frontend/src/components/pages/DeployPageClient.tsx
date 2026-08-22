'use client'

import { useState } from 'react'
import { 
  Rocket, Calendar, Cpu, ChevronRight, CheckCircle2, Loader2, ArrowRight,
  Target, Activity, Box, AlignLeft, Zap, Globe, Database, Shield 
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
  const [estimatedScale, setEstimatedScale] = useState('1,000 - 10,000 monthly executions / tasks')
  const [currentStack, setCurrentStack] = useState('')
  const [requirements, setRequirements] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Formspree endpoint (prioritize Env var, fallback to current endpoint)
    const formspreeEndpoint = process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT || "https://formspree.io/f/xwvryvag"

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
        const errorText = await response.text()
        console.error("Formspree response error:", errorText)
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
    <div className="relative min-h-[calc(100vh-64px)] pb-16 overflow-hidden">
      
      {/* Subtle Background Radial Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-[var(--background)] to-[var(--background)] pointer-events-none z-0" />

      <div className="relative z-10 space-y-8 animate-fade-in">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--heading)] flex items-center gap-3">
            <Rocket className="w-8 h-8 text-amber-500" />
            Deploy Agent
          </h1>
          <p className="text-[var(--muted)] mt-2 text-sm max-w-xl">
            Submit a deployment request or book a discovery call with our engineers.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form Card */}
          <div className="lg:col-span-7 bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--border)] rounded-2xl p-6 lg:p-8 shadow-xl shadow-black/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-500" />
            
            {!isSuccess ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-[var(--heading)] flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-amber-500" />
                    Deploy Your Custom AI Workforce
                  </h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* Select Autonomous Agent */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">SELECT AUTONOMOUS AGENT</label>
                    <div className="relative">
                      <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/60 pointer-events-none" />
                      <select
                        value={selectedAgentId}
                        onChange={(e) => setSelectedAgentId(e.target.value)}
                        className="w-full py-3 pl-11 pr-10 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--body)] text-sm focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
                      >
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[var(--muted)]">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>

                  {/* Estimated Monthly Execution Scale */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">ESTIMATED MONTHLY EXECUTION SCALE</label>
                    <div className="relative">
                      <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/60 pointer-events-none" />
                      <select
                        value={estimatedScale}
                        onChange={(e) => setEstimatedScale(e.target.value)}
                        className="w-full py-3 pl-11 pr-10 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--body)] text-sm focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
                      >
                        <option value="1,000 - 10,000 monthly executions / tasks">1,000 - 10,000 monthly executions / tasks</option>
                        <option value="10,000 - 50,000 monthly executions / tasks">10,000 - 50,000 monthly executions / tasks</option>
                        <option value="50,000 - 250,000 monthly executions / tasks">50,000 - 250,000 monthly executions / tasks</option>
                        <option value="250,000+ (Enterprise Volume)">250,000+ (Enterprise Volume)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[var(--muted)]">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>

                  {/* Current CRM / Software Stack */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">CURRENT SOFTWARE / DATA STACK</label>
                    <div className="relative">
                      <Box className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/60 pointer-events-none" />
                      <input
                        type="text"
                        value={currentStack}
                        onChange={(e) => setCurrentStack(e.target.value)}
                        placeholder="e.g., Salesforce, HubSpot, Custom ERP, AWS S3, or REST APIs..."
                        required
                        className="w-full py-3 pl-11 pr-4 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--body)] text-sm placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Additional Requirements */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">CUSTOM WORKFLOW & INTEGRATION REQUIREMENTS</label>
                    <div className="relative">
                      <AlignLeft className="absolute left-4 top-4 w-4 h-4 text-amber-500/60 pointer-events-none" />
                      <textarea
                        rows={4}
                        value={requirements}
                        onChange={(e) => setRequirements(e.target.value)}
                        placeholder="Describe your specific operational bottlenecks, target subdomains, or required SLAs..."
                        className="w-full py-3 pl-11 pr-4 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--body)] text-sm placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
                      />
                    </div>
                  </div>

                  {/* Hidden Fields for automatic tracking in Formspree */}
                  <input type="hidden" name="user_id" value={user.id} />
                  <input type="hidden" name="user_email" value={user.email} />

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting Request...
                      </>
                    ) : (
                      <>
                        Submit Deployment Request &rarr;
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-5 animate-scale-in">
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 border border-amber-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-[var(--heading)]">Request Received!</h3>
                  <p className="text-[var(--muted)] text-sm max-w-sm">
                    Our engineering squad has received your deployment parameters and is reviewing your CRM stack config. We will reach out to you within 24 hours.
                  </p>
                </div>
                <button
                  onClick={() => setIsSuccess(false)}
                  className="text-xs text-amber-500 hover:text-amber-400 underline font-medium cursor-pointer"
                >
                  Submit another request
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Fast Track Discovery */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--border)] rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-500" />
              
              <div className="space-y-4">
                <div className="inline-flex px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 text-xs font-bold uppercase tracking-wider rounded-md">
                  Fast Track
                </div>
                <h3 className="text-xl font-bold text-[var(--heading)] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  Skip the Line
                </h3>

                <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                    <p className="text-xs text-[var(--muted)]">Seamlessly connect the autonomous agents to your existing workflows</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                    <p className="text-xs text-[var(--muted)]">Configure custom triggers, thresholds, and self-healing heuristics</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                    <p className="text-xs text-[var(--muted)]">Design tailored execution paths optimized for your business operations</p>
                  </div>
                </div>

                {/* Calendly Trigger Button */}
                <button
                  onClick={() => {
                    const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;
                    if (calendlyUrl) {
                      window.open(calendlyUrl, '_blank');
                    } else {
                      console.error("Calendly URL not configured in environment.");
                    }
                  }}
                  className="w-full mt-4 py-3 px-4 bg-[var(--hover-bg)]/40 hover:bg-[var(--hover-bg)] text-[var(--heading)] border border-[var(--border)] hover:border-amber-500/30 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-amber-500" />
                  Schedule Discovery Call
                  <ChevronRight className="w-4 h-4 text-[var(--muted)] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Enterprise Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Card 1: Ultra-Low Latency */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] hover:border-amber-500/20 hover:bg-[var(--hover-bg)] rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 group min-h-[96px]">
                <Zap className="w-5 h-5 text-amber-500 mb-2 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-xs font-semibold text-[var(--heading)]">Ultra-Low Latency</span>
              </div>

              {/* Card 2: Custom Integration */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] hover:border-amber-500/20 hover:bg-[var(--hover-bg)] rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 group min-h-[96px]">
                <Cpu className="w-5 h-5 text-amber-500 mb-2 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-xs font-semibold text-[var(--heading)]">Custom Integration</span>
              </div>

              {/* Card 3: Enterprise Security */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] hover:border-amber-500/20 hover:bg-[var(--hover-bg)] rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 group min-h-[96px]">
                <Shield className="w-5 h-5 text-amber-500 mb-2 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-xs font-semibold text-[var(--heading)]">Enterprise Security</span>
              </div>

              {/* Card 4: Dedicated Engineering Support */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] hover:border-amber-500/20 hover:bg-[var(--hover-bg)] rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 group min-h-[96px]">
                <Activity className="w-5 h-5 text-amber-500 mb-2 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-xs font-semibold text-[var(--heading)]">Dedicated Engineering Support</span>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
