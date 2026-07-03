export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  FlaskConical, ArrowRight, Bot, Sparkles, Cpu, Phone, 
  FileText, MessageSquare, Share2, Workflow 
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

export const metadata = {
  title: 'Interactive Demo Hub — Trinetra AI',
  description: 'Select an agent to launch your secure sandbox workspace.',
}

const getFallbackIcon = (type: string) => {
  const normalized = type?.toLowerCase()
  switch (normalized) {
    case 'voice':
      return Phone
    case 'ocr':
      return FileText
    case 'chat':
      return MessageSquare
    case 'social':
      return Share2
    case 'workflow':
      return Workflow
    default:
      return Cpu
  }
}

export default async function DemoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch active platform services that allow demos
  const { data: services } = await supabase
    .from('platform_services')
    .select('*')
    .eq('is_active', true)
    .eq('is_demo_allowed', true)
    .order('name', { ascending: true })

  const hasServices = services && services.length > 0

  return (
    <div className="relative min-h-[calc(100vh-64px)] pb-16 overflow-hidden">
      {/* Subtle Background Radial Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-900/10 via-[#080810] to-[#080810] pointer-events-none z-0" />

      <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto py-6">
        
        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-[10px] font-bold text-zinc-300 tracking-wider uppercase">Interactive Sandbox Environments</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white font-display">
            Interactive Demos
          </h1>
          <p className="text-zinc-400 text-sm max-w-xl">
            Select an autonomous agent below to launch your secure sandbox and experience its live operational capabilities.
          </p>
        </div>

        {!hasServices ? (
          /* Empty State Card */
          <div className="max-w-2xl mx-auto pt-12">
            <Card className="border-zinc-800 bg-zinc-950/40 backdrop-blur-sm relative overflow-hidden p-12 text-center flex flex-col items-center justify-center gap-4">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent pointer-events-none" />
              <div className="w-16 h-16 rounded-full bg-zinc-900/60 border border-zinc-800 flex items-center justify-center text-3xl mb-2 text-zinc-500 shadow-inner">
                <FlaskConical className="w-8 h-8" />
              </div>
              <CardHeader className="space-y-2 p-0">
                <CardTitle className="text-xl font-bold text-white">No Demos Available</CardTitle>
                <CardDescription className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
                  No interactive demos are currently available. Please check the marketplace for tools and request custom deployment access.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 mt-4">
                <Link
                  href="/dashboard/agents"
                  className="inline-block py-3 px-8 rounded-xl text-sm font-bold uppercase tracking-wider bg-white/5 border border-white/10 hover:border-violet-500/30 text-white font-semibold transition-all"
                >
                  Browse Marketplace
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Dynamic Launchpad Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {services.map((service) => {
              const FallbackIcon = getFallbackIcon(service.type)
              const tagline = service.marketplace_metadata?.tagline || service.description || 'Enterprise ready autonomous AI capability.'

              return (
                <Card 
                  key={service.id}
                  className="group relative flex flex-col justify-between border-zinc-800 hover:border-violet-500/30 bg-zinc-950/40 hover:bg-zinc-950/60 backdrop-blur-sm hover:shadow-[0_0_30px_rgba(124,58,237,0.08)] hover:scale-[1.02] transition-all duration-300 rounded-2xl overflow-hidden min-h-[300px]"
                >
                  {/* Subtle Background Glows */}
                  <div className="absolute -top-12 -left-12 w-32 h-32 bg-violet-600/5 blur-2xl rounded-full opacity-60 pointer-events-none group-hover:opacity-100 transition-opacity" />

                  <CardHeader className="space-y-4 p-6">
                    {/* Tool Icon / Identity */}
                    <div className="flex items-center justify-between">
                      {service.icon_url ? (
                        <img 
                          src={service.icon_url} 
                          alt={service.name} 
                          className="w-12 h-12 rounded-xl object-cover border border-white/10"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                          <FallbackIcon className="w-6 h-6" />
                        </div>
                      )}

                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-400">
                        {service.type}
                      </span>
                    </div>

                    {/* Titles */}
                    <div className="space-y-1.5">
                      <CardTitle className="text-lg font-bold text-white group-hover:text-violet-400 transition-colors font-display">
                        {service.name}
                      </CardTitle>
                      <CardDescription className="text-zinc-400 text-xs line-clamp-3 leading-relaxed">
                        {tagline}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardFooter className="p-6 pt-0">
                    <Link
                      href={`/dashboard/agents/${service.slug}/workspace`}
                      className="w-full py-3 px-4 rounded-xl text-xs font-semibold tracking-wide uppercase bg-violet-600 hover:bg-violet-500 text-white border border-violet-500/30 hover:border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] text-center transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      Launch Workspace 
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
