import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-helpers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

let supabaseAdminSingleton: ReturnType<typeof createSupabaseClient> | null = null;

function getAdminClient() {
  if (!supabaseAdminSingleton) {
    supabaseAdminSingleton = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabaseAdminSingleton;
}

export const DEFAULT_DEMO_PERSONAS = [
  {
    id: 'ac11e104-a37a-4ff1-aef6-fc8a2c97f4d7',
    name: 'Arika',
    personality: 'Warm & Consultative',
    archetype: 'Multilingual Enterprise Concierge',
    voice_id: 'shreya',
    language: 'Fluent Hinglish & English',
    gender: 'female',
    description: 'Handles executive briefings, service overviews, and client queries with cultural warmth and sub-400ms cadence.',
    greeting_message: 'Namaste! Main Vaakriti se Arika bol rahi hoon, aapki AI assistant. Service quality ke liye yeh call record ki ja sakti hai. Aaj main aapki kya madad kar sakti hoon?',
    accent_color: '#15803D',
    badge_color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    suggested_prompts: [
      'What enterprise solutions does Vaakriti offer?',
      'How does Vaakriti achieve sub-450ms voice latency?',
      'Tell me about your Indian language support.',
    ],
    is_managed_by_dev: true,
  },
  {
    id: '6bcdcdcd-6684-4e8a-8564-77a27a9376be',
    name: 'Vikram',
    personality: 'Persuasive & Energetic',
    archetype: 'High-Velocity Sales & Deal Acceleration',
    voice_id: 'shubh',
    language: 'Hindi & English',
    gender: 'male',
    description: 'Engineered for objection handling, ROI calculations, and booking high-intent enterprise pilots effortlessly.',
    greeting_message: 'Hello! Main Vaakriti se Vikram bol raha hoon, an AI assistant. Yeh call quality review ke liye record ki ja sakti hai. Kya aap hamare enterprise pilot ke baare mein jaan-na chahte hain?',
    accent_color: '#C65B32',
    badge_color: 'bg-amber-50 text-amber-700 border-amber-200/60',
    suggested_prompts: [
      'I want to book an enterprise pilot for my team.',
      'How does Vaakriti compare on costs at 10,000 monthly calls?',
      'Can you integrate directly with our custom CRM?',
    ],
    is_managed_by_dev: true,
  },
  {
    id: '15db1c28-7773-483b-be11-56fc383a0801',
    name: 'Anika',
    personality: 'Empathetic & Methodical',
    archetype: 'Appointment & Operations Specialist',
    voice_id: 'anushka',
    language: 'Hinglish & Regional Dialects',
    gender: 'female',
    description: 'Expertly coordinates calendar schedules, verifies user intent, and handles logistical workflows without fatigue.',
    greeting_message: 'Namaste, main Vaakriti scheduling operations se Anika bol rahi hoon, ek AI assistant. Service quality ke liye call record ho sakti hai. Aapko appointment reschedule ya book karni hai?',
    accent_color: '#2563EB',
    badge_color: 'bg-blue-50 text-blue-700 border-blue-200/60',
    suggested_prompts: [
      'Can you schedule an onboarding call for Friday afternoon?',
      'Do you support SMS and WhatsApp confirmations?',
      'What details do you need to register my business?',
    ],
    is_managed_by_dev: true,
  },
  {
    id: '35398818-24de-4b55-999e-8d317141a3e2',
    name: 'Dr. Aarav',
    personality: 'Intellectual & Guiding',
    archetype: 'Trinetra Shiksha Academic Mentor',
    voice_id: 'shubh',
    language: 'English & Hindi',
    gender: 'male',
    description: 'Demonstrates Shiksha cognitive profiling, adaptive testing insights, and pedagogical student engagement.',
    greeting_message: 'Greetings! I am Dr. Aarav from Trinetra Shiksha, an AI academic guide. This session may be recorded for learning quality. How can I assist with your educational goals today?',
    accent_color: '#D97706',
    badge_color: 'bg-amber-50 text-amber-800 border-amber-200/60',
    suggested_prompts: [
      'How does Trinetra Shiksha personalize exam questions?',
      'Explain cognitive profile mapping for students.',
      'Can you demonstrate a mock reasoning question?',
    ],
    is_managed_by_dev: true,
  },
];

// GET: Fetch current demo agents configuration for developer_tester
export async function GET() {
  try {
    const { authenticated, profile } = await authenticateRequest();
    if (!authenticated || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['developer_tester', 'admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabaseAdmin = getAdminClient();
    
    // Fetch system configured demo agents
    const { data } = await (supabaseAdmin as any)
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'landing_demo_agents')
      .maybeSingle();

    let agents = DEFAULT_DEMO_PERSONAS;
    if (data?.config_value) {
      try {
        const parsed = JSON.parse(data.config_value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          agents = parsed;
        }
      } catch {
        // fallback to defaults
      }
    }

    // Fetch ALL agents from database for developer_tester without tenant limitations
    const { data: allDatabaseAgents, error: agentsError } = await (supabaseAdmin as any)
      .from('agents')
      .select('id, name, personality, greeting_message, voice_id, language, gender, status, organization_id, created_at, system_prompt, user_id')
      .order('name', { ascending: true });

    if (agentsError) {
      console.warn('[DeveloperDemoAgents] Notice loading all agents:', agentsError.message);
    }

    const myAgents = (allDatabaseAgents || []).filter(
      (ag: any) => ag.user_id === profile.id || (profile.organization_id && ag.organization_id === profile.organization_id)
    );

    return NextResponse.json({ 
      success: true, 
      agents, 
      my_agents: myAgents,
      all_agents: allDatabaseAgents || [],
      developer_id: profile.id,
    });
  } catch (err: any) {
    console.error('Error fetching developer demo agents:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Save updated demo agents configuration and synchronize with database agents
export async function POST(req: Request) {
  try {
    const { authenticated, profile } = await authenticateRequest();
    if (!authenticated || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['developer_tester', 'admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { agents } = body;

    if (!Array.isArray(agents) || agents.length === 0) {
      return NextResponse.json({ error: 'Invalid agents array provided' }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();

    // Synchronize each demo agent slot with real database agents
    const syncedAgents = [...agents];
    for (let i = 0; i < syncedAgents.length; i++) {
      const item = syncedAgents[i];
      if (!item || !item.name) continue;

      const isRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id || '');

      let existingAgent = null;
      if (isRealUuid) {
        const { data: dbAg } = await (supabaseAdmin as any)
          .from('agents')
          .select('id, user_id, organization_id')
          .eq('id', item.id)
          .maybeSingle();
        existingAgent = dbAg;
      }

      if (existingAgent) {
        // Update existing agent record
        await (supabaseAdmin as any)
          .from('agents')
          .update({
            name: item.name,
            personality: item.personality || 'Warm & Professional',
            greeting_message: item.greeting_message,
            voice_id: item.voice_id || 'shreya',
            language: item.language || 'Hinglish',
            gender: item.gender || 'female',
            status: 'live',
            is_demo: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
      } else {
        // Create new real database agent under this developer ID
        const newUuid = isRealUuid ? item.id : crypto.randomUUID();
        const { error: insertErr } = await (supabaseAdmin as any)
          .from('agents')
          .insert({
            id: newUuid,
            name: item.name,
            personality: item.personality || 'Warm & Professional',
            greeting_message: item.greeting_message,
            voice_id: item.voice_id || 'shreya',
            language: item.language || 'Hinglish',
            gender: item.gender || 'female',
            user_id: profile.id,
            organization_id: profile.organization_id || null,
            status: 'live',
            is_demo: true,
            system_prompt: `You are ${item.name}, an AI assistant for Vaakriti. Personality: ${item.personality || 'Warm & Professional'}.`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (!insertErr) {
          syncedAgents[i].id = newUuid;
        } else {
          console.warn('[DeveloperDemoAgents] Notice inserting agent:', insertErr.message);
        }
      }
    }

    // Persist finalized configuration into system_config
    const { error: upsertError } = await (supabaseAdmin as any)
      .from('system_config')
      .upsert(
        {
          config_key: 'landing_demo_agents',
          config_value: JSON.stringify(syncedAgents),
          description: 'Landing Page Live Demo Agents configured via Developer Tester Portal',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'config_key' }
      );

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({
      success: true,
      message: 'Demo agents successfully saved and synchronized with database! Changes are now live on the homepage.',
      agents: syncedAgents,
    });
  } catch (err: any) {
    console.error('Error saving developer demo agents:', err);
    return NextResponse.json({ error: err.message || 'Failed to save demo agents' }, { status: 500 });
  }
}
