/**
 * LiveKit Client Configuration and Token Fetcher
 */

export const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://127.0.0.1:7880'

export interface LiveKitTokenResponse {
  token: string
  url: string
  roomName: string
  participantIdentity: string
}

export async function getLiveKitToken(
  roomName: string,
  participantName?: string,
  agentId?: string
): Promise<LiveKitTokenResponse> {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  // 1. Primary: Instant internal Next.js server route (0s delay, high reliability)
  try {
    const internalRes = await fetch(`${origin}/api/voice/livekit-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_name: roomName,
        participant_name: participantName || 'User',
        agent_id: agentId,
      }),
    });

    if (internalRes.ok) {
      const data = await internalRes.json();
      if (data?.token) {
        return data;
      }
    } else {
      const errText = await internalRes.text().catch(() => '');
      console.warn(`[getLiveKitToken] Internal token route returned ${internalRes.status}:`, errText);
    }
  } catch (intErr) {
    console.warn('[getLiveKitToken] Internal route notice, checking remote fallback:', intErr);
  }

  // 2. Fallback: Remote FastAPI backend server (only if a valid remote URL is available, never offline localhost:8000)
  const isProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const configuredBackend = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_FASTAPI_URL;
  const isLocalBackend = configuredBackend && (configuredBackend.includes('127.0.0.1') || configuredBackend.includes('localhost'));
  
  const remoteUrl = (!isLocalBackend && configuredBackend) 
    ? configuredBackend 
    : (isProd ? 'https://trinetra-ai-1-6f2n.onrender.com' : null);

  if (!remoteUrl) {
    throw new Error('Could not establish LiveKit voice session. Please ensure your session is active or reload the page.');
  }

  const apiUrl = remoteUrl.replace(/\/$/, '');
  let lastError: any = null;
  const maxAttempts = 2;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${apiUrl}/api/voice/livekit-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_name: roomName,
          participant_name: participantName || 'User',
          agent_id: agentId,
        }),
      });

      if (response.ok) {
        return await response.json();
      }

      const errText = await response.text();
      if ([502, 503, 504].includes(response.status) && attempt < maxAttempts - 1) {
        console.warn(`[getLiveKitToken] Remote backend starting up (${response.status}). Retrying... (attempt ${attempt + 1}/${maxAttempts})`);
      } else {
        lastError = new Error(`Failed to fetch LiveKit token (${response.status}): ${errText}`);
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[getLiveKitToken] Remote attempt ${attempt + 1} notice:`, err.message);
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }

  throw lastError || new Error('Failed to fetch LiveKit token. Please ensure your voice service is active.');
}

export const livekitConfig = {
  publishDefaults: {
    audioPreset: 'speech' as const,
    dtx: true,
  },
  videoCaptureDefaults: {
    resolution: { width: 640, height: 480 },
  },
}
