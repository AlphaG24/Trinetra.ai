import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { AgentDetailClient } from '@/src/components/marketplace/AgentDetailClient'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: service } = await supabase
    .from('platform_services')
    .select('name, description, marketplace_metadata')
    .eq('slug', slug)
    .maybeSingle()

  if (!service) {
    return {
      title: 'Agent Not Found | Trinetra AI',
    }
  }

  const tagline = service.marketplace_metadata?.tagline || service.description || 'AI Agent'
  return {
    title: `${service.name} — AI Agent Marketplace`,
    description: tagline,
  }
}

export default async function AgentDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. Fetch platform service by slug
  const { data: service, error: serviceErr } = await supabase
    .from('platform_services')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (serviceErr || !service) {
    notFound()
  }

  // 2. Fetch system configuration values (demo minutes, trial price etc)
  const { data: configs, error: configErr } = await supabase
    .from('system_config')
    .select('config_key, config_value')

  if (configErr) {
    console.error("Failed to load system config:", configErr)
  }

  const configMap = (configs || []).reduce((acc, curr) => {
    if (curr.config_key) {
      acc[curr.config_key] = curr.config_value || ''
    }
    return acc
  }, {} as Record<string, string>)

  return (
    <AgentDetailClient 
      service={service} 
      config={configMap} 
    />
  )
}
