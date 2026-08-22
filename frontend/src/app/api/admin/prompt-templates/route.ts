import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Maps personality_type → fallback .txt filename (relative to backend/prompts/)
const PROMPT_FILE_MAP: Record<string, string> = {
  sales: 'sales_agent.txt',
  support: 'support_agent.txt',
  appointment: 'appointment_agent.txt',
  lead_qualifier: 'lead_qualifier.txt',
  general: 'vikram_sharma.txt',
}

const VALID_TYPES = Object.keys(PROMPT_FILE_MAP)

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/admin/prompt-templates
 * Returns all prompt_templates rows.
 */
export async function GET() {
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .order('personality_type')

    if (error) throw new Error(error.message)

    return NextResponse.json({ templates: data || [] })
  } catch (err: any) {
    console.error('[Admin Prompt Templates GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/prompt-templates
 * Updates a single prompt template.
 * Body: { personality_type: string, system_prompt?: string, description?: string, is_active?: boolean }
 * Special: { reset_to_default: true } re-reads the original .txt file and overwrites the DB row.
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { personality_type, reset_to_default, system_prompt, description, is_active } = body

    if (!personality_type || !VALID_TYPES.includes(personality_type)) {
      return NextResponse.json(
        { error: `Invalid personality_type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = getAdminClient()

    let updatePayload: Record<string, any> = {}

    if (reset_to_default) {
      // Re-read the original .txt file from the backend prompts directory
      const filename = PROMPT_FILE_MAP[personality_type]
      // Navigate from frontend to backend/prompts/
      const promptPath = join(process.cwd(), '..', 'backend', 'prompts', filename)
      try {
        const fileContent = readFileSync(promptPath, 'utf-8')
        updatePayload.system_prompt = fileContent
        updatePayload.is_active = true
      } catch (fileErr) {
        console.error('[Admin Prompt Templates] Could not read default file:', fileErr)
        return NextResponse.json(
          { error: `Could not read default prompt file for ${personality_type}` },
          { status: 500 }
        )
      }
    } else {
      if (system_prompt !== undefined) {
        if (typeof system_prompt !== 'string' || system_prompt.trim().length === 0) {
          return NextResponse.json({ error: 'system_prompt cannot be empty' }, { status: 400 })
        }
        updatePayload.system_prompt = system_prompt.trim()
      }
      if (description !== undefined) updatePayload.description = description
      if (is_active !== undefined) updatePayload.is_active = is_active
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('prompt_templates')
      .update(updatePayload)
      .eq('personality_type', personality_type)
      .select()
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, template: data })
  } catch (err: any) {
    console.error('[Admin Prompt Templates PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
