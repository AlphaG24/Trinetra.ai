import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { headers } from 'next/headers'

// Simple in-memory rate limiting for demonstration.
// In a real production app, use Redis or Supabase for rate limiting.
const rateLimit = new Map<string, { count: number, resetTime: number }>()
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate Limiting
    const now = Date.now()
    const userLimit = rateLimit.get(user.id)
    if (userLimit && userLimit.resetTime > now) {
      if (userLimit.count >= RATE_LIMIT_MAX) {
        return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 })
      }
      userLimit.count++
    } else {
      rateLimit.set(user.id, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    }

    const { text, action, blog_title } = await req.json()

    if (!text || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'
    const res = await fetch(`${backendUrl}/api/ai/blog/enhance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        action,
        blog_title: blog_title || ''
      })
    })

    if (!res.ok) {
      const errorData = await res.text()
      console.error('Backend enhancement failed:', errorData)
      return NextResponse.json({ error: 'AI Enhancement failed on backend' }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Blog enhance error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
