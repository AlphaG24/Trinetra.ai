'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
  const [sessionUrl, setSessionUrl] = useState<string | null>(null)
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
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

  const saveCallData = useCallback(async (agentId: string, finalTranscripts: TranscriptMessage[], durationSecs: number) => {
    try {
      await fetch('/api/voice/save-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          transcript: finalTranscripts,
          duration_seconds: durationSecs,
          duration: durationSecs
        })
      })
      console.log('[Sarvam Test Call] Call data saved successfully')
    } catch (err) {
      console.warn('[Sarvam Test Call] Failed to save call data:', err)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close()
      } catch (err) {
        console.warn('[useVoiceAgent] WebSocket close error:', err)
      }
      wsRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch (e) {
        // ignore
      }
      mediaRecorderRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    stopTimer()
    setConnectionState('ended')
    setTimeout(() => setConnectionState('idle'), 3000)
  }, [stopTimer])

  const endCall = useCallback(() => {
    if (currentAgentId) {
      saveCallData(currentAgentId, transcripts, secondsConnected)
    }
    disconnect()
  }, [currentAgentId, transcripts, secondsConnected, saveCallData, disconnect])

  const startCall = useCallback(async (
    roomName: string = 'trinetra-demo-room',
    participantName?: string,
    agentId?: string
  ) => {
    const targetAgentId = agentId || (typeof roomName === 'string' && roomName.includes('-') ? roomName : 'demo-agent')
    if (connectionState !== 'idle' && connectionState !== 'ended') return

    setConnectionState('connecting')
    setTranscripts([]) // Clear transcripts on new call start
    setCurrentAgentId(targetAgentId)

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
      const res = await fetch(`${backendUrl}/api/voice/sarvam-test-call?agent_id=${encodeURIComponent(targetAgentId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: targetAgentId })
      })

      const data = await res.json()
      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || 'Failed to start Sarvam test session')
      }

      const sUrl = data.session_url || `https://indus.sarvam.ai/samvaad/embed/${targetAgentId}`
      setSessionUrl(sUrl)

      // If session URL is WebSocket URL (ws:// or wss://)
      if (sUrl.startsWith('ws://') || sUrl.startsWith('wss://')) {
        const ws = new WebSocket(sUrl)
        wsRef.current = ws

        ws.onopen = async () => {
          setConnectionState('active')
          startTimer()
          toast.success('Connected to Sarvam Voice Agent WebSocket session')

          // Start Microphone Audio Stream
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaStreamRef.current = stream
            
            if (typeof MediaRecorder !== 'undefined') {
              const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
              mediaRecorderRef.current = recorder

              recorder.ondataavailable = (event) => {
                if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                  ws.send(event.data)
                }
              }

              recorder.start(250) // Slice audio every 250ms
            }
          } catch (micErr) {
            console.warn('[Sarvam Audio Stream] Microphone permission denied:', micErr)
            toast.error('Could not access microphone for live test call')
          }
        }

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === 'transcript' || msg.text) {
              const textStr = msg.text || msg.transcript || ''
              const speakerStr = msg.speaker || (msg.role === 'user' ? 'You' : 'Agent')
              if (textStr.trim()) {
                setTranscripts((prev) => [
                  ...prev,
                  {
                    id: String(Date.now() + Math.random()),
                    speaker: speakerStr,
                    text: textStr,
                    timestamp: new Date()
                  }
                ])
              }
            }
          } catch (e) {
            console.warn('[Sarvam WS] Non-JSON payload received')
          }
        }

        ws.onerror = (err) => {
          console.error('[Sarvam WS Error]', err)
          toast.error('Sarvam WebSocket connection error')
          setConnectionState('error')
        }

        ws.onclose = () => {
          setConnectionState('ended')
          stopTimer()
          if (targetAgentId) {
            saveCallData(targetAgentId, transcripts, secondsConnected)
          }
        }
      } else {
        // HTTP embed session URL fallback
        setConnectionState('active')
        startTimer()
        toast.success('Connected to Sarvam Voice Agent test session!')

        // Initial interactive greeting
        setTranscripts([
          {
            id: 'welcome-1',
            speaker: 'Sarvam AI',
            text: 'Namaste! Main aapka Voice Agent bol raha hoon. Aaj main aapki kya sahayata kar sakta hoon?',
            timestamp: new Date()
          }
        ])
      }
    } catch (err: any) {
      console.error('[Sarvam Test Call Error]', err)
      toast.error('Failed to establish Sarvam voice connection: ' + err.message)
      setConnectionState('error')
      setTimeout(() => setConnectionState('idle'), 4000)
    }
  }, [connectionState, startTimer, stopTimer, saveCallData, secondsConnected, transcripts])

  const toggleMute = useCallback(() => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks()
      const newMuteState = !isMuted
      audioTracks.forEach((track) => {
        track.enabled = !newMuteState
      })
      setIsMuted(newMuteState)
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
    sessionUrl,
    startCall,
    endCall,
    toggleMute,
  }
}
