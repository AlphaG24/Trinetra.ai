import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Lock, Sparkles, ChevronRight, Activity } from 'lucide-react'
import { VoiceAgentConsole } from './components/VoiceAgentConsole'
import { StructurerConsole } from './components/StructurerConsole'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const formatName = (s: string) => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  return {
    title: `${formatName(slug)} — Trinetra Autonomous OS`,
    description: `Access and manage your autonomous AI tool: ${formatName(slug)}.`,
  }
}

export default async function ToolGatekeeperPage({ params }: PageProps) {
  const { slug } = await params
  
  // 1. Initialize Supabase SSR Server Client with cookies
  const cookieStore = await cookies()
  const isProd = process.env.NODE_ENV === 'production'
  const cookieDomain = isProd ? '.trinetraedu-ai.com' : undefined

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                domain: cookieDomain,
                path: '/',
                sameSite: 'lax',
                secure: true,
              })
            )
          } catch {
            // Ignore cookie set errors in server components
          }
        },
      },
    }
  )

  // 2. Fetch current session & active user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // 3. Query user_service_quotas joined with platform_services
  const { data: quota, error: quotaError } = await supabase
    .from('user_service_quotas')
    .select(`
      *,
      platform_services!inner(*)
    `)
    .eq('service_slug', slug)
    .eq('user_id', user.id)
    .maybeSingle()

  // 4. Redirect unauthorized users natively to marketplace
  if (!quota || quotaError) {
    redirect('/dashboard/marketplace')
  }

  // Handle potential nested platform_services data structures gracefully
  const rawService = quota.platform_services
  const service = Array.isArray(rawService) ? rawService[0] : rawService

  if (!service) {
    redirect('/dashboard/marketplace')
  }

  const quotaUsed = quota.quota_used || 0
  const quotaAllocated = quota.quota_allocated || 0
  const isQuotaExhausted = quotaUsed >= quotaAllocated

  // 5. Quota Exhausted blocking UI
  if (isQuotaExhausted) {
    return (
      <div className="min-h-[calc(100vh-160px)] flex items-center justify-center p-4">
        <div className="w-full max-w-md border border-zinc-800 bg-[#0c0c12]/90 backdrop-blur-xl p-8 rounded-2xl shadow-2xl relative overflow-hidden">
          {/* Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
          
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 animate-pulse shadow-lg shadow-orange-500/5">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">Quota Exhausted</h2>
              <p className="text-zinc-400 text-sm">
                You have reached your allocated usage limit for <span className="text-white font-medium">{service.name}</span>.
              </p>
            </div>

            {/* Quota Stats Meter */}
            <div className="w-full border border-zinc-800/80 bg-[#0e0e15] rounded-xl p-4 text-left space-y-3">
              <div className="flex justify-between items-center text-xs text-zinc-500">
                <span>Usage Progress</span>
                <span className="font-semibold text-orange-400">
                  {quotaUsed} / {quotaAllocated} {quota.usage_metric_type || 'units'}
                </span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full" 
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Action CTAs */}
            <div className="flex flex-col w-full gap-3 pt-2">
              <Link 
                href="/dashboard/billing"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold rounded-xl text-sm transition-all duration-300 shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Upgrade Plan
              </Link>
              <Link 
                href="/dashboard"
                className="w-full py-3 px-4 border border-zinc-800 bg-[#0e0e15] hover:bg-[#14141f] text-zinc-300 font-semibold rounded-xl text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 6. Dynamic Injection Switch
  const renderTool = () => {
    switch (slug) {
      case 'anika-voice':
        return <VoiceAgentConsole service={service} quota={quota} />
      case 'structurer':
        return <StructurerConsole service={service} quota={quota} />
      default:
        return (
          <div className="border border-zinc-800 bg-[#0c0c12] p-8 rounded-xl text-center space-y-4">
            <h3 className="text-xl font-bold text-white">Tool Not Mapped</h3>
            <p className="text-zinc-400">
              The interface console for <span className="text-white font-semibold">{service.name}</span> is currently not registered on this route.
            </p>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header Dashboard / Tools / [Tool Name] */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">Dashboard</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/dashboard/marketplace" className="hover:text-zinc-300 transition-colors">Tools</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-orange-500">{service.name}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1">
            {service.name}
          </h1>
        </div>

        {/* Current Quota Allocated Badge */}
        <div className="flex items-center gap-3 bg-[#0d0d14] border border-zinc-800 px-4 py-2 rounded-xl text-sm self-start md:self-auto">
          <Activity className="w-4 h-4 text-orange-500" />
          <span className="text-zinc-400">Usage:</span>
          <span className="text-white font-semibold">{quotaUsed} / {quotaAllocated}</span>
          <span className="text-zinc-500 text-xs px-2 py-0.5 bg-zinc-850 rounded">
            {quota.usage_metric_type || 'units'}
          </span>
        </div>
      </div>

      {/* Main Tool Content Container */}
      <div className="animate-fade-in">
        {renderTool()}
      </div>
    </div>
  )
}
