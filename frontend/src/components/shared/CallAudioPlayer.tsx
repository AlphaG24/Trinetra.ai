'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Download, Disc3 } from 'lucide-react'

export interface CallAudioPlayerProps {
  recordingUrl?: string | null
  transcript?: any
  durationSeconds?: number | null
  autoPlay?: boolean
  compact?: boolean
  className?: string
  callerName?: string
}

interface DialogTurn {
  id: number
  speaker: 'AI' | 'USER'
  text: string
}

export function CallAudioPlayer({
  recordingUrl,
  transcript,
  durationSeconds = 0,
  autoPlay = false,
  compact = false,
  className = '',
  callerName = 'Customer'
}: CallAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(durationSeconds || 0)
  const [activeTurnIndex, setActiveTurnIndex] = useState<number>(-1)
  const [directAudioError, setDirectAudioError] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const speechIndexRef = useRef<number>(0)
  const isPlayingRef = useRef<boolean>(false)
  isPlayingRef.current = isPlaying

  // Normalize recording URL (Twilio requires .mp3 to stream publicly)
  const normalizedRecordingUrl = useMemo(() => {
    if (!recordingUrl) return null
    const trimmed = recordingUrl.trim()
    if (!trimmed) return null
    // Detect known dead sandbox / placeholder S3 links
    if (trimmed.includes('trinetra-voice-recordings.s3.amazonaws.com') || trimmed.includes('sandbox_recording.mp3')) {
      return null
    }
    // Normalize Twilio recording URL
    if (trimmed.includes('api.twilio.com') && !trimmed.endsWith('.mp3') && !trimmed.endsWith('.wav')) {
      return `${trimmed}.mp3`
    }
    return trimmed
  }, [recordingUrl])

  const hasDirectAudio = Boolean(normalizedRecordingUrl && !directAudioError)

  // Parse transcript into turns
  const turns: DialogTurn[] = useMemo(() => {
    if (!transcript) {
      const fallbackText = durationSeconds && durationSeconds > 0
        ? `Call connected with ${callerName}. Call duration: ${durationSeconds} seconds. Call completed successfully.`
        : `Call connected with ${callerName}. Call completed.`
      return [{ id: 0, speaker: 'AI', text: fallbackText }]
    }

    // Array format
    if (Array.isArray(transcript)) {
      const parsed = transcript.map((item, idx): DialogTurn => {
        if (typeof item === 'string') {
          const match = item.match(/^(USER|AI|CALLER|ASSISTANT|SYSTEM|AGENT|CUSTOMER):\s*(.*)$/i)
          if (match) {
            const rawSpeaker = match[1].toUpperCase()
            const speaker: 'AI' | 'USER' = (rawSpeaker === 'USER' || rawSpeaker === 'CALLER' || rawSpeaker === 'CUSTOMER') ? 'USER' : 'AI'
            return { id: idx, speaker, text: match[2].trim() }
          }
          return { id: idx, speaker: 'AI', text: item }
        }
        if (typeof item === 'object' && item !== null) {
          const rawSpeaker = String(item.speaker || item.role || item.sender || '').toUpperCase()
          const speaker: 'AI' | 'USER' = (rawSpeaker === 'USER' || rawSpeaker === 'CALLER' || rawSpeaker === 'CUSTOMER') ? 'USER' : 'AI'
          const text = String(item.text || item.content || item.message || item.transcript || item.utterance || '')
          return { id: idx, speaker, text }
        }
        return { id: idx, speaker: 'AI', text: String(item) }
      }).filter(t => t.text.trim().length > 0)

      if (parsed.length > 0) return parsed
    }

    // Object format
    if (typeof transcript === 'object' && transcript !== null) {
      if (Array.isArray(transcript.messages)) return parseTurnsFromString(JSON.stringify(transcript.messages))
      if (Array.isArray(transcript.turns)) return parseTurnsFromString(JSON.stringify(transcript.turns))
      if (transcript.transcript) return parseTurnsFromString(String(transcript.transcript))
      if (transcript.text) return parseTurnsFromString(String(transcript.text))
    }

    return parseTurnsFromString(String(transcript))
  }, [transcript, durationSeconds, callerName])

  function parseTurnsFromString(rawString: string): DialogTurn[] {
    const trimmed = rawString.trim()
    if (!trimmed) {
      return [{ id: 0, speaker: 'AI', text: `Call interaction registered. Duration ${durationSeconds || 0} seconds.` }]
    }

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.map((item, idx): DialogTurn => {
            if (typeof item === 'string') return { id: idx, speaker: 'AI', text: item }
            const rawSpeaker = String(item.speaker || item.role || item.sender || '').toUpperCase()
            const speaker: 'AI' | 'USER' = (rawSpeaker === 'USER' || rawSpeaker === 'CALLER' || rawSpeaker === 'CUSTOMER') ? 'USER' : 'AI'
            return { id: idx, speaker, text: String(item.text || item.content || item.message || '') }
          }).filter(t => t.text.trim().length > 0)
        }
      } catch {
        // Fallback to line by line
      }
    }

    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean)
    const result: DialogTurn[] = []
    let current: DialogTurn | null = null

    lines.forEach((line, idx) => {
      const match = line.match(/^(USER|AI|CALLER|ASSISTANT|SYSTEM|AGENT|CUSTOMER):\s*(.*)$/i)
      if (match) {
        const rawSpeaker = match[1].toUpperCase()
        const speaker: 'AI' | 'USER' = (rawSpeaker === 'USER' || rawSpeaker === 'CALLER' || rawSpeaker === 'CUSTOMER') ? 'USER' : 'AI'
        current = { id: idx, speaker, text: match[2].trim() }
        result.push(current)
      } else if (current) {
        current.text += ' ' + line
      } else {
        current = { id: idx, speaker: 'AI', text: line }
        result.push(current)
      }
    })

    return result.length > 0 ? result : [{ id: 0, speaker: 'AI', text: trimmed }]
  }

  // Estimated total duration from speech turns if durationSeconds is 0
  useEffect(() => {
    if (durationSeconds && durationSeconds > 0) {
      setTotalDuration(durationSeconds)
    } else {
      // Estimate ~1 second per 3 words
      const totalWords = turns.reduce((acc, t) => acc + t.text.split(/\s+/).length, 0)
      const estimatedSecs = Math.max(Math.round(totalWords / 2.8), turns.length * 3)
      setTotalDuration(estimatedSecs || 10)
    }
  }, [durationSeconds, turns])

  // Setup browser SpeechSynthesis reference
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis
    }
    return () => {
      stopAllAudio()
    }
  }, [])

  const stopAllAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (synthRef.current) {
      synthRef.current.cancel()
    }
    setIsPlaying(false)
    setIsPaused(false)
    setActiveTurnIndex(-1)
    setCurrentTime(0)
  }, [])

  // Conversational Speech Playback Engine
  const speakTurn = useCallback((turnIndex: number) => {
    if (!synthRef.current) return
    if (turnIndex >= turns.length) {
      setIsPlaying(false)
      setIsPaused(false)
      setActiveTurnIndex(-1)
      setCurrentTime(totalDuration)
      return
    }

    speechIndexRef.current = turnIndex
    setActiveTurnIndex(turnIndex)

    const turn = turns[turnIndex]
    const utterance = new SpeechSynthesisUtterance(turn.text)
    
    // Choose voice profile
    const voices = synthRef.current.getVoices() || []
    if (turn.speaker === 'AI') {
      utterance.pitch = 1.05
      utterance.rate = 1.0
      const femaleVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('Zira')))
      if (femaleVoice) utterance.voice = femaleVoice
    } else {
      utterance.pitch = 0.9
      utterance.rate = 1.05
      const maleVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Male') || v.name.includes('Guy') || v.name.includes('David') || v.name.includes('Natural')))
      if (maleVoice) utterance.voice = maleVoice
    }

    utterance.onend = () => {
      if (isPlayingRef.current) {
        const nextIdx = turnIndex + 1
        // Progress elapsed time based on completed turns
        const progressFraction = nextIdx / turns.length
        setCurrentTime(Math.min(Math.round(progressFraction * totalDuration), totalDuration))
        speakTurn(nextIdx)
      }
    }

    utterance.onerror = (e) => {
      if (e.error !== 'canceled') {
        const nextIdx = turnIndex + 1
        if (nextIdx < turns.length && isPlayingRef.current) {
          speakTurn(nextIdx)
        } else {
          setIsPlaying(false)
        }
      }
    }

    synthRef.current.speak(utterance)
  }, [turns, totalDuration])

  // Play / Pause toggle
  const handleTogglePlay = () => {
    if (isPlaying) {
      if (hasDirectAudio && audioRef.current) {
        audioRef.current.pause()
        setIsPlaying(false)
        setIsPaused(true)
      } else if (synthRef.current) {
        synthRef.current.pause()
        setIsPlaying(false)
        setIsPaused(true)
      }
    } else {
      if (isPaused) {
        if (hasDirectAudio && audioRef.current) {
          audioRef.current.play().catch(() => setDirectAudioError(true))
          setIsPlaying(true)
          setIsPaused(false)
        } else if (synthRef.current) {
          synthRef.current.resume()
          setIsPlaying(true)
          setIsPaused(false)
        }
      } else {
        // Start fresh
        setIsPlaying(true)
        setIsPaused(false)
        if (hasDirectAudio && audioRef.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(() => {
            setDirectAudioError(true)
            // fallback immediately to speech
            speakTurn(0)
          })
        } else {
          if (synthRef.current) synthRef.current.cancel()
          speakTurn(0)
        }
      }
    }
  }

  // Restart audio
  const handleRestart = () => {
    stopAllAudio()
    setTimeout(() => {
      setIsPlaying(true)
      if (hasDirectAudio && audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(() => setDirectAudioError(true))
      } else {
        speakTurn(0)
      }
    }, 50)
  }

  // Direct audio event handlers
  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(Math.round(audioRef.current.currentTime))
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setTotalDuration(Math.round(audioRef.current.duration))
      }
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentTime(totalDuration)
  }

  const handleAudioError = () => {
    // If direct audio fails (404, CORS, unauthenticated Twilio link), seamlessly switch to speech synthesis
    setDirectAudioError(true)
    if (isPlayingRef.current) {
      speakTurn(0)
    }
  }

  // Handle Seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percent = Math.max(0, Math.min(1, clickX / rect.width))
    const targetTime = Math.round(percent * totalDuration)
    setCurrentTime(targetTime)

    if (hasDirectAudio && audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = percent * audioRef.current.duration
    } else if (turns.length > 0) {
      const turnIdx = Math.min(Math.floor(percent * turns.length), turns.length - 1)
      if (synthRef.current) synthRef.current.cancel()
      if (isPlaying) {
        speakTurn(turnIdx)
      } else {
        setActiveTurnIndex(turnIdx)
      }
    }
  }

  // Auto-play trigger if requested
  useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(() => {
        handleTogglePlay()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [autoPlay])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const progressPercent = totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 p-1.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs ${className}`}>
        {normalizedRecordingUrl && !directAudioError && (
          <audio
            ref={audioRef}
            src={normalizedRecordingUrl}
            onTimeUpdate={handleAudioTimeUpdate}
            onEnded={handleAudioEnded}
            onError={handleAudioError}
            preload="none"
          />
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleTogglePlay()
          }}
          className="w-7 h-7 rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
          title={isPlaying ? 'Pause Audio' : 'Play Audio'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>
        <span className="text-[11px] font-mono font-medium text-[var(--heading)]">
          {formatTime(currentTime)}
        </span>
        <div className="flex items-center gap-0.5 h-4 px-1">
          {[40, 80, 50, 100, 60, 30].map((h, i) => (
            <span
              key={i}
              className={`w-0.5 rounded-full transition-all ${isPlaying ? 'bg-violet-500 animate-pulse' : 'bg-[var(--muted)]/40'}`}
              style={{ height: isPlaying ? `${h}%` : '25%' }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]/90 backdrop-blur-md p-4 transition-all shadow-sm ${className}`}>
      {/* Hidden Audio Element for Direct Recording */}
      {normalizedRecordingUrl && !directAudioError && (
        <audio
          ref={audioRef}
          src={normalizedRecordingUrl}
          muted={isMuted}
          onTimeUpdate={handleAudioTimeUpdate}
          onEnded={handleAudioEnded}
          onError={handleAudioError}
          preload="metadata"
        />
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Controls and Waveform */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Main Play / Pause Button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-md shadow-violet-600/20 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
            title={isPlaying ? 'Pause Audio' : 'Play Call Audio'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          {/* Restart Button */}
          <button
            type="button"
            onClick={handleRestart}
            className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-transparent hover:border-[var(--border)] transition-all cursor-pointer shrink-0"
            title="Restart Audio"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Animated Waveform Equalizer */}
          <div className="flex items-center gap-0.5 h-6 px-2 bg-[var(--background)]/60 rounded-lg border border-[var(--border)]">
            {[40, 75, 30, 90, 60, 100, 45, 80, 55, 95, 35, 70, 85, 50, 65, 40].map((height, i) => (
              <span
                key={i}
                className={`w-1 rounded-full transition-all duration-200 ${
                  isPlaying ? 'bg-violet-500 animate-pulse' : 'bg-[var(--muted)]/40'
                }`}
                style={{
                  height: isPlaying ? `${Math.max(20, (height * ((i % 3) + 1)) % 100)}%` : '20%',
                  animationDelay: `${(i % 5) * 0.15}s`
                }}
              />
            ))}
          </div>

          {/* Time Elapsed / Total */}
          <div className="text-xs font-mono font-medium text-[var(--muted)] whitespace-nowrap pl-1">
            <span className="text-[var(--heading)] font-semibold">{formatTime(currentTime)}</span>
            <span className="mx-1">/</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Badges and Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {hasDirectAudio ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-montserrat uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Carrier Recording
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-full font-montserrat uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              Call Audio Playback
            </span>
          )}

          {normalizedRecordingUrl && !directAudioError && (
            <a
              href={normalizedRecordingUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] transition-all cursor-pointer"
              title="Download Audio File"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Progress Bar (Interactive Scrubber) */}
      <div
        onClick={handleSeek}
        className="relative w-full h-2 bg-[var(--background)] rounded-full mt-3 overflow-hidden cursor-pointer border border-[var(--border)] group"
      >
        <div
          className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-150 relative"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Speaker Cue when Conversational Speech is Active */}
      {!hasDirectAudio && isPlaying && activeTurnIndex >= 0 && turns[activeTurnIndex] && (
        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-[var(--muted)] bg-[var(--background)]/70 px-3 py-1.5 rounded-xl border border-[var(--border)] animate-in fade-in duration-200">
          <Disc3 className="w-3.5 h-3.5 text-violet-500 animate-spin" />
          <span>
            Speaking: <strong className="text-[var(--heading)]">{turns[activeTurnIndex].speaker === 'AI' ? 'AI Assistant' : callerName}</strong> — 
            <span className="italic ml-1 truncate max-w-xs inline-block align-bottom font-mono">
              &quot;{turns[activeTurnIndex].text.slice(0, 60)}...&quot;
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
