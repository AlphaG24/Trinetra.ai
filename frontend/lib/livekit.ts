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
  const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'

  const response = await fetch(`${apiUrl}/api/voice/livekit-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      room_name: roomName,
      participant_name: participantName || 'User',
      agent_id: agentId,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Failed to fetch LiveKit token (${response.status}): ${errText}`)
  }

  return await response.json()
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
