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

  let lastError: any = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`${apiUrl}/api/voice/livekit-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_name: roomName,
          participant_name: participantName || 'User',
          agent_id: agentId,
        }),
      })

      if (response.ok) {
        return await response.json()
      }

      const errText = await response.text()
      lastError = new Error(`Failed to fetch LiveKit token (${response.status}): ${errText}`)
    } catch (err: any) {
      lastError = err
    }

    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
    }
  }

  throw lastError || new Error('Failed to fetch LiveKit token after retries')
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
