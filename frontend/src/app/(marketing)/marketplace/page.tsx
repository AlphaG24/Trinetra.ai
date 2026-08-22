import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { 
  Bot, PhoneCall, ScanText, Wallet, Sparkles, AlertCircle, ChevronRight 
} from 'lucide-react'

export const metadata = {
  title: 'AI Agent Marketplace — Trinetra AI',
  description: 'Discover and deploy specialized cognitive voice assistants and document automation pipelines.',
}

// Helper to resolve icon based on service type
function getServiceIcon(type: string, iconUrl?: string | null) {
  const t = type.toLowerCase()
  if (t === 'voice') return <PhoneCall className="w-6 h-6 text-violet-400" />
  if (t === 'ocr') return <ScanText className="w-6 h-6 text-amber-400" />
  if (t === 'finance') return <Wallet className="w-6 h-6 text-emerald-400" />
  return <Bot className="w-6 h-6 text-zinc-400" />
}

// Helper to resolve styles based on service type
function getServiceStyles(type: string) {
  const t = type.toLowerCase()
  if (t === 'voice') {
    return {
      border: 'border-violet-500/20 hover:border-violet-500/40',
      bgGlow: 'from-violet-500/5 to-transparent',
      badge: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    }
  }
  if (t === 'ocr') {
    return {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      bgGlow: 'from-amber-500/5 to-transparent',
      badge: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    }
  }
  if (t === 'finance') {
    return {
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      bgGlow: 'from-emerald-500/5 to-transparent',
      badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    }
  }
  return {
    border: 'border-zinc-800 hover:border-zinc-700',
    bgGlow: 'from-zinc-500/5 to-transparent',
    badge: 'bg-zinc-800 border-zinc-700 text-zinc-300',
  }
}

export default async function MarketplacePage() {
  const supabase = await createClient()

  // Fetch active marketplace listings
  const { data: services, error } = await supabase
    .from('platform_services')
    .select('*')
    .eq('is_visible_in_marketplace', true)
    .order('name', { ascending: true })

  if (error) {
    console.error("Failed to load platform services:", error)
  }

  const items = services || []

  return (
    <div className="min-h-screen bg-[#080010] text-zinc-100 selection:bg-violet-500/30">
      {/* Background radial effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-16 space-y-12 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-violet-500/10 text-violet-400 uppercase tracking-widest border border-violet-500/20 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" /> Trinetra Store
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            AI Agents <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-300 to-amber-300">Marketplace</span>
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Discover, test, and deploy production-grade autonomous assistants. Integrate self-healing voice engines and OCR workflows into your business in minutes.
          </p>
        </div>

        {/* Listings Grid */}
        {items.length === 0 ? (
          <div className="max-w-md mx-auto bg-zinc-950/60 border border-zinc-800 rounded-3xl p-12 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mx-auto shadow-inner">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">No agents available yet</h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Check back soon! We are actively preparing MSME finance navigators and OCR tools.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((service) => {
              const styles = getServiceStyles(service.type)
              const tagline = service.marketplace_metadata?.tagline || service.description || 'No description available'
              const isLive = service.is_active

              return (
                <Link
                  key={service.id}
                  href={`/marketplace/${service.slug}`}
                  className={`bg-zinc-950/60 border rounded-3xl p-6 relative overflow-hidden transition-all duration-300 group ${styles.border} flex flex-col justify-between hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(124,58,237,0.05)]`}
                >
                  {/* Hover bg glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${styles.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                  <div className="space-y-6 relative z-10">
                    {/* Icon and Badge */}
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                        {getServiceIcon(service.type)}
                      </div>
                      
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest border ${
                        isLive 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}>
                        {isLive ? 'Live' : 'Coming Soon'}
                      </span>
                    </div>

                    {/* Meta info */}
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-bold text-white group-hover:text-white transition-colors">
                        {service.name}
                      </h3>
                      <p className="text-zinc-400 text-xs leading-relaxed line-clamp-3">
                        {tagline}
                      </p>
                    </div>
                  </div>

                  {/* Footer link */}
                  <div className="flex items-center justify-between border-t border-zinc-900/60 pt-4 mt-6 relative z-10">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      {service.type} Agent
                    </span>
                    <span className="text-xs font-bold text-violet-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform duration-200">
                      Explore assistant <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
