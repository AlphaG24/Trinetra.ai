import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// Static defaults to seed if not found in db
const DEFAULT_BLUEPRINTS = {
  "Receptionist": {
    firstMessage: "Namaste. I am {agentName}, the receptionist. How can I help you book an appointment?",
    systemPrompt: "You are a professional receptionist for {userName}. Your goal is to capture the user's Name, Phone Number, and Intent. Once captured, use the 'save_lead' tool immediately.",
    functions: [
      {
        name: "save_lead",
        description: "Save a potential client's details.",
        parameters: {
          type: "object",
          properties: {
            client_name: { type: "string", description: "The name of the client." },
            phone: { type: "string", description: "The client's phone number." },
            notes: { type: "string", description: "Summary of client's intent or request." }
          },
          required: ["client_name", "phone"]
        }
      }
    ]
  },
  "Sales Lead": {
    firstMessage: "Hello! This is {agentName} calling from {userName}'s team. We noticed you were interested in our premium services.",
    systemPrompt: "You are a top-tier sales executive for {userName}. Your goal is to qualify the lead, understand their budget and timeline, and schedule a closing call. Use 'save_lead' to record interest.",
    functions: [
      {
        name: "save_lead",
        description: "Save a qualified lead's details.",
        parameters: {
          type: "object",
          properties: {
            client_name: { type: "string" },
            phone: { type: "string" },
            notes: { type: "string" },
            budget: { type: "string" }
          },
          required: ["client_name", "phone"]
        }
      }
    ]
  },
  "Technical Support": {
    firstMessage: "Hi there, I'm {agentName} from Technical Support. What issue are you facing today?",
    systemPrompt: "You are a helpful technical support agent for {userName}. Diagnose the user's problem. If you cannot solve it, collect their contact info for a human callback using 'save_lead'.",
    functions: [
      {
        name: "save_lead",
        description: "Escalate ticket to human support.",
        parameters: {
          type: "object",
          properties: {
            client_name: { type: "string" },
            phone: { type: "string" },
            issue_summary: { type: "string" }
          },
          required: ["client_name", "phone"]
        }
      }
    ]
  },
  "Custom": {
    firstMessage: "Hello, I am {agentName}. How may I assist you?",
    systemPrompt: "You are a helpful AI assistant for {userName}.",
    functions: []
  }
}

async function checkAdminAuth() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized', status: 401, supabase }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: 'Forbidden: Admin role required', status: 403, supabase }
  }

  return { user, supabase }
}

export async function GET() {
  try {
    const { error, status, supabase } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    // Query system_config key 'agent_blueprints'
    const { data: config, error: configErr } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'agent_blueprints')
      .single()

    // If config key is missing, return the default seeded blueprints
    if (configErr || !config) {
      return NextResponse.json({ blueprints: DEFAULT_BLUEPRINTS })
    }

    try {
      const parsed = JSON.parse(config.config_value)
      return NextResponse.json({ blueprints: parsed })
    } catch {
      return NextResponse.json({ blueprints: DEFAULT_BLUEPRINTS })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { error, status, supabase } = await checkAdminAuth()
    if (error) return NextResponse.json({ error }, { status })

    const body = await req.json()
    const { blueprints } = body

    if (!blueprints || typeof blueprints !== 'object') {
      return NextResponse.json({ error: 'Invalid blueprints payload' }, { status: 400 })
    }

    // Upsert into system_config
    const { error: upsertErr } = await supabase
      .from('system_config')
      .upsert({
        config_key: 'agent_blueprints',
        config_value: JSON.stringify(blueprints),
        description: 'Global templates & prompt blueprints for agents'
      }, { onConflict: 'config_key' })

    if (upsertErr) throw upsertErr

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
