'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Play, Pause, RotateCcw, Download, AlertCircle, Volume2 } from 'lucide-react'

export interface CallAudioPlayerProps {
  recordingUrl?: string | null
  transcript?: any
  durationSeconds?: number | null
  autoPlay?: boolean
  compact?: boolean
  className?: string
  callerName?: string
}

export function CallAudioPlayer({
  recordingUrl,
  durationSeconds = 0,
  autoPlay = false,
  compact = false,
  className = '',
  callerName = 'Customer'
}: CallAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(durationSeconds || 0)
  const [audioError, setAudioError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Normalize recording URL
  const normalizedRecordingUrl = useMemo(() => {
    if (!recordingUrl) return null
    const trimmed = recordingUrl.trim()
    if (!trimmed) return null
    // Detect known dead sandbox / placeholder S3 links
    if (trimmed.includes('trinetra-voice-recordings.s3.amazonaws.com') || trimmed.includes('sandbox_recording.mp3')) {
      return null
    }
    // Twilio recordings require .mp3 for direct audio streaming
    if (trimmed.includes('api.twilio.com') && !trimmed.endsWith('.mp3') && !trimmed.endsWith('.wav')) {
      return `${trimmed}.mp3`
    }
    return trimmed
  }, [recordingUrl])

  const hasAudio = Boolean(normalizedRecordingUrl && !audioError)

  // Reset audio error if url changes
  useEffect(() => {
    setAudioError(false)
    setIsPlaying(false)
    setCurrentTime(0)
  }, [normalizedRecordingUrl])

  useEffect(() => {
    if (durationSeconds && durationSeconds > 0) {
      setTotalDuration(durationSeconds)
    }
  }, [durationSeconds])

  const handleTogglePlay = () => {
    if (!hasAudio || !audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      setIsLoading(true)
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true)
          setIsLoading(false)
        })
        .catch((err) => {
          console.warn('[CallAudioPlayer] Playback error:', err)
          setIsLoading(false)
          setAudioError(true)
          setIsPlaying(false)
        })
    }
  }

  const handleRestart = () => {
    if (!hasAudio || !audioRef.current) return
    audioRef.current.currentTime = 0
    setCurrentTime(0)
    audioRef.current.play()
      .then(() => setIsPlaying(true))
      .catch(() => setAudioError(true))
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(Math.round(audioRef.current.currentTime))
      if (audioRef.current.duration && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
        setTotalDuration(Math.round(audioRef.current.duration))
      }
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
      setTotalDuration(Math.round(audioRef.current.duration))
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(totalDuration)
  }

  const handleError = () => {
    setAudioError(true)
    setIsPlaying(false)
    setIsLoading(false)
  }

  // Handle scrubber seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasAudio || !audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percent = Math.max(0, Math.min(1, clickX / rect.width))
    const dur = audioRef.current.duration || totalDuration || 1
    const targetTime = Math.round(percent * dur)
    audioRef.current.currentTime = targetTime
    setCurrentTime(targetTime)
  }

  // Auto-play support
  useEffect(() => {
    if (autoPlay && hasAudio && audioRef.current) {
      const timer = setTimeout(() => {
        handleTogglePlay()
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [autoPlay, hasAudio])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const progressPercent = totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0

  // Compact row player (used in tables and lists)
  if (compact) {
    if (!hasAudio) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)]/60 font-mono py-1">
          No Recording
        </span>
      )
    }

    return (
      <div className={`inline-flex items-center gap-2 p-1.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs ${className}`}>
        <audio
          ref={audioRef}
          src={normalizedRecordingUrl!}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={handleError}
          preload="metadata"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleTogglePlay()
          }}
          disabled={isLoading}
          className="w-7 h-7 rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
          title={isPlaying ? 'Pause Recording' : 'Play Recording'}
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

  // Full Expanded Player
  return (
    <div className={`rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]/90 backdrop-blur-md p-4 transition-all shadow-sm ${className}`}>
      {/* Real Audio Element */}
      {normalizedRecordingUrl && (
        <audio
          ref={audioRef}
          src={normalizedRecordingUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={handleError}
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
            disabled={!hasAudio || isLoading}
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-all shrink-0 ${
              hasAudio
                ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/20 hover:scale-105 active:scale-95 cursor-pointer'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
            }`}
            title={hasAudio ? (isPlaying ? 'Pause Recording' : 'Play Call Recording') : 'Recording unavailable'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          {/* Restart Button */}
          {hasAudio && (
            <button
              type="button"
              onClick={handleRestart}
              className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-transparent hover:border-[var(--border)] transition-all cursor-pointer shrink-0"
              title="Restart Recording"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {/* Animated Waveform Equalizer */}
          <div className="flex items-center gap-0.5 h-6 px-2 bg-[var(--background)]/60 rounded-lg border border-[var(--border)]">
            {[40, 75, 30, 90, 60, 100, 45, 80, 55, 95, 35, 70, 85, 50, 65, 40].map((height, i) => (
              <span
                key={i}
                className={`w-1 rounded-full transition-all duration-200 ${
                  isPlaying ? 'bg-violet-500 animate-pulse' : 'bg-[var(--muted)]/30'
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
          {hasAudio ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-montserrat uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Call Recording
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
              <AlertCircle className="w-3 h-3" />
              Recording Unavailable
            </span>
          )}

          {hasAudio && normalizedRecordingUrl && (
            <a
              href={normalizedRecordingUrl}
              download={`call_recording_${Date.now()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] transition-all cursor-pointer"
              title="Download Actual Call Audio"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Progress Bar (Interactive Scrubber) */}
      <div
        onClick={handleSeek}
        className={`relative w-full h-2 bg-[var(--background)] rounded-full mt-3 overflow-hidden border border-[var(--border)] group ${
          hasAudio ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
        }`}
      >
        <div
          className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-150 relative"
          style={{ width: `${progressPercent}%` }}
        >
          {hasAudio && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>

      {!hasAudio && (
        <p className="text-[11px] text-[var(--muted)] mt-2 italic">
          Real call audio was not captured for this call or is currently processing.
        </p>
      )}
    </div>
  )
}
