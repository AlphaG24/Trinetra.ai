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
      // 1. Get LiveKit Room Token
      const tokenData = await getLiveKitToken(roomName, participantName, agentId)
      const wsUrl = tokenData.url || LIVEKIT_URL

      // 2. Instantiate LiveKit Room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      })
      roomRef.current = room

      // Helper to process and add transcripts safely
      const handleTranscription = (segments: any, participant?: any) => {
        let text = ''
        if (Array.isArray(segments)) {
          text = segments.map(s => s.text).join(' ')
        } else if (segments && typeof segments === 'object') {
          text = segments.text || segments.transcript || ''
        } else if (typeof segments === 'string') {
          text = segments
        }

        const speaker = participant?.isLocal ? 'Customer' : 'Agent'
        if (text.trim()) {
          setTranscripts((prev) => {
            const isDuplicate = prev.slice(-3).some(
              (t) => t.speaker === speaker && t.text === text
            )
            if (isDuplicate) return prev

            const segmentId = Array.isArray(segments) && segments[0]
              ? String(segments[0].id)
              : String(Date.now() + Math.random())

            const existingIndex = prev.findIndex(t => t.id === segmentId)
            if (existingIndex >= 0) {
              const updated = [...prev]
              updated[existingIndex] = {
                ...updated[existingIndex],
                text,
                timestamp: new Date()
              }
              return updated
            }

            return [
              ...prev,
              {
                id: segmentId,
                speaker,
                text,
                timestamp: new Date(),
              },
            ]
          })
        }
      }

      // 3. Attach Event Listeners
      room.on(RoomEvent.Connected, async () => {
        setConnectionState('active')
        startTimer()
        toast.success('Connected to LiveKit voice agent session')

        // Publish local microphone track
        try {
          const micTrack = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true })
          await room.localParticipant.publishTrack(micTrack)
        } catch (micErr) {
          console.error('[LiveKit] Failed to publish mic track:', micErr)
          toast.error('Could not access microphone')
        }
      })

      room.on(RoomEvent.Disconnected, () => {
        disconnect()
      })

      // Subscribe to transcription events
      room.on('transcriptionReceived' as any, handleTranscription)
      room.on('transcription_received' as any, handleTranscription)

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          const element = track.attach()
          document.body.appendChild(element)
        }

        track.on('transcriptionReceived' as any, (transcription: any) => {
          handleTranscription(transcription, participant)
        })
        track.on('transcription_received' as any, (transcription: any) => {
          handleTranscription(transcription, participant)
        })
      })

      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        try {
          const decoder = new TextDecoder()
          const str = decoder.decode(payload)
          const data = JSON.parse(str)
          if (data.type === 'transcript') {
            setTranscripts((prev) => [
              ...prev,
              {
                id: String(Date.now()),
                speaker: data.speaker || 'agent',
                text: data.text || '',
                timestamp: new Date(),
              },
            ])
          }
        } catch (e) {
          console.warn('[LiveKit] Non-JSON data received')
        }
      })

      // 4. Connect to Room
      await room.connect(wsUrl, tokenData.token)
    } catch (err: any) {
      console.error('[useVoiceAgent Error]', err)
      toast.error('Failed to establish LiveKit voice connection: ' + err.message)
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
