import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function decryptToken(encryptedToken: string): string {
  try {
    if (!encryptedToken) return ''
    if (encryptedToken.trim().startsWith('{')) {
      const parsed = JSON.parse(encryptedToken)
      if (parsed.iv && parsed.ciphertext && parsed.tag) {
        const SECRET_SEED = process.env.ENCRYPTION_SECRET_SEED || process.env.SUPABASE_SERVICE_ROLE_KEY || 'trinetra-dev-byon-secret-seed-auth'
        const key = crypto.createHash('sha256').update(SECRET_SEED).digest()
        const iv = Buffer.from(parsed.iv, 'hex')
        const tag = Buffer.from(parsed.tag, 'hex')
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
        decipher.setAuthTag(tag)
        let decrypted = decipher.update(parsed.ciphertext, 'hex', 'utf8')
        decrypted += decipher.final('utf8')
        return decrypted
      }
    }

    const key = process.env.ENCRYPTION_KEY || 'trinetra-default-encryption-key-32b'
    const keyBuffer = crypto.scryptSync(key, 'salt', 32)
    const [ivHex, authTagHex, encrypted] = encryptedToken.split(':')
    if (ivHex && authTagHex && encrypted) {
      const iv = Buffer.from(ivHex, 'hex')
      const authTag = Buffer.from(authTagHex, 'hex')
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv)
      decipher.setAuthTag(authTag)
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    }
    return encryptedToken
  } catch {
    return encryptedToken
  }
}

async function verifySingleExotelNumber(accountSid: string, basicAuth: string, cleanSubdomain: string, rawNumber: string) {
  try {
    const cleaned = rawNumber.replace(/[\s\+\-]/g, '')
    const url = `https://${cleanSubdomain}/v1/Accounts/${accountSid}/Numbers/${cleaned}.json`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Accept': 'application/json'
      }
    })
    if (res.ok) {
      const data = await res.json()
      const numObj = data?.Numbers || data?.numbers || {}
      return {
        verified: true,
        circle: numObj.CircleName || numObj.Circle || '',
        operator: numObj.OperatorName || numObj.Operator || '',
        type: numObj.Type || 'ExoPhone',
        formatted: numObj.PhoneNumber || rawNumber
      }
    }
  } catch (e) {
    console.warn(`[verifySingleExotelNumber] Error verifying ${rawNumber}:`, e)
  }
  return null
}

