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
  
  // Dedicated, managed single audio element for playback to eliminate phaser/comb-filtering distortion
  const dedicatedAudioElRef = useRef<HTMLAudioElement | null>(null)

  // Recording pipeline refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const activeCallMetaRef = useRef<{ roomName: string; agentId?: string } | null>(null)
  // Guard against double-disconnect
  const disconnectingRef = useRef(false)

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

  // Comprehensive resource cleanup that resets WebRTC and Web Audio without leaving dangling nodes
  const cleanupCallResources = useCallback(() => {
    stopTimer()

    // Stop and clear dedicated playback audio element
    if (dedicatedAudioElRef.current) {
      try {
        dedicatedAudioElRef.current.pause()
        dedicatedAudioElRef.current.srcObject = null
      } catch {}
    }

    // Disconnect room
    if (roomRef.current) {
      try {
        roomRef.current.disconnect()
      } catch (err) {
        console.warn('[useVoiceAgent] Disconnect warning:', err)
      }
      roomRef.current = null
    }
  }, [stopTimer])

  /**
   * Upload the recorded audio blob to the server.
   * Returns true if upload succeeded, false otherwise.
   */
  const uploadRecording = useCallback(async (
    chunks: Blob[],
    mimeType: string,
    callMeta: { roomName: string; agentId?: string } | null,
    duration: number
  ): Promise<boolean> => {
    if (chunks.length === 0) return false
    const audioBlob = new Blob(chunks, { type: mimeType || 'audio/webm' })
    if (audioBlob.size < 200) return false

    const formData = new FormData()
    formData.append('file', audioBlob, `call_${callMeta?.roomName || 'web'}_${Date.now()}.webm`)
    formData.append('room_name', callMeta?.roomName || 'trinetra-web-call')
    if (callMeta?.agentId) {
      formData.append('agent_id', callMeta.agentId)
    }
    formData.append('duration_seconds', String(duration))

    // 1. Primary: Upload via internal Next.js API route
    try {
      const internalRes = await fetch('/api/voice/recordings/upload', {
        method: 'POST',
        body: formData,
      })
      if (internalRes.ok) {
        console.log('[useVoiceAgent] Call recording uploaded via Next.js route')
        return true
      }
    } catch (intErr) {
      console.warn('[useVoiceAgent] Internal recording upload notice:', intErr)
    }

    // 2. Fallback: Upload to backend FastAPI server directly
    try {
      const isProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
      const fallbackUrl = isProd ? 'https://trinetra-ai-1-6f2n.onrender.com' : 'http://127.0.0.1:8000'
      const apiUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || fallbackUrl).replace(/\/$/, '')
      const fallbackRes = await fetch(`${apiUrl}/api/voice/recordings/upload`, {
        method: 'POST',
        body: formData,
      })
      if (fallbackRes.ok) {
        console.log('[useVoiceAgent] Call recording uploaded to backend fallback')
        return true
      }
    } catch (upErr) {
      console.warn('[useVoiceAgent] Upload recording notice:', upErr)
    }

    return false
  }, [])

  const disconnect = useCallback(async () => {
    // Guard against double-disconnect race conditions
    if (disconnectingRef.current) return
    disconnectingRef.current = true

    const rec = mediaRecorderRef.current
    const callMeta = activeCallMetaRef.current
    const dur = secondsConnectedRef.current
    const activeCtx = audioContextRef.current

    stopTimer()
    // 1. Immediately transition UI state to 'ended' for instant user feedback
    setConnectionState('ended')

    // 2. Immediately disconnect room and audio element so mic and speaker stop immediately
    cleanupCallResources()

    // 3. Finalize recording: wait for all data to be flushed, then upload
    if (rec && rec.state !== 'inactive') {
      const recordingDone = new Promise<void>((resolve) => {
        rec.onstop = async () => {
          const chunks = [...recordedChunksRef.current]
          const mimeType = rec.mimeType || 'audio/webm'
          
          try {
            const uploaded = await uploadRecording(chunks, mimeType, callMeta, dur)
            if (uploaded) {
              window.dispatchEvent(new CustomEvent('trinetra:call_completed', {
                detail: { roomName: callMeta?.roomName, agentId: callMeta?.agentId, duration: dur }
              }))
              toast.success('Call recording saved successfully')
            }
          } catch (err) {
            console.warn('[useVoiceAgent] Recording upload error:', err)
          }

          if (activeCtx) {
            try { activeCtx.close() } catch {}
          }
          resolve()
        }
      })

      try {
        if (rec.state === 'recording') {
          rec.requestData()
        }
        rec.stop()
      } catch {}
      mediaRecorderRef.current = null

      try {
        await Promise.race([
          recordingDone,
          new Promise<void>((resolve) => setTimeout(resolve, 8000))
        ])
      } catch {}
    } else if (activeCtx) {
      try { activeCtx.close() } catch {}
    }

    audioContextRef.current = null
    mediaStreamDestRef.current = null

    // Reset disconnectingRef so new calls can be started without refresh
    disconnectingRef.current = false
    // Transcripts are preserved for review and cleared only when startCall is initiated or modal is closed
  }, [cleanupCallResources, stopTimer, uploadRecording])

  const startCall = useCallback(async (
    roomName: string = 'trinetra-demo-room',
    participantName?: string,
    agentId?: string
  ) => {
    // Prevent overlapping calls
    if (connectionState !== 'idle' && connectionState !== 'ended') return

    // Clean up any residual resources from previous calls first
    cleanupCallResources()
    disconnectingRef.current = false

    setConnectionState('connecting')
    setTranscripts([])
    activeCallMetaRef.current = { roomName, agentId }
    recordedChunksRef.current = []

    // 1. Synchronously prepare dedicated audio element and unlock browser playback in user gesture
    if (!dedicatedAudioElRef.current && typeof document !== 'undefined') {
      const el = document.createElement('audio')
      el.autoplay = true
      el.muted = false
      el.volume = 1.0
      el.style.display = 'none'
      document.body.appendChild(el)
      dedicatedAudioElRef.current = el
    }
    // Pre-warm audio element with a silent buffer to ensure autoplay policy is satisfied
    if (dedicatedAudioElRef.current) {
      try {
        dedicatedAudioElRef.current.play().catch(() => {})
      } catch {}
    }

    // 2. Initialize Web Audio mixer for call recording
    // Use browser-default sample rate (typically 48kHz) — this avoids sample rate conversion
    // artifacts and lets the AudioContext handle resampling natively
    let ctx: AudioContext | null = null
    try {
      if (typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) {
          ctx = new AudioCtx({ latencyHint: 'interactive' })
          if (ctx.state === 'suspended') {
            await ctx.resume()
          }
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
      console.warn('[useVoiceAgent] Audio mixer setup notice:', ctxErr)
    }

    try {
      // 3. Fetch LiveKit room token (with graceful cold-start retries)
      const tokenData = await getLiveKitToken(roomName, participantName, agentId)
      const wsUrl = tokenData.url || LIVEKIT_URL

      // 4. Instantiate LiveKit Room with optimized audio settings
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      roomRef.current = room

      // 5. Attach Room Event Listeners
      room.on(RoomEvent.Connected, async () => {
        // Unlock browser audio playback
        try {
          if (typeof (room as any).startAudio === 'function') {
            await (room as any).startAudio()
          }
        } catch {}

        // Check if agent is already connected in the room
        const remoteCount = room.remoteParticipants ? room.remoteParticipants.size : 0;
        if (remoteCount > 0) {
          setConnectionState('active')
          startTimer()
        }

        // Publish local microphone track immediately for lowest latency
        try {
          const micTrack = await createLocalAudioTrack({ 
            echoCancellation: true, 
            noiseSuppression: true,
            autoGainControl: true
          })
          await room.localParticipant.publishTrack(micTrack)

          // Connect mic to recording mixer destination
          if (audioContextRef.current && mediaStreamDestRef.current && micTrack.mediaStreamTrack) {
            try {
              const micStream = new MediaStream([micTrack.mediaStreamTrack])
              const micSource = audioContextRef.current.createMediaStreamSource(micStream)
              micSource.connect(mediaStreamDestRef.current)
            } catch (micMixErr) {
              console.warn('[useVoiceAgent] Mic mixer connect notice:', micMixErr)
            }
          }
        } catch (micErr) {
          console.error('[LiveKit] Failed to publish microphone:', micErr)
          toast.error('Could not access microphone')
        }
      })

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('[useVoiceAgent] Remote agent participant joined:', participant.identity)
        setConnectionState('active')
        if (!timerRef.current) startTimer()
      })

      room.on(RoomEvent.Disconnected, () => {
        disconnect()
      })

      room.on(RoomEvent.AudioPlaybackStatusChanged, async () => {
        if (!room.canPlaybackAudio) {
          try {
            if (typeof (room as any).startAudio === 'function') {
              await (room as any).startAudio()
            }
          } catch {}
        }
      })

      // Handle incoming agent voice track with dedicated clean playback
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          setConnectionState('active')
          if (!timerRef.current) startTimer()

          const audioEl = dedicatedAudioElRef.current || document.createElement('audio')
          if (!dedicatedAudioElRef.current) {
            audioEl.style.display = 'none'
            document.body.appendChild(audioEl)
            dedicatedAudioElRef.current = audioEl
          }

          // Attach track to single dedicated audio element (guarantees zero echo/phaser artifact)
          track.attach(audioEl)
          audioEl.muted = false
          audioEl.volume = 1.0
          audioEl.play().catch(err => {
            console.warn('[LiveKit] Play error, attempting unlock:', err)
            // Fallback retry on click/touch if policy temporarily blocked
            const unlockHandler = () => {
              audioEl.play().catch(() => {})
              window.removeEventListener('click', unlockHandler)
              window.removeEventListener('touchstart', unlockHandler)
            }
            window.addEventListener('click', unlockHandler, { once: true })
            window.addEventListener('touchstart', unlockHandler, { once: true })
          })

          // Connect agent audio stream to the recording mixer
          if (audioContextRef.current && mediaStreamDestRef.current && track.mediaStreamTrack) {
            try {
              const agentStream = new MediaStream([track.mediaStreamTrack])
              const agentSource = audioContextRef.current.createMediaStreamSource(agentStream)
              agentSource.connect(mediaStreamDestRef.current)
            } catch (agentMixErr) {
              console.warn('[useVoiceAgent] Agent mixer connect notice:', agentMixErr)
            }
          }
        }
      })

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio && dedicatedAudioElRef.current) {
          try {
            track.detach(dedicatedAudioElRef.current)
          } catch {}
        }
      })

      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const decoder = new TextDecoder()
          const str = decoder.decode(payload)
          const data = JSON.parse(str)

          // Intent-based automatic call disconnect
          if (data.type === 'call_ended') {
            console.log('[useVoiceAgent] Received call_ended signal from server')
            disconnect()
            return
          }

          // Transcript message processing
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
        } catch {}
      })

      // 6. Connect to LiveKit Room
      await room.connect(wsUrl, tokenData.token)

      try {
        if (typeof (room as any).startAudio === 'function') {
          await (room as any).startAudio()
        }
      } catch {}

    } catch (err: any) {
      console.error('[useVoiceAgent Error]', err)
      toast.error('Voice connection issue: ' + (err.message || 'Server initializing'))
      
      // Immediately perform full resource cleanup so subsequent clicks work without website refresh
      cleanupCallResources()
      if (audioContextRef.current) {
        try { audioContextRef.current.close() } catch {}
        audioContextRef.current = null
      }
      mediaRecorderRef.current = null
      mediaStreamDestRef.current = null

      setConnectionState('error')
      disconnectingRef.current = false
      // Reset immediately to idle after brief pause
      setTimeout(() => setConnectionState('idle'), 1200)
    }
  }, [connectionState, cleanupCallResources, disconnect, startTimer])

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
      cleanupCallResources()
      if (dedicatedAudioElRef.current) {
        try {
          dedicatedAudioElRef.current.remove()
          dedicatedAudioElRef.current = null
        } catch {}
      }
    }
  }, [cleanupCallResources])

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

