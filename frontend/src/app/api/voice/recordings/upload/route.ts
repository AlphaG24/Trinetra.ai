import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Database service configuration missing' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const formData = await req.formData()
    const file = formData.get('file') as Blob | null
    const roomName = (formData.get('room_name') as string | null) || 'trinetra-web-call'
    const agentId = formData.get('agent_id') as string | null
    const durationSeconds = parseInt((formData.get('duration_seconds') as string | null) || '0', 10)

    if (!file || file.size < 100) {
      return NextResponse.json({ error: 'Audio file is empty or invalid' }, { status: 400 })
    }

    const safeRoom = roomName.replace(/[^a-zA-Z0-9_-]/g, '_')
    const filename = `${safeRoom}_${Date.now()}.webm`
    const storagePath = `recordings/${filename}`
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to Supabase Storage 'call-recordings' bucket
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('call-recordings')
      .upload(storagePath, buffer, {
        contentType: file.type || 'audio/webm',
        upsert: true,
      })

    if (uploadErr) {
      console.error('[API /recordings/upload] Storage upload error:', uploadErr)
      return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('call-recordings')
      .getPublicUrl(storagePath)

    const publicUrl = publicUrlData.publicUrl

    // Update voice_calls record by metadata->>room_name
    const updatePayload: Record<string, any> = {
      recording_url: publicUrl,
      status: 'completed',
      ended_at: new Date().toISOString(),
    }
    if (durationSeconds > 0) {
      updatePayload.duration_seconds = durationSeconds
    }

    const { data: updatedCalls, error: updateErr } = await supabaseAdmin
      .from('voice_calls')
      .update(updatePayload)
      .filter('metadata->>room_name', 'eq', roomName)
      .select('id')

    if (updateErr) {
      console.warn('[API /recordings/upload] Notice updating voice_calls:', updateErr.message)
    }

    // If no row was found (e.g. fast sandbox disconnect before agent.py wrote to DB), insert a clean completed record
    if (!updatedCalls || updatedCalls.length === 0) {
      let callUid: string | null = null
      let callOid: string | null = null

      if (agentId) {
        const { data: agentData } = await supabaseAdmin
          .from('agents')
          .select('user_id, organization_id')
          .eq('id', agentId)
          .maybeSingle()

        if (agentData) {
          callUid = agentData.user_id
          callOid = agentData.organization_id
        }
      }

      await supabaseAdmin.from('voice_calls').insert({
        agent_id: agentId || null,
        user_id: callUid,
        organization_id: callOid,
        caller_name: 'Web Sandbox User',
        caller_phone: 'Browser Sandbox',
        status: 'completed',
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        duration_seconds: durationSeconds || 0,
        recording_url: publicUrl,
        metadata: {
          room_name: roomName,
          provider_call_id: roomName,
          session_id: roomName,
          direction: 'sandbox',
        },
      })
    }

    return NextResponse.json({
      status: 'success',
      recording_url: publicUrl,
    })
  } catch (err: any) {
    console.error('[API /recordings/upload] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error processing audio' }, { status: 500 })
  }
}