async function fetchNumbersFromExotel(accountSid: string, apiKey: string, authToken: string, subdomain: string, orgId?: string) {
  const cleanSubdomain = (subdomain || 'api.exotel.com').replace(/^https?:\/\//, '').replace(/\/$/, '')
  const basicAuth = Buffer.from(`${apiKey}:${authToken}`).toString('base64')
  const foundNumbersMap = new Map<string, any>()

  // 1. Try Exotel bulk endpoints
  const bulkEndpoints = [
    `https://${cleanSubdomain}/v2_beta/Accounts/${accountSid}/IncomingPhoneNumbers`,
    `https://${cleanSubdomain}/v1/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
    `https://${cleanSubdomain}/v1/Accounts/${accountSid}/Numbers.json`
  ]

  for (const ep of bulkEndpoints) {
    try {
      const res = await fetch(ep, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Accept': 'application/json'
        }
      })
      if (res.ok) {
        const data = await res.json()
        const rawList = data?.incoming_phone_numbers || data?.IncomingPhoneNumbers || data?.Numbers || data?.numbers || []
        if (Array.isArray(rawList)) {
          for (const n of rawList) {
            const phone = n.phone_number || n.PhoneNumber || n.number
            if (phone) {
              foundNumbersMap.set(phone.replace(/[\s\+\-]/g, ''), {
                phone_number: phone,
                friendly_name: n.friendly_name || n.FriendlyName || 'ExoPhone',
                sid: n.sid || n.Sid || n.id || `exo_${Date.now()}`,
                circle: n.region || n.CircleName || '',
                is_linked: false
              })
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[Exotel Bulk Fetch] Endpoint ${ep} error:`, err)
    }
  }

  // 2. Query workspace and admin pool numbers from Supabase
  if (orgId) {
    try {
      const admin = getAdminClient()
      const { data: dbNums } = await admin
        .from('phone_numbers')
        .select('*')
        .or(`provider.eq.exotel,organization_id.eq.${orgId},assigned_org_id.eq.${orgId}`)

      if (dbNums && dbNums.length > 0) {
        for (const dbNum of dbNums) {
          const key = dbNum.phone_number.replace(/[\s\+\-]/g, '')
          // Verify with Exotel API
          const verified = await verifySingleExotelNumber(accountSid, basicAuth, cleanSubdomain, dbNum.phone_number)

          const isOrgOwned = dbNum.organization_id === orgId || dbNum.assigned_org_id === orgId
          const friendly = verified
            ? `${verified.operator ? verified.operator + ' ' : ''}${verified.circle ? '(' + verified.circle + ')' : 'ExoPhone'}`
            : (dbNum.city ? `ExoPhone (${dbNum.city})` : 'ExoPhone')

          foundNumbersMap.set(key, {
            phone_number: verified?.formatted || dbNum.phone_number,
            friendly_name: friendly,
            sid: dbNum.provider_number_id || dbNum.id,
            circle: verified?.circle || dbNum.city || '',
            operator: verified?.operator || '',
            status: dbNum.status,
            is_linked: isOrgOwned && dbNum.is_assigned,
            verified: !!verified
          })
        }
      }
    } catch (dbErr) {
      console.error('[Exotel Numbers Sync] DB query error:', dbErr)
    }
  }

  const numbers = Array.from(foundNumbersMap.values())
  return {
    numbers,
    success: true,
    total: numbers.length,
    message: numbers.length === 0
      ? 'No virtual numbers found automatically. You can link your ExoPhone directly below.'
      : `Successfully discovered ${numbers.length} ExoPhone number(s).`
  }
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

    if (!profile?.organization_id) {
      return NextResponse.json({ numbers: [] })
    }

    const { data: creds } = await admin
      .from('byon_carrier_credentials')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('carrier', 'exotel')
      .order('updated_at', { ascending: false })
      .limit(1)

    const cred = creds?.[0]
    const encryptedToken = cred?.encrypted_auth_token || (cred as any)?.auth_token_encrypted

    if (!cred || !cred.account_sid || !encryptedToken) {
      return NextResponse.json({
        numbers: [],
        message: 'No active Exotel credentials found. Please click "Save & Connect" with your Exotel Account SID, API Key, and API Token first.'
      })
    }

    const apiKey = cred.api_key_or_sid || ''
    const authToken = decryptToken(encryptedToken)
    const accountSid = cred.account_sid
    const subdomain = cred.webhook_url || 'api.exotel.com'

    const result = await fetchNumbersFromExotel(accountSid, apiKey, authToken, subdomain, profile.organization_id)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[Exotel Numbers Sync Error]', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch Exotel numbers' }, { status: 500 })
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

    const body = await req.json().catch(() => ({}))
    let { accountSid, apiKey, apiToken, subdomain } = body

    if (!accountSid || !apiToken) {
      if (profile?.organization_id) {
        const { data: creds } = await admin
          .from('byon_carrier_credentials')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .eq('carrier', 'exotel')
          .order('updated_at', { ascending: false })
          .limit(1)

        const cred = creds?.[0]
        const encryptedToken = cred?.encrypted_auth_token || (cred as any)?.auth_token_encrypted
        if (cred && encryptedToken) {
          accountSid = accountSid || cred.account_sid
          apiKey = apiKey || cred.api_key_or_sid
          apiToken = decryptToken(encryptedToken)
          subdomain = subdomain || cred.webhook_url
        }
      }
    }

    if (!accountSid || !apiKey || !apiToken) {
      return NextResponse.json({
        numbers: [],
        message: 'Please provide your Exotel Account SID, API Key, and API Token.'
      }, { status: 400 })
    }

    const result = await fetchNumbersFromExotel(
      accountSid,
      apiKey,
      apiToken,
      subdomain || 'api.exotel.com',
      profile?.organization_id
    )
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[Exotel Numbers Sync POST Error]', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch Exotel numbers' }, { status: 500 })
  }
}
