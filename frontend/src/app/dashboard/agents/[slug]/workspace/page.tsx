import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Lock, ShieldAlert, Sparkles, Sliders, Play, Settings, Terminal, Activity, HelpCircle, ArrowRight } from 'lucide-react'
import { WorkspaceClient } from '@/src/components/workspace/WorkspaceClient'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function WorkspacePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. Fetch user session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // 2. Fetch specific tool from platform_services
  const { data: tool } = await supabase
    .from('platform_services')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!tool || !tool.is_active || !tool.is_demo_allowed) {
    redirect('/dashboard/agents')
  }

  // Redirect voice tools to the new tabbed AgentEditor route
  if (tool.type === 'voice') {
    redirect(`/dashboard/agents/${slug}`)
  }

  // 3. Fetch user service quota
  let { data: quota, error: quotaError } = await supabase
    .from('user_service_quotas')
    .select('*')
    .eq('user_id', user.id)
    .eq('service_slug', slug)
    .maybeSingle()

  // Extract config values
  const limitConfig = tool.demo_limit_config || {}
  const defaultLimit = limitConfig.value ?? 10
  const quotaType = limitConfig.type || 'runs'

  // If the row does not exist yet, auto-provision it (JIT lazy allocation pattern)
  if (!quota && !quotaError) {
    const { data: newQuota, error: insertError } = await supabase
      .from('user_service_quotas')
      .insert({
        user_id: user.id,
        service_slug: slug,
        usage_metric_type: quotaType,
        quota_allocated: defaultLimit,
        quota_used: 0
      })
      .select('*')
      .single()

    if (!insertError && newQuota) {
      quota = newQuota
    } else {
      console.error('Failed to auto-provision quota, falling back to in-memory defaults:', insertError)
      // Graceful fallback to prevent user lock out if RLS/database rules block insert
      quota = {
        user_id: user.id,
        service_slug: slug,
        quota_allocated: defaultLimit,
        quota_used: 0
      } as any
    }
  }

  // 4. Fetch recent execution logs from analytics_logs
  const { data: logs } = await supabase
    .from('analytics_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('service_slug', slug)
    .order('created_at', { ascending: false })

  const quotaAllocated = quota?.quota_allocated ?? defaultLimit
  const quotaUsed = quota?.quota_used ?? 0

  const percentUsed = Math.min((quotaUsed / quotaAllocated) * 100, 100)
  const isBlocked = quotaUsed >= quotaAllocated

  // Determine dynamic progress ribbon style/color
  let progressColorClass = 'bg-gradient-to-r from-[var(--violet-600)] to-[var(--violet-500)] shadow-[0_0_8px_rgba(139,92,246,0.3)]'
  let textColorClass = 'text-[var(--violet-300)]'
  let ribbonBgClass = 'bg-[var(--violet-950)]/20 border-[var(--violet-900)]/30'

  if (percentUsed >= 100) {
    progressColorClass = 'bg-gradient-to-r from-red-600 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse'
    textColorClass = 'text-red-400'
    ribbonBgClass = 'bg-red-950/20 border-red-900/30'
  } else if (percentUsed >= 80) {
    progressColorClass = 'bg-gradient-to-r from-amber-600 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
    textColorClass = 'text-amber-400 font-semibold'
    ribbonBgClass = 'bg-amber-950/20 border-amber-900/30'
  }

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-zinc-100 flex flex-col relative overflow-hidden">
      
      {/* Main Canvas Area */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 relative z-10">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
          <div className="flex items-center gap-4">
            {/* Tool Circular Logo */}
            {tool.icon_url && (
              <img
                src={tool.icon_url}
                alt={tool.name}
                className="w-12 h-12 rounded-full object-cover shrink-0"
              />
            )}
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white leading-none flex items-center gap-2 font-heading">
                {tool.name} <span className="text-xs font-normal text-zinc-500">Demo Sandbox</span>
              </h1>
              <Link 
                href={`/dashboard/agents/${slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Product Page
              </Link>
            </div>
          </div>

          <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)] bg-white/5 border border-white/[0.03] px-3 py-1 rounded">
            Agent Config: {slug}
          </div>
        </div>

        {/* Demo Usage Display (below back button/header) */}
        <div className={`w-full border rounded-2xl px-5 py-4 transition-colors duration-300 ${ribbonBgClass}`}>
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-[var(--text-secondary)]">Demo Mode:</span>
              <span className={`text-xs font-bold ${textColorClass}`}>
                Demo Usage: {quotaUsed} / {quotaAllocated} {quotaType} used
              </span>
            </div>

            {/* Progress Bar Container */}
            <div className="flex-grow max-w-md w-full bg-zinc-950/60 border border-zinc-800/80 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${progressColorClass}`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">
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

        {/* Blocking Overlay Check */}
        {isBlocked ? (
          <div className="flex-1 flex items-center justify-center py-16 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative max-w-lg w-full bg-[var(--bg-surface)]/80 border border-red-500/20 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-md">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-red-500/10 to-transparent blur-2xl rounded-full -z-10" />
              
              {/* Centered Lock Icon */}
              <div className="inline-flex items-center justify-center p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mb-6">
                <Lock className="w-10 h-10 animate-bounce" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
                Demo Limit Reached
              </h2>
              
              <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed">
                You have used all {quotaAllocated} free demo {quotaType} allocated for <span className="text-[var(--violet-300)] font-semibold">{tool.name}</span>. Upgrade your subscription to unlock unlimited production workflows.
              </p>

              {/* pricing table or limits details info */}
              <div className="my-6 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-left space-y-2.5">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Service Name</span>
                  <span className="text-zinc-200 font-medium">{tool.name}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Quota Expired</span>
                  <span className="text-red-400 font-bold">{quotaUsed} / {quotaAllocated} {quotaType}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Allocation Tier</span>
                  <span className="text-zinc-200 font-medium uppercase">Free Sandbox</span>
                </div>
              </div>

              <Link 
                href="/dashboard/contact"
                className="w-full py-4 px-6 rounded-xl text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-600/10 text-center transition-all inline-block hover:scale-[1.02] active:scale-[0.98]"
              >
                Upgrade Plan / Contact Sales
              </Link>

              <div className="mt-4">
                <Link 
                  href="/dashboard/agents"
                  className="text-xs text-[var(--text-tertiary)] hover:text-white transition-colors"
                >
                  Or explore other marketplace agents
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Active Tool Slot Canvas Component Mount */
          <WorkspaceClient 
            tool={tool} 
            quota={quota} 
            slug={slug} 
            user={user}
            logs={logs || []}
          />
        )}
      </div>
    </div>
  )
}
