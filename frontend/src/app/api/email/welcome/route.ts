import { NextResponse } from 'next/server'
import { safeApiHandler, requireAuth } from '@/utils/apiAuth'
import { sendEmailTemplate } from '@/lib/email'

export const POST = safeApiHandler(async (req: Request) => {
  const authResult = await requireAuth()
  if (authResult instanceof Response) {
    return authResult
  }

  const { user } = authResult
  if (!user.email) {
    return NextResponse.json({ error: 'User email is required' }, { status: 400 })
  }

  const origin = req.headers.get('origin') || 'https://trinetraedu-ai.com'

  const success = await sendEmailTemplate({
    to: user.email,
    subject: 'Welcome to Trinetra AI 🎉',
    templateName: 'welcome',
    variables: {
      recipient_name: (user as any).user_metadata?.full_name || 'there',
      login_url: `${origin}/dashboard`
    }
  })

  if (!success) {
    return NextResponse.json({ error: 'Failed to send welcome email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})