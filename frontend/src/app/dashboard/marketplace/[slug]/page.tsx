import Link from 'next/link'
import { AlertTriangle, Bot, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/server'
import { ToolDetailClient } from '@/src/components/marketplace/ToolDetailClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface MarketplaceDetailPageProps {
  params: Promise<{ slug: string }>
}

export default async function MarketplaceDetailPage({ params }: MarketplaceDetailPageProps) {
  const { slug } = await params
  let tool: any = null
  let profile: any = null
  let systemConfig: Record<string, string> = {}
  let agents: any[] = []
  let errorOccurred = false
  let errorMessage = ''
  let is404 = false

  try {
    const supabase = await createClient()

    // 1. Fetch single tool by slug or ID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
    let toolQuery = supabase.from('platform_services').select('*')
    if (isUuid) {
      toolQuery = toolQuery.or(`slug.eq.${slug},id.eq.${slug}`)
    } else {
      toolQuery = toolQuery.eq('slug', slug)
    }
    const { data: toolData, error: toolError } = await toolQuery.maybeSingle()

    if (toolError) {
      errorOccurred = true
      errorMessage = toolError.message
    } else if (!toolData) {
      is404 = true
    } else {
      tool = toolData

      // 2. Fetch authenticated user profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          console.error('[Detail page profile fetch error]', profileError)
        } else {
          profile = profileData
        }

        const { data: agentsData } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', user.id)
        agents = agentsData || []
      }

      // 3. Fetch system config keys
      const { data: configData } = await supabase
        .from('system_config')
        .select('config_key, config_value')

      if (configData) {
        systemConfig = configData.reduce((acc: any, cur: any) => {
          acc[cur.config_key] = cur.config_value
          return acc
        }, {})
      }
    }
  } catch (err: any) {
    errorOccurred = true
    errorMessage = err.message || 'An unexpected error occurred.'
  }

  // 404 State
  if (is404) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] shadow-sm">
          <Bot className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold font-display text-[var(--heading)]">Tool Not Found</h2>
          <p className="text-xs text-[var(--body)] font-merriweather max-w-xs mx-auto">
            The AI agent &ldquo;{slug}&rdquo; could not be located in our marketplace.
          </p>
        </div>
        <Link
          href="/dashboard/marketplace"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Browse Marketplace
        </Link>
      </div>
    )
  }

  // Error State
  if (errorOccurred) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-red-500 shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold font-display text-[var(--heading)]">Database Connection Error</h2>
          <p className="text-xs text-[var(--body)] font-merriweather max-w-xs mx-auto">
            {errorMessage || 'Unable to retrieve tool detail at this time.'}
          </p>
        </div>
        <Link
          href="/dashboard/marketplace"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Marketplace
        </Link>
      </div>
    )
  }

  return (
    <ToolDetailClient
      tool={tool}
      profile={profile}
      config={systemConfig}
      agents={agents}
    />
  )
}