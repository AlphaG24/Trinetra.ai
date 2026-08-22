import { createClient } from '@/lib/server'
import { MarketplaceListingClient } from '@/src/components/marketplace/MarketplaceListingClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DemoPage() {
  let services: any[] = []
  let errorOccurred = false
  let errorMessage = ''

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('platform_services')
      .select('*')
      .eq('is_demo_allowed', true)
      .eq('is_active', true)
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
    <div className="space-y-6">
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold font-display text-[var(--heading)]">Demo Tools</h1>
          <p className="text-xs text-[var(--muted)] mt-1">Select an AI agent from the marketplace to try out a live voice session demo.</p>
        </div>
      </div>
      
      <MarketplaceListingClient
        initialTools={services}
        errorOccurred={errorOccurred}
        errorMessage={errorMessage}
        hideHeader={true}
      />
    </div>
  )
}
