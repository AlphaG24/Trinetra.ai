import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { integrationId } = await params
    if (!integrationId) {
      return NextResponse.json({ error: 'Missing integrationId' }, { status: 400 })
    }

    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
    const res = await fetch(`${fastApiUrl}/api/integrations/${integrationId}/disconnect`, {
      method: 'POST'
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Backend service returned ${res.status}` }, { status: res.status })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
