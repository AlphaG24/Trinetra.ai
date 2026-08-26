import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { agentId } = await params
    const FASTAPI_URL = process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'
    
    const res = await fetch(`${FASTAPI_URL}/api/usage/agent/${agentId}`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }
    
    return NextResponse.json({ success: false, error: 'Failed to fetch agent usage from backend' }, { status: res.status })
  } catch (error: any) {
    console.error('[/api/usage/agent GET] Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
