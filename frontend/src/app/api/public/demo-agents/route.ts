import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export interface DemoAgentItem {
  id: string;
  name: string;
  personality: string;
  archetype: string;
  voice_id: string;
  language: string;
  gender: string;
  description: string;
  greeting_message: string;
  accent_color: string;
  badge_color: string;
  suggested_prompts: string[];
  is_managed_by_dev: boolean;
  campaign_purpose?: string;
  industry_domain?: string;
}

// Curated persona configurations matching the Vaakriti design system
const DEFAULT_DEMO_PERSONAS: DemoAgentItem[] = [
  {
    id: 'ac11e104-a37a-4ff1-aef6-fc8a2c97f4d7', // Real DB Agent: Arika
    name: 'Arika',
    personality: 'Warm & Consultative',
    archetype: 'Multilingual Enterprise Concierge',
    voice_id: 'shreya',
    language: 'Fluent Hinglish & English',
    gender: 'female',
    description: 'Handles executive briefings, service overviews, and client queries with cultural warmth and sub-400ms cadence.',
    greeting_message: 'Namaste! Main Vaakriti se Arika bol rahi hoon, aapki AI assistant. Service quality ke liye yeh call record ki ja sakti hai. Aaj main aapki kya madad kar sakti hoon?',
    accent_color: '#2E5A44', // Forest Sage
    badge_color: 'bg-[#2E5A44]/10 text-[#2E5A44] border-[#2E5A44]/20',
    suggested_prompts: [
      'What enterprise solutions does Vaakriti offer?',
      'How does Vaakriti achieve sub-450ms voice latency?',
      'Tell me about your Indian language support.',
    ],
    is_managed_by_dev: true,
  },
  {
    id: '6bcdcdcd-6684-4e8a-8564-77a27a9376be', // Real DB Agent: Vikram
    name: 'Vikram',
    personality: 'Persuasive & Energetic',
    archetype: 'High-Velocity Sales & Deal Acceleration',
    voice_id: 'shubh',
    language: 'Hindi & English',
    gender: 'male',
    description: 'Engineered for objection handling, ROI calculations, and booking high-intent enterprise pilots effortlessly.',
    greeting_message: 'Hello! Main Vaakriti se Vikram bol raha hoon, an AI assistant. Yeh call quality review ke liye record ki ja sakti hai. Kya aap hamare enterprise pilot ke baare mein jaan-na chahte hain?',
    accent_color: '#C65B32', // Heritage Terracotta
    badge_color: 'bg-[#C65B32]/10 text-[#C65B32] border-[#C65B32]/20',
    suggested_prompts: [
      'I want to book an enterprise pilot for my team.',
      'How does Vaakriti compare on costs at 10,000 monthly calls?',
      'Can you integrate directly with our custom CRM?',
    ],
    is_managed_by_dev: true,
  },
  {
    id: '35398818-24de-4b55-999e-8d317141a3e2', // Real DB Agent: Anika
    name: 'Anika',
    personality: 'Empathetic & Methodical',
    archetype: 'Appointment & Operations Specialist',
    voice_id: 'ritu',
    language: 'Hinglish & Regional Dialects',
    gender: 'female',
    description: 'Expertly coordinates calendar schedules, verifies user intent, and handles logistical workflows without fatigue.',
    greeting_message: 'Namaste, main Vaakriti scheduling operations se Anika bol rahi hoon, ek AI assistant. Service quality ke liye call record ho sakti hai. Aapko appointment reschedule ya book karni hai?',
    accent_color: '#2B4C7E', // Royal Slate Blue
    badge_color: 'bg-[#2B4C7E]/10 text-[#2B4C7E] border-[#2B4C7E]/20',
    suggested_prompts: [
      'Can you schedule an onboarding call for Friday afternoon?',
      'Do you support SMS and WhatsApp confirmations?',
      'What details do you need to register my business?',
    ],
    is_managed_by_dev: true,
  },
  {
    id: 'dd4da4c1-9deb-4047-8927-5e12402e6b1f', // Real DB Agent: Shubh
    name: 'Shubh',
    personality: 'Direct & Pragmatic',
    archetype: 'AI Sales & Operations Strategist',
    voice_id: 'shubh',
    language: 'Hinglish & English',
    gender: 'male',
    description: 'Specializes in high-intent conversations, answering business inquiries, and onboarding enterprise teams.',
    greeting_message: 'Hello, main Shubh bol raha hoon Vaakriti se, an AI assistant. Call quality ke liye record ki ja sakti hai. Kaise help kar sakta hoon?',
    accent_color: '#D97706', // Golden Saffron
    badge_color: 'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20',
    suggested_prompts: [
      'How does Vaakriti handle multilingual voice switching?',
      'Explain carrier SIP trunking integration.',
      'Can you demonstrate appointment booking?',
    ],
    is_managed_by_dev: true,
  },
];

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ agents: DEFAULT_DEMO_PERSONAS, source: 'fallback_config' });
    }

    const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceKey);

    const fetchDbAgents = async (): Promise<DemoAgentItem[]> => {
      // 0. Check if developer_tester configured custom demo agents via Portal
      const { data: configData } = await (supabaseAdmin as any)
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'landing_demo_agents')
        .maybeSingle();

      if (configData?.config_value) {
        try {
          const parsed = JSON.parse(configData.config_value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch {
          // proceed to DB query fallback
        }
      }

      // 1. Fetch developer_tester and admin profile IDs
      const { data: devProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, role')
        .in('role', ['developer_tester', 'admin', 'super_admin']);

      const devUserIds = (devProfiles || []).map((p) => p.id);

      // 2. Query demo agents or active platform agents
      let query = supabaseAdmin
        .from('agents')
        .select('id, name, personality, voice_id, language, is_demo, user_id, greeting_message, gender, agent_type, status, system_prompt, personalities, campaign_purpose, industry_domain')
        .in('status', ['live', 'active']);

      if (devUserIds.length > 0) {
        query = query.or(`is_demo.eq.true,user_id.in.(${devUserIds.join(',')})`);
      } else {
        query = query.eq('is_demo', true);
      }

      let { data: dbAgents, error: agentsError } = await query.limit(10);

      // If no specific demo or dev agents found, query top active platform agents
      if (!dbAgents || dbAgents.length === 0) {
        const { data: fallbackAgents } = await supabaseAdmin
          .from('agents')
          .select('id, name, personality, voice_id, language, is_demo, user_id, greeting_message, gender, agent_type, status, system_prompt, personalities, campaign_purpose, industry_domain')
          .in('status', ['live', 'active'])
          .limit(8);
        dbAgents = fallbackAgents || [];
      }

      if (agentsError && (!dbAgents || dbAgents.length === 0)) {
        return DEFAULT_DEMO_PERSONAS;
      }

      // Map DB agents, merging with rich archetype details
      const colorThemes = [
        { accent: '#2E5A44', badge: 'bg-[#2E5A44]/10 text-[#2E5A44] border-[#2E5A44]/20' },
        { accent: '#C65B32', badge: 'bg-[#C65B32]/10 text-[#C65B32] border-[#C65B32]/20' },
        { accent: '#2B4C7E', badge: 'bg-[#2B4C7E]/10 text-[#2B4C7E] border-[#2B4C7E]/20' },
        { accent: '#D97706', badge: 'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20' },
      ];

      const mergedAgents: DemoAgentItem[] = dbAgents.map((dbAgent, index) => {
        const preset = DEFAULT_DEMO_PERSONAS.find((p) => p.id === dbAgent.id || p.name.toLowerCase() === dbAgent.name.toLowerCase());
        const theme = colorThemes[index % colorThemes.length];

        const cleanName = dbAgent.name
          .replace(/^\[.*?\]\s*/, '')
          .replace(/\s*-\s*AI Voice Assistant.*$/i, '')
          .replace(/\s*-\s*Demo$/i, '')
          .trim();

        const rawPersonality = (dbAgent.personality || preset?.personality || 'Warm & Professional').toLowerCase();
        const formattedPersonality = rawPersonality.includes('friendly')
          ? 'Friendly & Conversational'
          : rawPersonality.includes('professional')
          ? 'Refined & Professional'
          : rawPersonality.includes('empathetic')
          ? 'Empathetic & Supportive'
          : 'Consultative & Analytical';

        return {
          id: dbAgent.id,
          name: cleanName || preset?.name || 'Vaakriti Agent',
          personality: preset?.personality || formattedPersonality,
          archetype: preset?.archetype || (dbAgent.agent_type === 'voice' ? 'Autonomous Voice Persona' : 'AI Workflow Agent'),
          voice_id: dbAgent.voice_id || preset?.voice_id || 'shreya',
          language: dbAgent.language === 'english' ? 'English & Hindi (Hinglish)' : (dbAgent.language || 'Hinglish'),
          gender: dbAgent.gender || preset?.gender || 'female',
          description: preset?.description || `Live agent calibrated for high-precision conversations with native Indian dialect nuances.`,
          greeting_message: dbAgent.greeting_message || preset?.greeting_message || `Namaste! Main Vaakriti se ${cleanName} bol rahi hoon, an AI assistant. Service quality ke liye call record ho sakti hai. Aaj main aapki kya madad kar sakti hoon?`,
          accent_color: preset?.accent_color || theme.accent,
          badge_color: preset?.badge_color || theme.badge,
          suggested_prompts: preset?.suggested_prompts || [
            `What can you do for my business?`,
            `How fast is your voice response?`,
            `Help me connect with the enterprise team.`,
          ],
          is_managed_by_dev: true,
          campaign_purpose: (dbAgent as any).campaign_purpose || preset?.campaign_purpose || undefined,
          industry_domain: (dbAgent as any).industry_domain || preset?.industry_domain || undefined,
        };
      });

      const existingIds = new Set(mergedAgents.map((a) => a.id));
      for (const defPersona of DEFAULT_DEMO_PERSONAS) {
        if (mergedAgents.length >= 4) break;
        if (!existingIds.has(defPersona.id)) {
          mergedAgents.push(defPersona);
          existingIds.add(defPersona.id);
        }
      }

      return mergedAgents;
    };

    const timeoutFallback = new Promise<DemoAgentItem[]>((resolve) =>
      setTimeout(() => resolve(DEFAULT_DEMO_PERSONAS), 2000)
    );

    const agents = await Promise.race([fetchDbAgents(), timeoutFallback]);
    return NextResponse.json({ agents, source: 'live_developer_managed' });
  } catch (error: any) {
    console.error('[Public Demo Agents API Error]:', error);
    return NextResponse.json({ agents: DEFAULT_DEMO_PERSONAS, source: 'error_fallback' });
  }
}
