import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { sendEmailTemplate } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = body?.email?.trim()?.toLowerCase()

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('subscribers')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'You are already subscribed to Trinetra AI publications!',
        alreadySubscribed: true
      })
    }

    // Insert new subscriber
    const { error: insertError } = await supabase
      .from('subscribers')
      .insert({ email })

    if (insertError) {
      console.error('[NEWSLETTER] Error inserting subscriber:', insertError)
      return NextResponse.json({ error: 'Unable to subscribe right now. Please try again.' }, { status: 500 })
    }

    // Send confirmation welcome email
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trinetraedu-ai.com'
    const blogUrl = `${siteUrl}/blog`

    try {
      await sendEmailTemplate({
        to: email,
        subject: '✨ Welcome to Trinetra AI Publications',
        templateName: 'welcome-subscriber',
        variables: {
          site_url: siteUrl,
          blog_url: blogUrl,
        }
      })
    } catch (emailErr) {
      console.warn('[NEWSLETTER] Welcome email failed to send (subscription was saved):', emailErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed! Check your inbox for confirmation.'
    })
  } catch (err: any) {
    console.error('[NEWSLETTER] Fatal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
