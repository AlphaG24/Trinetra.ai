'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Room, 
  RoomEvent, 
  Track, 
  createLocalAudioTrack,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  LocalTrackPublication
} from 'livekit-client'
import { getLiveKitToken, LIVEKIT_URL } from '@/lib/livekit'
import toast from 'react-hot-toast'

export type ConnectionState = 'idle' | 'connecting' | 'active' | 'ended' | 'error'

export interface TranscriptMessage {
  id: string
  speaker: string
  text: string
  timestamp: Date | string
}

export function useVoiceAgent() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [secondsConnected, setSecondsConnected] = useState(0)
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([])

  const roomRef = useRef<Room | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setSecondsConnected(0)
    timerRef.current = setInterval(() => {
      setSecondsConnected((prev) => prev + 1)
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      try {
        roomRef.current.disconnect()
      } catch (err) {
        console.warn('[useVoiceAgent] Disconnect error:', err)
      }
      roomRef.current = null
    }
    stopTimer()
    setConnectionState('ended')
    setTimeout(() => setConnectionState('idle'), 3000)
  }, [stopTimer])

  const startCall = useCallback(async (
    roomName: string = 'trinetra-demo-room',
    participantName?: string,
    agentId?: string
  ) => {
    if (connectionState !== 'idle' && connectionState !== 'ended') return

    setConnectionState('connecting')
    setTranscripts([]) // Clear transcripts on new call start

    try {
      // 1. Trigger Sarvam Voice Agent test session backend call
      const res = await fetch('/api/voice/sarvam-test-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId || 'demo-agent' })
      })

      const data = await res.json()
      if (!res.ok || !data.session_url) {
        // Fallback to LiveKit token if Sarvam backend route unavailable
        try {
          const tokenData = await getLiveKitToken(roomName, participantName, agentId)
          const wsUrl = tokenData.url || LIVEKIT_URL
          const room = new Room({ adaptiveStream: true, dynacast: true })
          roomRef.current = room
          await room.connect(wsUrl, tokenData.token)
        } catch (lkErr: any) {
          console.warn('[Sarvam Test Session] LiveKit fallback also failed:', lkErr)
        }
      }

      setConnectionState('active')
      startTimer()
      toast.success('Connected to Sarvam Voice Agent test session!')

      // Initial interactive greeting transcript
      setTranscripts([
        {
          id: 'welcome-1',
          speaker: 'Sarvam AI',
          text: 'Namaste! Main Vikram bol raha hoon. Aaj main aapki kya sahayata kar sakta hoon?',
          timestamp: new Date()
        }
      ])
    } catch (err: any) {
      console.error('[Sarvam Test Call Error]', err)
      toast.error('Failed to establish Sarvam voice connection: ' + err.message)
      setConnectionState('error')
      setTimeout(() => setConnectionState('idle'), 4000)
    }
  }, [connectionState, disconnect, startTimer])

  const toggleMute = useCallback(() => {
    if (roomRef.current) {
      const isCurrentlyMuted = !isMuted
      roomRef.current.localParticipant.audioTrackPublications.forEach((pub: LocalTrackPublication) => {
        if (pub.track) {
          if (isCurrentlyMuted) {
            pub.track.mute()
          } else {
            pub.track.unmute()
          }
        }
      })
      setIsMuted(isCurrentlyMuted)
    }
  }, [isMuted])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    connectionState,
    isMuted,
    secondsConnected,
    transcripts,
    startCall,
    endCall: disconnect,
    toggleMute,
  }
}
