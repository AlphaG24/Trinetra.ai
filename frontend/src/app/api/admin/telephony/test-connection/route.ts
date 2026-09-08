import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate super_admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Parse body
    const body = await request.json()
    const { provider } = body

    if (!provider || !['voicelink', 'twilio', 'simulated', 'exotel'].includes(provider)) {
      return NextResponse.json({ success: false, error: 'Invalid provider' }, { status: 400 })
    }

    let apiKey = body.api_key
    let accountSid = body.account_sid
    let authToken = body.auth_token || body.api_token
    let baseUrl = body.base_url
    let subdomain = body.subdomain

    if (provider !== 'simulated') {
      const isVoiceLinkMissing = provider === 'voicelink' && (!apiKey || !baseUrl || apiKey.startsWith('•'))
      const isTwilioMissing = provider === 'twilio' && (!accountSid || !authToken || accountSid.startsWith('•') || authToken.startsWith('•'))
      const isExotelMissing = provider === 'exotel' && (!accountSid || !apiKey || !authToken || accountSid.startsWith('•') || apiKey.startsWith('•') || authToken.startsWith('•'))

      if (isVoiceLinkMissing || isTwilioMissing || isExotelMissing) {
        const keysToFetch = provider === 'voicelink' 
          ? ['VOICELINK_API_KEY', 'VOICELINK_API_BASE_URL'] 
          : provider === 'exotel'
          ? ['EXOTEL_ACCOUNT_SID', 'EXOTEL_API_KEY', 'EXOTEL_API_TOKEN', 'EXOTEL_SUBDOMAIN']
          : ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'];
          
        const { data: configs } = await supabase
          .from('system_config')
          .select('config_key, config_value')
          .in('config_key', keysToFetch)
          
        const configMap: Record<string, string> = {}
        configs?.forEach(item => configMap[item.config_key] = item.config_value)

        if (provider === 'voicelink') {
          apiKey = apiKey && !apiKey.startsWith('•') ? apiKey : configMap['VOICELINK_API_KEY']
          baseUrl = baseUrl || configMap['VOICELINK_API_BASE_URL']
          if (!apiKey || !baseUrl) {
            return NextResponse.json({ success: false, error: "Provider not configured. Please save API credentials first." })
          }
        } else if (provider === 'exotel') {
          accountSid = accountSid && !accountSid.startsWith('•') ? accountSid : configMap['EXOTEL_ACCOUNT_SID']
          apiKey = apiKey && !apiKey.startsWith('•') ? apiKey : configMap['EXOTEL_API_KEY']
          authToken = authToken && !authToken.startsWith('•') ? authToken : configMap['EXOTEL_API_TOKEN']
          subdomain = subdomain || configMap['EXOTEL_SUBDOMAIN'] || 'api.exotel.com'
          if (!accountSid || !apiKey || !authToken) {
            return NextResponse.json({ success: false, error: "Exotel credentials not configured. Please save Account SID, API Key, and API Token first." })
          }
        } else if (provider === 'twilio') {
          accountSid = accountSid && !accountSid.startsWith('•') ? accountSid : configMap['TWILIO_ACCOUNT_SID']
          authToken = authToken && !authToken.startsWith('•') ? authToken : configMap['TWILIO_AUTH_TOKEN']
          if (!accountSid || !authToken) {
             return NextResponse.json({ success: false, error: "Provider not configured. Please save API credentials first." })
          }
        }
      }
    }

    const backendUrl = process.env.FASTAPI_URL || 'http://localhost:8000'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(`${backendUrl}/api/telephony/test/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          api_key: apiKey,
          account_sid: accountSid,
          auth_token: authToken,
          base_url: baseUrl,
          subdomain: subdomain
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        return NextResponse.json({ success: false, error: `Backend returned ${response.status}` })
      }
      
      const data = await response.json()
      return NextResponse.json(data)
      
    } catch (e: any) {
      clearTimeout(timeoutId)
      if (e.name === 'AbortError') {
        return NextResponse.json({ success: false, error: 'Connection timed out after 15 seconds' })
      }
      return NextResponse.json({ success: false, error: `Connection error: ${e.message}` })
    }

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
