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
  const secondsConnectedRef = useRef<number>(0)
  const audioElementsRef = useRef<HTMLMediaElement[]>([])

  // Recording pipeline refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const activeCallMetaRef = useRef<{ roomName: string; agentId?: string } | null>(null)

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setSecondsConnected(0)
    secondsConnectedRef.current = 0
    timerRef.current = setInterval(() => {
      setSecondsConnected((prev) => {
        const next = prev + 1
        secondsConnectedRef.current = next
        return next
      })
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const clearTranscripts = useCallback(() => {
    setTranscripts([])
  }, [])

  const disconnect = useCallback(() => {
    // 1. Finalize and upload real call recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const rec = mediaRecorderRef.current
      const callMeta = activeCallMetaRef.current
      const dur = secondsConnectedRef.current
      rec.onstop = async () => {
        const chunks = recordedChunksRef.current
        if (chunks.length > 0) {
          const audioBlob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' })
          if (audioBlob.size > 2000) {
            try {
              const formData = new FormData()
              formData.append('file', audioBlob, `call_${callMeta?.roomName || 'web'}_${Date.now()}.webm`)
              formData.append('room_name', callMeta?.roomName || 'trinetra-web-call')
              if (callMeta?.agentId) {
                formData.append('agent_id', callMeta.agentId)
              }
              formData.append('duration_seconds', String(dur))

              const apiUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || 'https://trinetra-voice-agent.onrender.com').replace(/\/$/, '')
              await fetch(`${apiUrl}/api/voice/recordings/upload`, {
                method: 'POST',
                body: formData,
              })
              console.log('[useVoiceAgent] Real call recording successfully uploaded to backend')
            } catch (upErr) {
              console.warn('[useVoiceAgent] Upload recording notice:', upErr)
            }
          }
        }
      }
      try {
        rec.stop()
      } catch {}
      mediaRecorderRef.current = null
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close()
      } catch {}
      audioContextRef.current = null
      mediaStreamDestRef.current = null
    }

    // Detach and clean up all audio elements to prevent audio leaks/conflicts
    audioElementsRef.current.forEach(el => {
      try {
        el.pause()
        el.srcObject = null
        el.remove()
      } catch {}
    })
    audioElementsRef.current = []

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
    setTimeout(() => {
      setConnectionState('idle')
      setTranscripts([])
    }, 1500)
  }, [stopTimer])

  const startCall = useCallback(async (
    roomName: string = 'trinetra-demo-room',
    participantName?: string,
    agentId?: string
  ) => {
    if (connectionState !== 'idle' && connectionState !== 'ended') return

    setConnectionState('connecting')
    setTranscripts([]) // Clear transcripts on new call start
    activeCallMetaRef.current = { roomName, agentId }
    recordedChunksRef.current = []

    // Initialize Web Audio mixer for call recording
    try {
      if (typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) {
          const ctx = new AudioCtx()
          const dest = ctx.createMediaStreamDestination()
          audioContextRef.current = ctx
          mediaStreamDestRef.current = dest

          const mimeType = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : ''
          if (typeof MediaRecorder !== 'undefined') {
            const recorder = mimeType ? new MediaRecorder(dest.stream, { mimeType }) : new MediaRecorder(dest.stream)
            recorder.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) {
                recordedChunksRef.current.push(e.data)
              }
            }
            recorder.start(1000)
            mediaRecorderRef.current = recorder
          }
        }
      }
    } catch (ctxErr) {
      console.warn('[useVoiceAgent] Audio mixer setup warning:', ctxErr)
    }

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

      // 3. Attach Event Listeners
      room.on(RoomEvent.Connected, async () => {
        setConnectionState('active')
        startTimer()
        toast.success('Connected to LiveKit voice agent session')

        // Ensure browser audio playback is unlocked
        try {
          await room.startAudio()
        } catch (audioErr) {
          console.warn('[LiveKit] startAudio on connected warning:', audioErr)
        }

        // Publish local microphone track
        try {
          const micTrack = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true })
          await room.localParticipant.publishTrack(micTrack)

          // Connect local mic to mixer recorder
          if (audioContextRef.current && mediaStreamDestRef.current && micTrack.mediaStreamTrack) {
            try {
              const micStream = new MediaStream([micTrack.mediaStreamTrack])
              const micSource = audioContextRef.current.createMediaStreamSource(micStream)
              micSource.connect(mediaStreamDestRef.current)
            } catch (micMixErr) {
              console.warn('[useVoiceAgent] Mic mixer connect error:', micMixErr)
            }
          }
        } catch (micErr) {
          console.error('[LiveKit] Failed to publish mic track:', micErr)
          toast.error('Could not access microphone')
        }
      })

      room.on(RoomEvent.Disconnected, () => {
        disconnect()
      })

      room.on(RoomEvent.AudioPlaybackStatusChanged, async () => {
        if (!room.canPlaybackAudio) {
          try {
            await room.startAudio()
          } catch (e) {
            console.warn('[LiveKit] Auto-resume audio failed:', e)
          }
        }
      })

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          const element = track.attach()
          element.autoplay = true
          element.muted = false
          element.volume = 1.0
          audioElementsRef.current.push(element)
          document.body.appendChild(element)
          element.play().catch(err => {
            console.warn('[LiveKit] Audio element play error (autoplay blocked?):', err)
          })

          // Connect agent audio track to mixer recorder
          if (audioContextRef.current && mediaStreamDestRef.current && track.mediaStreamTrack) {
            try {
              const agentStream = new MediaStream([track.mediaStreamTrack])
              const agentSource = audioContextRef.current.createMediaStreamSource(agentStream)
              agentSource.connect(mediaStreamDestRef.current)
            } catch (agentMixErr) {
              console.warn('[useVoiceAgent] Agent track mixer connect error:', agentMixErr)
            }
          }
        }
      })

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          const detached = track.detach()
          detached.forEach(el => {
            try {
              el.pause()
              el.srcObject = null
              el.remove()
            } catch {}
          })
          audioElementsRef.current = audioElementsRef.current.filter(el => !detached.includes(el))
        }
      })

      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        try {
          const decoder = new TextDecoder()
          const str = decoder.decode(payload)
          const data = JSON.parse(str)

          // 1. Handle intent-based automatic call cut
          if (data.type === 'call_ended') {
            console.log('[useVoiceAgent] Received call_ended signal from server')
            disconnect()
            return
          }

          // 2. Handle transcript message with client-side SSML/tag sanitization
          if (data.type === 'transcript') {
            const rawText = data.text || ''
            const cleaned = rawText
              .replace(/\(\([^)]*\)\)/g, '')
              .replace(/\((?:warm|slow|pause|laugh|chuckle|breath|sigh|whisper|emph)\)/gi, '')
              .replace(/\[\[[^\]]*\]\]/g, '')
              .replace(/\*\*(.+?)\*\*/g, '$1')
              .replace(/\*(.+?)\*/g, '$1')
              .replace(/<[^>]+>/g, '')
              .trim()

            if (cleaned) {
              const speakerRole = data.speaker === 'customer' || data.speaker === 'user' ? 'Customer' : 'Agent'
              setTranscripts((prev) => {
                // Deduplicate: skip if last 5 entries already have same speaker+text
                const isDuplicate = prev.slice(-5).some(
                  (t) => t.speaker === speakerRole && t.text === cleaned
                )
                if (isDuplicate) return prev

                return [
                  ...prev,
                  {
                    id: String(Date.now()) + Math.random().toString().slice(2, 6),
                    speaker: speakerRole,
                    text: cleaned,
                    timestamp: new Date(),
                  },
                ]
              })
            }
          }
        } catch (e) {
          console.warn('[LiveKit] Non-JSON data received')
        }
      })

      // 4. Connect to Room
      await room.connect(wsUrl, tokenData.token)

      // Unlock AudioContext immediately after connection
      try {
        await room.startAudio()
      } catch (audioUnlockErr) {
        console.warn('[LiveKit] startAudio post-connect warning:', audioUnlockErr)
      }
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
    clearTranscripts,
  }
}
