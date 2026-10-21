import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

async function generateLiveKitToken({
  room_name,
  participant_name,
  agent_id,
}: {
  room_name: string;
  participant_name?: string;
  agent_id?: string | null;
}) {
  if (!room_name) {
    return NextResponse.json({ error: 'room_name is required' }, { status: 400 });
  }

  // Optional user validation via getUser() per SEC-003 with 1.2s timeout guard
  let userId: string | null = null;
  let organizationId: string | null = null;
  try {
    const authCheckPromise = (async () => {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .maybeSingle();
          organizationId = profile?.organization_id || null;
        }
      } catch {}
    })();
    const authTimeout = new Promise((resolve) => setTimeout(resolve, 1200));
    await Promise.race([authCheckPromise, authTimeout]);
  } catch {
    // In sandbox/anonymous test calls, continue with null user
  }

  const apiKey = (process.env.LIVEKIT_API_KEY || 'devkey').trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || 'secretsecretsecretsecretsecret12').trim();
  const livekitUrl = (process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://127.0.0.1:7880').trim();

  const now = Math.floor(Date.now() / 1000);
  const participantIdentity = `${participant_name || 'User'}_${crypto.randomBytes(3).toString('hex')}`;

  const payload = {
    exp: now + 86400,
    iss: apiKey,
    nbf: now - 5,
    sub: participantIdentity,
    name: participant_name || 'User',
    metadata: agent_id || '',
    video: {
      room: room_name,
      roomJoin: true,
      roomCreate: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  };

  // Fast HMAC-SHA256 JWT Generation
  const header = { alg: 'HS256', typ: 'JWT' };
  const encode = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const dataToSign = `${encode(header)}.${encode(payload)}`;
  const signature = crypto.createHmac('sha256', apiSecret).update(dataToSign).digest('base64url');
  const token = `${dataToSign}.${signature}`;

  // Pre-record in voice_calls asynchronously without blocking instant token return
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey && agent_id) {
    (async () => {
      try {
        const adminClient = createSupabaseClient(supabaseUrl, serviceKey);
        let resolvedUserId = userId;
        let resolvedOrgId = organizationId;

        if (!resolvedUserId) {
          const { data: ag } = await adminClient
            .from('agents')
            .select('user_id, organization_id')
            .eq('id', agent_id)
            .maybeSingle();
          if (ag) {
            resolvedUserId = ag.user_id;
            resolvedOrgId = resolvedOrgId || ag.organization_id;
          }
        }

        await adminClient.from('voice_calls').insert({
          agent_id,
          user_id: resolvedUserId,
          organization_id: resolvedOrgId,
          caller_name: participant_name || 'Browser Sandbox',
          caller_phone: 'Browser Sandbox',
          status: 'in_progress',
          started_at: new Date().toISOString(),
          duration_seconds: 0,
          metadata: {
            room_name,
            provider_call_id: room_name,
            session_id: room_name,
            direction: 'sandbox',
          },
        });
      } catch (vcErr) {
        console.warn('[livekit-token] voice_calls pre-record notice:', vcErr);
      }
    })().catch(() => {});
  }

  // Trigger backend agent worker to join room immediately (local with Render cloud fallback)
  (async () => {
    const payload = JSON.stringify({
      room_name,
      participant_name: participant_name || 'User',
      agent_id: agent_id || null,
    });

    let dispatched = false;
    const isCloudEnv = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    // 1. Try local FastAPI backend only in local dev environment
    if (!isCloudEnv) {
      try {
        const localController = new AbortController();
        const localTimeout = setTimeout(() => localController.abort(), 300);
        const localRes = await fetch('http://127.0.0.1:8000/api/voice/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: localController.signal,
        });
        clearTimeout(localTimeout);
        if (localRes.ok) {
          dispatched = true;
        }
      } catch {}
    }

    // 2. If local backend did not dispatch, dispatch via Render cloud backend
    if (!dispatched) {
      try {
        const backendBase = (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://trinetra-ai-1-6f2n.onrender.com').replace(/\/$/, '');
        const renderRes = await fetch(`${backendBase}/api/voice/livekit-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
        if (renderRes.ok) {
          console.log('[livekit-token] Dispatched agent via Render cloud backend');
        }
      } catch (rErr: any) {
        console.warn('[livekit-token] Remote agent dispatch notice:', rErr?.message);
      }
    }
  })().catch(() => {});

  return NextResponse.json({
    status: 'success',
    token,
    url: livekitUrl,
    roomName: room_name,
    participantIdentity,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    return await generateLiveKitToken({
      room_name: body.room_name,
      participant_name: body.participant_name,
      agent_id: body.agent_id,
    });
  } catch (err: any) {
    console.error('[livekit-token POST error]:', err);
    return NextResponse.json({ error: 'Internal server error generating voice session' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const room_name = searchParams.get('room') || searchParams.get('room_name') || '';
    const participant_name = searchParams.get('username') || searchParams.get('participant_name') || 'User';
    const agent_id = searchParams.get('agent_id');

    return await generateLiveKitToken({
      room_name,
      participant_name,
      agent_id,
    });
  } catch (err: any) {
    console.error('[livekit-token GET error]:', err);
    return NextResponse.json({ error: 'Internal server error generating voice session' }, { status: 500 });
  }
}
