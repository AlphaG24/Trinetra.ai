import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Lock, Sparkles, ChevronRight, Activity } from 'lucide-react'
import { StructurerConsole } from './components/StructurerConsole'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  if (slug === 'anika-voice') {
    return {
      title: 'Not Found',
      description: 'Page not found.',
    }
  }
  const formatName = (s: string) => {
    if (s === 'structurer') return 'Triscrap'
    return s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
  const siteName = slug === 'structurer' ? 'Triscrap' : 'Trinetra'
  return {
    title: `${formatName(slug)} — ${siteName} Autonomous OS`,
    description: `Access and manage your autonomous AI tool: ${formatName(slug)}.`,
  }
}

export default async function ToolGatekeeperPage({ params }: PageProps) {
  const { slug } = await params

  // SECURITY: Disable /dashboard/tools/anika-voice route entirely
  if (slug === 'anika-voice') {
    notFound()
  }
  
  // 1. Initialize Supabase SSR Server Client with cookies
  const cookieStore = await cookies()
  const headerList = await headers()
  const host = headerList.get('host') || ''
  const cleanHost = host.split(':')[0]
  let cookieDomain: string | undefined = undefined

  const isProd = process.env.NODE_ENV === 'production'
  if (isProd && cleanHost) {
    if (cleanHost.endsWith('trinetraedu-ai.com')) {
      cookieDomain = '.trinetraedu-ai.com'
    } else if (cleanHost.endsWith('trinetra.ai')) {
      cookieDomain = '.trinetra.ai'
    }
  }

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

  // 3. Query platform_services first
  const { data: service, error: serviceError } = await supabase
    .from('platform_services')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!service || serviceError || !service.is_active || !service.is_demo_allowed) {
    redirect('/dashboard/agents')
  }

  // 4. Query or JIT-provision user_service_quotas
  let { data: quota, error: quotaError } = await supabase
    .from('user_service_quotas')
    .select('*')
    .eq('service_slug', slug)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!quota && !quotaError) {
    const demoLimitConfig = service.demo_limit_config || {}
    const usageMetricType = demoLimitConfig.type || 'runs'
    const quotaAllocated = demoLimitConfig.value ?? 10

    const { data: newQuota, error: insertError } = await supabase
      .from('user_service_quotas')
      .insert({
        user_id: user.id,
        service_slug: slug,
        is_demo: true,
        usage_metric_type: usageMetricType,
        quota_allocated: quotaAllocated,
        quota_used: 0
      })
      .select('*')
      .single()

    if (!insertError && newQuota) {
      quota = newQuota
    } else {
      console.error('Failed to auto-provision quota:', insertError)
      quota = {
        user_id: user.id,
        service_slug: slug,
        is_demo: true,
        usage_metric_type: usageMetricType,
        quota_allocated: quotaAllocated,
        quota_used: 0
      } as any
    }
  }

  if (!quota) {
    redirect('/dashboard/agents')
  }

  const displayName = service.name === 'Trinetra Structurer' ? 'Triscrap' : service.name

  const quotaUsed = quota.quota_used || 0
  const quotaAllocated = quota.quota_allocated || 0
  const isQuotaExhausted = quotaUsed >= quotaAllocated

  const percentUsed = Math.min((quotaUsed / quotaAllocated) * 100, 100)
  let progressColorClass = 'bg-gradient-to-r from-orange-600 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
  let textColorClass = 'text-orange-400 font-semibold'
  let ribbonBgClass = 'bg-orange-950/20 border-orange-900/30'

  if (percentUsed >= 100) {
    progressColorClass = 'bg-gradient-to-r from-red-600 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse'
    textColorClass = 'text-red-400 font-semibold'
    ribbonBgClass = 'bg-red-950/20 border-red-900/30'
  } else if (percentUsed >= 80) {
    progressColorClass = 'bg-gradient-to-r from-amber-600 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
    textColorClass = 'text-amber-400 font-semibold'
    ribbonBgClass = 'bg-amber-950/20 border-amber-900/30'
  }

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
      {/* Navigation & Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div className="flex items-center gap-4">
          {/* Tool Circular Logo */}
          {service.icon_url && (
            <img
              src={service.icon_url}
              alt={service.name}
              className="w-12 h-12 rounded-full object-cover shrink-0"
            />
          )}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white leading-none flex items-center gap-2 font-heading">
              {displayName} <span className="text-xs font-normal text-zinc-500">Demo Sandbox</span>
            </h1>
            <Link 
              href="/dashboard/agents"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 bg-white/5 border border-white/[0.03] px-3 py-1 rounded">
          Tool Config: {slug}
        </div>
      </div>

      {/* Demo Usage Display (below back button/header) */}
      <div className={`w-full border rounded-2xl px-5 py-4 transition-colors duration-300 ${ribbonBgClass}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">Demo Mode:</span>
            <span className={`text-xs font-bold ${textColorClass}`}>
              Demo Usage: {quotaUsed} / {quotaAllocated} {slug === 'structurer' ? 'documents' : (quota.usage_metric_type || 'units')} used
            </span>
          </div>

          {/* Progress Bar Container */}
          <div className="flex-grow max-w-md w-full bg-zinc-950/60 border border-zinc-800/80 rounded-full h-2.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${progressColorClass}`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase font-semibold">
            {percentUsed >= 100 ? (
              <span className="text-red-400 flex items-center gap-1">Quota Exceeded</span>
            ) : percentUsed >= 80 ? (
              <span className="text-amber-400 flex items-center gap-1">Warning: Nearing Limit</span>
            ) : (
              <span>Quota In Good Standing</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Tool Content Container */}
      <div className="animate-fade-in">
        {renderTool()}
      </div>
    </div>
  )
}
