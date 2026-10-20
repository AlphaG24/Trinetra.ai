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

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { carrier } = body

    if (!carrier || !['exotel', 'twilio', 'sarvam'].includes(carrier)) {
      return NextResponse.json({ error: 'Valid carrier required (exotel, twilio, sarvam)' }, { status: 400 })
    }

    const admin = getAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const orgId = profile?.organization_id

    // Check if body provided credentials or fetch from vault
    let accountSid = (body.account_sid || '').trim()
    let apiKey = (body.api_key || body.api_key_or_sid || '').trim()
    let authToken = (body.auth_token || body.api_token || '').trim()
    let subdomain = (body.subdomain || 'api.exotel.com').trim()

    if (!authToken || !accountSid) {
      if (orgId) {
        const { data: vaultedList } = await admin
          .from('byon_carrier_credentials')
          .select('*')
          .eq('organization_id', orgId)
          .eq('carrier', carrier)
          .order('updated_at', { ascending: false })
          .limit(1)

        const vaulted = vaultedList?.[0]
        if (vaulted) {
          accountSid = accountSid || vaulted.account_sid || ''
          apiKey = apiKey || vaulted.api_key_or_sid || ''
          subdomain = subdomain || vaulted.webhook_url || 'api.exotel.com'
          const encToken = vaulted.encrypted_auth_token || (vaulted as any).auth_token_encrypted
          if (!authToken && encToken) {
            authToken = decryptToken(encToken)
          }
        }
      }
    }

    // 1. Test Exotel
    if (carrier === 'exotel') {
      if (!accountSid || !apiKey || !authToken) {
        return NextResponse.json({
          success: false,
          error: 'Please enter Account SID, API Key, and API Token to test connection.'
        }, { status: 400 })
      }

      const cleanSubdomain = subdomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
      const testUrl = `https://${cleanSubdomain}/v1/Accounts/${accountSid}.json`
      const basicAuth = Buffer.from(`${apiKey}:${authToken}`).toString('base64')

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      try {
        const exoRes = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Accept': 'application/json'
          },
          signal: controller.signal
        })
        clearTimeout(timeout)

        if (exoRes.ok) {
          return NextResponse.json({
            success: true,
            message: `Exotel connection verified! Account SID ${accountSid} is active (HTTP ${exoRes.status}).`
          })
        } else if (exoRes.status === 401 || exoRes.status === 403) {
          return NextResponse.json({
            success: false,
            error: 'Exotel authentication failed: Invalid API Key or API Token.'
          }, { status: 400 })
        } else if (exoRes.status === 404) {
          return NextResponse.json({
            success: false,
            error: `Exotel Account SID '${accountSid}' was not found on cluster ${cleanSubdomain}.`
          }, { status: 400 })
        } else {
          return NextResponse.json({
            success: false,
            error: `Exotel gateway returned HTTP ${exoRes.status}`
          }, { status: 400 })
        }
      } catch (err: any) {
        clearTimeout(timeout)
        if (err.name === 'AbortError') {
          return NextResponse.json({ success: false, error: 'Exotel gateway ping timed out (10s)' }, { status: 504 })
        }
        return NextResponse.json({ success: false, error: `Connection failed: ${err.message}` }, { status: 500 })
      }
    }

    // 2. Test Twilio
    if (carrier === 'twilio') {
      if (!accountSid || !authToken) {
        return NextResponse.json({
          success: false,
          error: 'Please enter Twilio Account SID and Auth Token to test connection.'
        }, { status: 400 })
      }

      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      try {
        const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
          method: 'GET',
          headers: { 'Authorization': `Basic ${basicAuth}` },
          signal: controller.signal
        })
        clearTimeout(timeout)

        if (twilioRes.ok) {
          return NextResponse.json({
            success: true,
            message: `Twilio connection verified! Account SID ${accountSid} is active.`
          })
        } else if (twilioRes.status === 401) {
          return NextResponse.json({
            success: false,
            error: 'Twilio authentication failed: Invalid Account SID or Auth Token.'
          }, { status: 400 })
        } else {
          return NextResponse.json({
            success: false,
            error: `Twilio returned HTTP ${twilioRes.status}`
          }, { status: 400 })
        }
      } catch (err: any) {
        clearTimeout(timeout)
        return NextResponse.json({ success: false, error: `Twilio test failed: ${err.message}` }, { status: 500 })
      }
    }

    // 3. Test Sarvam
    if (carrier === 'sarvam') {
      const sarvamKey = authToken || apiKey
      if (!sarvamKey) {
        return NextResponse.json({
          success: false,
          error: 'Please enter your Sarvam API Subscription Key to test connection.'
        }, { status: 400 })
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      try {
        // Ping Sarvam AI API
        const sarvamRes = await fetch('https://api.sarvam.ai/speech-to-text', {
          method: 'POST',
          headers: {
            'api-subscription-key': sarvamKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({}),
          signal: controller.signal
        })
        clearTimeout(timeout)

        // If key is invalid, Sarvam returns 401 or 403 Unauthorized
        if (sarvamRes.status === 401 || sarvamRes.status === 403) {
          return NextResponse.json({
            success: false,
            error: 'Sarvam authentication failed: Invalid or inactive API Subscription Key.'
          }, { status: 400 })
        }

        // A 400 or 422 or 200 means the API key is authorized (the empty body failed validation, which proves the key passed auth)
        return NextResponse.json({
          success: true,
          message: 'Sarvam AI credentials verified successfully!'
        })
      } catch (err: any) {
        clearTimeout(timeout)
        return NextResponse.json({ success: false, error: `Sarvam test failed: ${err.message}` }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Unsupported carrier' }, { status: 400 })
  } catch (err: any) {
    console.error('[BYON Test Route Error]', err)
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 })
  }
}
