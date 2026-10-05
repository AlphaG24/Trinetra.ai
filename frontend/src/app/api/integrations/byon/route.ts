import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SECRET_SEED = process.env.ENCRYPTION_SECRET_SEED || process.env.SUPABASE_SERVICE_ROLE_KEY || 'trinetra-dev-byon-secret-seed-auth'
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SECRET_SEED).digest()

function encryptToken(token: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
  let encrypted = cipher.update(token, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  const tag = cipher.getAuthTag()
  return JSON.stringify({
    iv: iv.toString('hex'),
    ciphertext: encrypted.toString('hex'),
    tag: tag.toString('hex'),
  })
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const orgId = profile?.organization_id
    if (!orgId) {
      return NextResponse.json({ twilio: null, exotel: null })
    }

    const { data: creds, error } = await admin
      .from('byon_carrier_credentials')
      .select('id, carrier, account_sid, api_key_or_sid, webhook_url, status, last_synced_at, created_at')
      .eq('organization_id', orgId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const twilioCred = creds?.find(c => c.carrier === 'twilio') || null
    const exotelCred = creds?.find(c => c.carrier === 'exotel') || null

    return NextResponse.json({
      twilio: twilioCred ? {
        id: twilioCred.id,
        connected: twilioCred.status === 'active',
        account_sid: twilioCred.account_sid,
        api_key_or_sid: twilioCred.api_key_or_sid,
        status: twilioCred.status,
        last_synced_at: twilioCred.last_synced_at,
      } : { connected: false },
      exotel: exotelCred ? {
        id: exotelCred.id,
        connected: exotelCred.status === 'active',
        account_sid: exotelCred.account_sid,
        api_key_or_sid: exotelCred.api_key_or_sid,
        subdomain: exotelCred.webhook_url || 'api.exotel.com',
        status: exotelCred.status,
        last_synced_at: exotelCred.last_synced_at,
      } : { connected: false },
    })
  } catch (err: any) {
    console.error('BYON GET error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    let orgId = profile?.organization_id
    if (!orgId) {
      const { data: newOrg } = await admin.from('organizations').insert({ name: 'My Workspace' }).select('id').single()
      orgId = newOrg?.id
      if (orgId) {
        await admin.from('profiles').update({ organization_id: orgId }).eq('id', user.id)
      }
    }

    const body = await req.json()
    const { carrier, account_sid, auth_token, api_key_or_sid, subdomain } = body

    if (!carrier || !['twilio', 'exotel'].includes(carrier)) {
      return NextResponse.json({ error: 'Carrier must be twilio or exotel' }, { status: 400 })
    }
    if (!account_sid || !auth_token) {
      return NextResponse.json({ error: 'Account SID and Auth Token / API Secret are required' }, { status: 400 })
    }

    const encryptedToken = encryptToken(auth_token)
    const keyFingerprint = crypto.createHash('sha256').update(auth_token).digest('hex')

    const { data: upserted, error } = await admin
      .from('byon_carrier_credentials')
      .upsert({
        organization_id: orgId,
        carrier,
        account_sid: account_sid.trim(),
        api_key_or_sid: api_key_or_sid?.trim() || null,
        encrypted_auth_token: encryptedToken,
        key_fingerprint: keyFingerprint,
        webhook_url: subdomain ? subdomain.trim() : null,
        status: 'active',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,carrier,account_sid' })
      .select('id, carrier, account_sid, status, last_synced_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${carrier.toUpperCase()} credentials successfully encrypted and vaulted with AES-256-GCM.`,
      credential: upserted,
    })
  } catch (err: any) {
    console.error('BYON POST error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const orgId = profile?.organization_id
    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const carrier = searchParams.get('carrier')

    if (!carrier || !['twilio', 'exotel'].includes(carrier)) {
      return NextResponse.json({ error: 'Valid carrier required' }, { status: 400 })
    }

    await admin
      .from('byon_carrier_credentials')
      .delete()
      .eq('organization_id', orgId)
      .eq('carrier', carrier)

    return NextResponse.json({ success: true, message: `${carrier.toUpperCase()} carrier integration disconnected.` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
