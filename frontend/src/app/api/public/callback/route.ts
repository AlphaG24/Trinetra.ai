import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || !body.phone_number) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 })
    }

    const { phone_number, language, name } = body

    const agentId = 'dd4da4c1-9deb-4047-8927-5e12402e6b1f'
    const organizationId = 'b1ddf1e9-abc1-4ff4-90f5-3ac66913738a'

    let callerName = (typeof name === 'string' ? name : '').trim()

    // Call FastAPI Sarvam instant-call endpoint locally or via env
    const backendUrl = 
      process.env.INTERNAL_BACKEND_URL || 
      process.env.NEXT_PUBLIC_BACKEND_URL || 
      process.env.NEXT_PUBLIC_FASTAPI_URL || 
      (process.env.NODE_ENV === "production" ? "https://trinetra-ai-1-6f2n.onrender.com" : "http://127.0.0.1:8000")

    const backendResponse = await fetch(`${backendUrl}/api/campaigns/instant-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: callerName || 'Website Visitor',
        phone: phone_number,
        agent_id: agentId,
        organization_id: organizationId,
        notes: `Website Live Demo Dial (${language || 'hi'})`
      })
    })

    const backendData = await backendResponse.json().catch(() => ({ detail: 'Outbound trigger failed' }))

    if (!backendResponse.ok || backendData.success === false) {
      console.error('[Public Callback Error] Backend failed:', backendData)
      return NextResponse.json({ 
        error: backendData.error || backendData.detail || 'Failed to place callback connection via Sarvam.' 
      }, { status: backendResponse.status >= 400 ? backendResponse.status : 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Calling your phone now! Answer the incoming call.',
      data: backendData
    })

  } catch (error: any) {
    console.error('[Public Callback API Exception]:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
