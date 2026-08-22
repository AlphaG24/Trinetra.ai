import { createClient } from '@/lib/server'
import { MarketplaceListingClient } from '@/src/components/marketplace/MarketplaceListingClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'AI Agent Marketplace — Trinetra AI',
  description: 'Deploy AI agents on Trinetra AI Marketplace in 60 seconds.',
}

export default async function MarketplacePage() {
  let services: any[] = []
  let errorOccurred = false
  let errorMessage = ''

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('platform_services')
      .select('*')
      .eq('is_visible_in_marketplace', true)
      .order('name', { ascending: true })

    if (error) {
      errorOccurred = true
      errorMessage = error.message
    } else {
      services = data || []
    }
  } catch (err: any) {
    errorOccurred = true
    errorMessage = err.message || 'Something went wrong'
  }

  return (
    <MarketplaceListingClient
      initialTools={services}
      errorOccurred={errorOccurred}
      errorMessage={errorMessage}
    />
  )
}
