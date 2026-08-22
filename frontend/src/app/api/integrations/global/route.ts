import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import crypto from 'crypto'

const SECRET_SEED = process.env.SUPABASE_SERVICE_ROLE_KEY || 'default-secret-key-seed-value'
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SECRET_SEED).digest()
const IV_LENGTH = 16

function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function decrypt(text: string) {
  try {
    const textParts = text.split(':')
    const iv = Buffer.from(textParts.shift() || '', 'hex')
    const encryptedText = Buffer.from(textParts.join(':'), 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  } catch (e) {
    return ''
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's profile to get organization_id
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    let orgId = profile?.organization_id

    if (!orgId) {
      try {
        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
        const supabaseAdmin = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: existingOrg } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        
        orgId = existingOrg?.id

        if (!orgId) {
          const { data: newOrg } = await supabaseAdmin
            .from('organizations')
            .insert({ name: 'Default Org' })
            .select('id')
            .single()
          orgId = newOrg?.id
        }

        if (orgId) {
          await supabaseAdmin
            .from('profiles')
            .update({ organization_id: orgId })
            .eq('id', user.id)
        }
      } catch (err) {
        console.error('Failed to auto-heal organization in global integrations API:', err)
      }
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Profile organization not found' }, { status: 400 })
    }

    // Fetch existing global integration row (where agent_id is null)
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('organization_id', orgId)
      .is('agent_id', null)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({
        telegram: { connected: false },
        whatsapp: { connected: false },
        email: { connected: false },
        crm: { connected: false },
        calendar: { connected: false }
      })
    }

    // Decrypt credentials helper
    const decryptJson = (val: string | null) => {
      if (!val) return null
      const decrypted = decrypt(val)
      try {
        return decrypted ? JSON.parse(decrypted) : null
      } catch {
        return null
      }
    }

    const whatsappConfig = decryptJson(data.whatsapp_access_token)
    const emailConfig = decryptJson(data.whatsapp_phone_number_id)
    const calendarConfig = decryptJson(data.telegram_bot_token)

    return NextResponse.json({
      telegram: {
        connected: !!data.telegram_chat_id,
        bot_token: data.telegram_bot_token ? decrypt(data.telegram_bot_token) : '',
        chat_id: data.telegram_chat_id || ''
      },
      whatsapp: {
        connected: !!whatsappConfig,
        twilio_sid: whatsappConfig?.twilio_sid || '',
        auth_token: whatsappConfig?.auth_token || '',
        phone_number: whatsappConfig?.phone_number || ''
      },
      email: {
        connected: !!emailConfig,
        smtp_host: emailConfig?.smtp_host || '',
        smtp_port: emailConfig?.smtp_port || '',
        smtp_username: emailConfig?.smtp_username || '',
        smtp_password: emailConfig?.smtp_password || '',
        smtp_from: emailConfig?.smtp_from || ''
      },
      crm: {
        connected: !!data.crm_webhook_url,
        webhook_url: data.crm_webhook_url || '',
        sync_enabled: data.crm_sync_enabled || false
      },
      calendar: {
        connected: !!calendarConfig,
        cal_api_key: calendarConfig?.cal_api_key || '',
        event_type_id: calendarConfig?.event_type_id || ''
      }
    })
  } catch (err: any) {
    console.error('GET /api/integrations/global error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { type, config } = body

    if (!type || !config) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Encrypt helper
    const encryptJson = (obj: any) => encrypt(JSON.stringify(obj))

    // Fetch user's profile to get organization_id for RLS
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    let orgId = profile?.organization_id

    if (!orgId) {
      try {
        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
        const supabaseAdmin = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: existingOrg } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        
        orgId = existingOrg?.id

        if (!orgId) {
          const { data: newOrg } = await supabaseAdmin
            .from('organizations')
            .insert({ name: 'Default Org' })
            .select('id')
            .single()
          orgId = newOrg?.id
        }

        if (orgId) {
          await supabaseAdmin
            .from('profiles')
            .update({ organization_id: orgId })
            .eq('id', user.id)
        }
      } catch (err) {
        console.error('Failed to auto-heal organization in global integrations POST API:', err)
      }
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    // Query if there's an existing global integrations row
    const { data: existingRow, error: findError } = await supabase
      .from('integrations')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .is('agent_id', null)
      .maybeSingle()

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 })
    }

    // Prepare fields to update
    const updateData: any = {
      user_id: user.id,
      organization_id: profile.organization_id,
      agent_id: null,
      updated_at: new Date().toISOString()
    }

    if (type === 'telegram') {
      updateData.telegram_bot_token = config.bot_token ? encrypt(config.bot_token) : null
      updateData.telegram_chat_id = config.chat_id || null
    } else if (type === 'whatsapp') {
      updateData.whatsapp_access_token = config.twilio_sid ? encryptJson({
        twilio_sid: config.twilio_sid,
        auth_token: config.auth_token,
        phone_number: config.phone_number
      }) : null
    } else if (type === 'email') {
      updateData.whatsapp_phone_number_id = config.smtp_host ? encryptJson({
        smtp_host: config.smtp_host,
        smtp_port: config.smtp_port,
        smtp_username: config.smtp_username,
        smtp_password: config.smtp_password,
        smtp_from: config.smtp_from
      }) : null
    } else if (type === 'crm') {
      updateData.crm_webhook_url = config.webhook_url || null
      updateData.crm_sync_enabled = !!config.webhook_url
    } else if (type === 'calendar') {
      updateData.telegram_bot_token = config.cal_api_key ? encryptJson({
        cal_api_key: config.cal_api_key,
        event_type_id: config.event_type_id
      }) : null
    }

    let saveResult;
    if (existingRow?.id) {
      // Update existing
      const { data, error } = await supabase
        .from('integrations')
        .update(updateData)
        .eq('id', existingRow.id)
        .select()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      saveResult = data
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('integrations')
        .insert(updateData)
        .select()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      saveResult = data
    }

    return NextResponse.json({ success: true, data: saveResult })
  } catch (err: any) {
    console.error('POST /api/integrations/global error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  return POST(req)
}
