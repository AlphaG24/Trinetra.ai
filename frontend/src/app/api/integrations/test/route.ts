import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const slug = body.slug || body.type
    const config = body.config

    if (!slug || !config) {
      return NextResponse.json({ error: 'Missing required parameters: slug/type, config' }, { status: 400 })
    }

    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
    const res = await fetch(`${fastApiUrl}/api/integrations/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        config
      })
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Backend validation service returned ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
