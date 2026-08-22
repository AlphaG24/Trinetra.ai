import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { PromptTemplatesClient } from '@/src/components/admin/PromptTemplatesClient'

export const metadata = {
  title: 'Prompt Templates | Trinetra AI Admin',
  description: 'Manage AI system prompts for each personality type',
}

interface PromptTemplate {
  id: string
  personality_type: string
  system_prompt: string
  description: string | null
  is_active: boolean
  updated_at: string
}

export default async function PromptTemplatesPage() {
  const supabase = await createClient()

  // Admin auth check — only allow admin users
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/admin')
  }

  // Fetch all templates using service role (via API)
  let templates: PromptTemplate[] = []
  try {
    const { createClient: createAdmin } = await import('@supabase/supabase-js')
    const adminClient = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data } = await adminClient
      .from('prompt_templates')
      .select('*')
      .order('personality_type')

    templates = data || []
  } catch (err) {
    console.error('[PromptTemplatesPage] Failed to fetch templates:', err)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Prompt Templates</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Manage AI system prompts for each personality type. Changes take effect on the next call after the backend worker restarts.
        </p>
      </div>
      <PromptTemplatesClient templates={templates} />
    </div>
  )
}
