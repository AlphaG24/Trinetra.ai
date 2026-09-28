import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { room_name, participant_name, agent_id } = body;

    if (!room_name) {
      return NextResponse.json({ error: 'room_name is required' }, { status: 400 });
    }

    // Optional user validation via getUser() per SEC-003
    let userId: string | null = null;
    let organizationId: string | null = null;
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

    // Pre-record in voice_calls with service role key if available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey && agent_id) {
      try {
        const adminClient = createSupabaseClient(supabaseUrl, serviceKey);
        
        // If user_id wasn't resolved from session, query agent's owner
        if (!userId) {
          const { data: ag } = await adminClient
            .from('agents')
            .select('user_id, organization_id')
            .eq('id', agent_id)
            .maybeSingle();
          if (ag) {
            userId = ag.user_id;
            organizationId = organizationId || ag.organization_id;
          }
        }

        await adminClient.from('voice_calls').insert({
          agent_id,
          user_id: userId,
          organization_id: organizationId,
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
    }

    return NextResponse.json({
      status: 'success',
      token,
      url: livekitUrl,
      roomName: room_name,
      participantIdentity,
    });
  } catch (err: any) {
    console.error('[livekit-token route error]:', err);
    return NextResponse.json({ error: 'Internal server error generating voice session' }, { status: 500 });
  }
}
