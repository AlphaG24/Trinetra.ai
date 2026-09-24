import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET() {
  let apiKey = process.env.ELEVENLABS_API_KEY || ''
  
  if (!apiKey) {
    try {
      const supabaseAdmin = createAdminClient()
      const { data } = await supabaseAdmin
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'ELEVENLABS_API_KEY')
        .maybeSingle()
      if (data?.config_value) {
        apiKey = data.config_value
      }
    } catch (err) {
      console.error('[ElevenLabs] Failed to fetch key from system_config:', err)
    }
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'ElevenLabs API key is not configured' }, { status: 500 })
  }
  
  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey }
  })
  
  if (!response.ok) {
    return NextResponse.json({ error: 'Failed to fetch voices' }, { status: response.status })
  }
  
  const data = await response.json()
  return NextResponse.json(data)
}
