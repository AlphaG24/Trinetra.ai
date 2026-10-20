import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      work_email,
      company_name,
      infrastructure_needs,
      message,
      deployment_type = 'cloud',
      phone_number
    } = body

    if (!work_email || !company_name) {
      return NextResponse.json(
        { error: 'Work email and company name are required' },
        { status: 400 }
      )
    }

    const adminClient = getAdminClient()

    // Store in enterprise_leads table
    const leadPayload: Record<string, any> = {
      work_email: work_email.trim(),
      company_name: company_name.trim(),
      infrastructure_needs: infrastructure_needs || phone_number || 'Custom Enterprise Setup',
      message: message ? (phone_number ? `Phone: ${phone_number}\n${message}` : message) : (phone_number ? `Phone: ${phone_number}` : 'Enterprise plan inquiry'),
      deployment_type: deployment_type || 'cloud'
    }

    let insertedData = null

    // Try enterprise_leads table first
    const { data, error } = await adminClient
      .from('enterprise_leads')
      .insert(leadPayload)
      .select()
      .single()

    if (!error && data) {
      insertedData = data
    } else {
      // Fallback to existing public.leads table
      const leadsPayload = {
        full_name: company_name.trim(),
        email: work_email.trim(),
        phone: phone_number ? phone_number.trim() : null,
        company_name: company_name.trim(),
        source: 'contact_form',
        status: 'new',
        priority: 'high',
        call_summary: `[Enterprise Inquiry] Plan: ${infrastructure_needs || 'Custom Enterprise'}. Deployment: ${deployment_type || 'cloud'}. Message: ${message || 'None'}`
      }

      const { data: fallbackData, error: fallbackError } = await adminClient
        .from('leads')
        .insert(leadsPayload)
        .select()
        .single()

      if (fallbackError) {
        console.error('[Enterprise Leads POST] Fallback DB error:', fallbackError)
        return NextResponse.json(
          { error: 'Failed to record enterprise lead. Please try again.', details: fallbackError.message },
          { status: 500 }
        )
      }
      insertedData = {
        id: fallbackData.id,
        work_email: fallbackData.email,
        company_name: fallbackData.company_name || fallbackData.full_name,
        phone_number: fallbackData.phone,
        infrastructure_needs: fallbackData.call_summary,
        deployment_type: deployment_type || 'cloud',
        message: message || '',
        status: fallbackData.status || 'new',
        created_at: fallbackData.created_at
      }
    }

    // 1. Dispatch to Formspree so admin receives immediate email alert
    const formspreeEndpoint = process.env.FORMSPREE_ENDPOINT || process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT || 'https://formspree.io/f/mjgnkbay'
    try {
      await fetch(formspreeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: `Enterprise Solutions Inquiry: ${company_name.trim()}`,
          company_name: company_name.trim(),
          work_email: work_email.trim(),
          phone_number: phone_number || 'N/A',
          deployment_type: deployment_type || 'cloud',
          infrastructure_needs: infrastructure_needs || 'Custom Enterprise Setup',
          message: message || 'N/A',
          submitted_at: new Date().toISOString()
        })
      })
    } catch (fsErr) {
      console.warn('[Enterprise Leads] Formspree dispatch notice:', fsErr)
    }

    // 2. Insert In-App Notification for all Platform Admins (shows in Admin Center)
    try {
      const { data: admins } = await adminClient
        .from('profiles')
        .select('id')
        .in('role', ['super_admin', 'admin'])

      if (admins && admins.length > 0) {
        const adminAlerts = admins.map((adm: any) => ({
          user_id: adm.id,
          title: `New Enterprise Inquiry: ${company_name.trim()}`,
          message: `${company_name.trim()} (${work_email.trim()}) submitted an Enterprise inquiry for ${deployment_type || 'cloud'} deployment.`,
          type: 'enterprise_inquiry',
          action_url: '/admin/enterprise-leads',
          action_label: 'View Inquiries'
        }))
        await adminClient.from('notifications').insert(adminAlerts)
      }
    } catch (notifErr) {
      console.warn('[Enterprise Leads] Admin notification notice:', notifErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you! Our enterprise sales team will contact you within 24 hours.',
      lead: insertedData || data
    })
  } catch (err: any) {
    console.error('[Enterprise Leads POST] Unexpected error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
