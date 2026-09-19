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
  const isProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
  const fallbackUrl = isProd ? 'https://trinetra-ai-1-6f2n.onrender.com' : 'http://127.0.0.1:8000'
  const apiUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || fallbackUrl).replace(/\/$/, '')

  let lastError: any = null
  const maxAttempts = 5

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
      })

      if (response.ok) {
        return await response.json()
      }

      const errText = await response.text()
      // If server is restarting (502, 503, 504), wait and retry
      if ([502, 503, 504].includes(response.status) && attempt < maxAttempts - 1) {
        console.warn(`[getLiveKitToken] Backend starting up (${response.status}). Retrying... (attempt ${attempt + 1}/${maxAttempts})`)
      } else {
        lastError = new Error(`Failed to fetch LiveKit token (${response.status}): ${errText}`)
      }
    } catch (err: any) {
      lastError = err
      console.warn(`[getLiveKitToken] Connection attempt ${attempt + 1} notice:`, err.message)
    }

    if (attempt < maxAttempts - 1) {
      // 1s, 2s, 3s, 4s delay
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }

  throw lastError || new Error('Failed to fetch LiveKit token after retries. The voice server might still be deploying, please try again in a few moments.')
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
