import { useState, useEffect } from 'react'
import { Volume2, Play, Pause, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { LockedFeature } from './LockedFeature'
import { toast } from 'sonner'

interface AgentVoiceTabProps {
  agent: any
  isPaid: boolean // whether they have cloning unlocked (pro plan)
  upgradeUrl: string
}

// Real ElevenLabs voice IDs are UUIDs (21m00Tcm4TlvDq8ikWAM etc.).
// If an agent was created with our old broken mapping (nova-openai, echo-openai, shimmer-openai)
// or has voice_provider='elevenlabs' but no valid ElevenLabs ID, auto-correct to Sarvam.
const FAKE_ELEVENLABS_IDS = ['nova-openai', 'echo-openai', 'shimmer-openai', 'onyx-openai', 'alloy-openai', '']
const SARVAM_VOICE_IDS = ['shubh', 'anushka', 'arvind', 'maya', 'neel', 'pavithra', 'arjun', 'amol', 'diya', 'meera']

function getEffectiveProvider(agentVoiceProvider: string, agentVoiceId: string): 'elevenlabs' | 'sarvam' {
  // If stored provider is sarvam, trust it
  if (agentVoiceProvider === 'sarvam') return 'sarvam'
  // If stored provider is elevenlabs but voice_id is a fake/placeholder, auto-correct to sarvam
  if (agentVoiceProvider === 'elevenlabs' && FAKE_ELEVENLABS_IDS.includes(agentVoiceId)) return 'sarvam'
  // If stored provider is elevenlabs and voice_id looks like a real ElevenLabs UUID (long alphanum), trust it
  if (agentVoiceProvider === 'elevenlabs' && agentVoiceId && agentVoiceId.length > 15 && !agentVoiceId.includes('-openai')) return 'elevenlabs'
  // Default: Sarvam
  return 'sarvam'
}

function getEffectiveVoiceId(agentVoiceProvider: string, agentVoiceId: string): string {
  const effectiveProvider = getEffectiveProvider(agentVoiceProvider, agentVoiceId)
  if (effectiveProvider === 'sarvam') {
    // If stored voice_id is a Sarvam name, use it; otherwise pick a default
    if (SARVAM_VOICE_IDS.includes(agentVoiceId)) return agentVoiceId
    return 'anushka' // safe Sarvam default
  }
  return agentVoiceId
}

export function AgentVoiceTab({ agent, isPaid, upgradeUrl }: AgentVoiceTabProps) {
  const effectiveProvider = getEffectiveProvider(agent.voice_provider || '', agent.voice_id || '')
  const effectiveVoiceId = getEffectiveVoiceId(agent.voice_provider || '', agent.voice_id || '')

  const [provider, setProvider] = useState<'elevenlabs' | 'sarvam'>(effectiveProvider)
  const [selectedVoice, setSelectedVoice] = useState(effectiveVoiceId)
  const [speed, setSpeed] = useState(agent.voice_speed || 1.0)
  const [pitch, setPitch] = useState(agent.voice_pitch || 1.0)
  const [language, setLanguage] = useState(agent.primary_language || 'hinglish')
  const [personality, setPersonality] = useState(agent.personality || 'friendly')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
  const [saving, setSaving] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [resetting, setResetting] = useState(false)
  
  // Voice Cloning Upload States
  const [cloningFile, setCloningFile] = useState<File | null>(null)
  const [clonedName, setClonedName] = useState('')
  const [isCloning, setIsCloning] = useState(false)
  const [elevenLabsVoices, setElevenLabsVoices] = useState<any[]>([])
  const [sarvamVoices, setSarvamVoices] = useState<any[]>([])

  const handleResetVoice = async () => {
    if (!window.confirm("WARNING: This will reset all voice settings for this agent to default Indian accents (Sarvam AI). Your custom speed, pitch, and voice provider changes will be overwritten. Do you want to proceed?")) {
      return
    }
    setResetting(true)
    try {
      const res = await fetch(`/api/agents/${agent.id}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_type: 'voice' })
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("Voice settings reset successfully!")
      window.location.reload()
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to reset voice: " + err.message)
    } finally {
      setResetting(false)
    }
  }

  useEffect(() => {
    if (provider === 'elevenlabs' && elevenLabsVoices.length === 0) {
      fetch('/api/elevenlabs/voices')
        .then(res => res.json())
        .then(data => {
          if (data.voices) {
            const freeTierIds = ['21m00Tcm4TlvDq8ikWAM','pNInz6obpgDQGcFmaJgB','ErXwobaYiN019PkySvjV','AZnzlk1XvdvUeBnXmlld','MF3mGyEYCl7XYWbV9V6O','TxGEqnHWrfWFTfGW9XjX','EXAVITQu4vr4xnSDxMaL']
            setElevenLabsVoices(data.voices.filter((v: any) => freeTierIds.includes(v.voice_id)))
          }
        })
        .catch(err => console.error("Error fetching ElevenLabs voices:", err))
    } else if (provider === 'sarvam' && sarvamVoices.length === 0) {
      fetch('/api/sarvam/voices')
        .then(res => res.json())
        .then(data => {
          if (data.voices) setSarvamVoices(data.voices)
        })
        .catch(err => console.error("Error fetching Sarvam voices:", err))
    }
  }, [provider, elevenLabsVoices.length, sarvamVoices.length])

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage)
    if (provider === 'elevenlabs' && (newLanguage === 'hinglish' || newLanguage === 'hi-IN')) {
      toast.warning("ElevenLabs does not support Hindi voices. Switch to Sarvam for Hindi/Hinglish.")
      setProvider('sarvam')
      setSelectedVoice('shubh')
    } else if (newLanguage === 'en-US' || newLanguage === 'en-GB' || newLanguage === 'en-IN') {
      if (provider === 'elevenlabs') {
        setSelectedVoice(newLanguage === 'en-GB' ? 'ErXwobaYiN019PkySvjV' : '21m00Tcm4TlvDq8ikWAM')
      }
    } else if (provider === 'sarvam' && (newLanguage === 'hinglish' || newLanguage === 'hi-IN')) {
      setSelectedVoice('shubh')
    }
  }

  const handleProviderChange = (newProvider: 'elevenlabs' | 'sarvam') => {
    if (newProvider === 'elevenlabs' && (language === 'hinglish' || language === 'hi-IN')) {
      toast.warning("ElevenLabs does not support Hindi voices. Switch to Sarvam for Hindi/Hinglish.")
      setProvider('sarvam')
      return
    }
    setProvider(newProvider)
    setSelectedVoice(newProvider === 'elevenlabs' ? '21m00Tcm4TlvDq8ikWAM' : 'shubh')
  }

  // Preview TTS voice configuration using backend endpoint
  const handlePlayPreview = async (voiceId: string) => {
    if (playingId === voiceId) {
      audio?.pause()
      setPlayingId(null)
      return
    }

    if (audio) {
      audio.pause()
    }

    setIsPreviewing(true)
    try {
      const isMale = sarvamVoices.find(v => v.id === voiceId)?.gender === 'Male' || ['pNInz6obpgDQGcFmaJgB', 'TxGEqnHWrfWFTfGW9XjX'].includes(voiceId)
      
      let previewText = "Hello, I'm an AI assistant from Trinetra. How can I help you today?"
      if (language === 'hinglish' || language === 'hi-IN') {
        previewText = isMale 
          ? "Namaste ji, main Trinetra AI se Vikram bol raha hoon. Kya main 30 second ke liye aapka time le sakta hoon?"
          : "Namaste ji, main Trinetra AI se Anushka bol rahi hoon. Kya main 30 second ke liye aapka time le sakti hoon?"
      }

      const res = await fetch('/api/voice/tts-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: previewText,
          voice_provider: provider,
          voice_id: voiceId,
          language: language,
          voice_speed: speed,
          voice_pitch: pitch
        })
      })

      if (!res.ok) {
        const errText = await res.text()
        if (errText.includes('paid_plan_required') || errText.includes('402')) {
          throw new Error("This voice requires a paid ElevenLabs plan.")
        }
        throw new Error(errText)
      }
      const data = await res.json()
      
      if (data.audioUrl) {
        const newAudio = new Audio(data.audioUrl)
        newAudio.play()
        newAudio.onended = () => setPlayingId(null)
        setAudio(newAudio)
        setPlayingId(voiceId)
      } else {
        throw new Error("No preview URL returned.")
      }
    } catch (err: any) {
      if (err.message.includes("paid_plan_required") || err.message.includes("paid ElevenLabs plan") || err.message.includes("402")) {
        toast.warning("This voice requires an ElevenLabs paid plan. Using free voices only.")
      } else {
        toast.error("Preview unavailable. Please try another voice.")
      }
    } finally {
      setIsPreviewing(false)
    }
  }

  // Save voice configuration parameters to the database
  const handleSaveVoiceSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice_provider: provider,
          voice_id: selectedVoice,
          voice_speed: speed,
          voice_pitch: pitch,
          primary_language: language,
          personality: personality
        })
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }
      toast.success("Voice configurations successfully synced to the database!")
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to save voice settings: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Process voice cloning audio file upload
  const handleCloneVoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cloningFile || !clonedName.trim()) {
      toast.error("Please provide both an audio file and a voice name.")
      return
    }

    setIsCloning(true)
    try {
      const formData = new FormData()
      formData.append("file", cloningFile)
      formData.append("name", clonedName)

      const res = await fetch(`/api/agents/${agent.id}/clone-voice`, {
        method: 'POST',
        body: formData
      })

      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      
      toast.success(`Voice "${clonedName}" successfully cloned and assigned to agent!`)
      if (data.voiceId) {
        setProvider('elevenlabs')
        setSelectedVoice(data.voiceId)
      }
      setCloningFile(null)
      setClonedName('')
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to clone voice reference: " + err.message)
    } finally {
      setIsCloning(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        
        {/* Voice Selector and Settings (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
            <h2 className="text-xl font-bold font-display text-[var(--heading)] flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-violet-400" /> Voice Synthesis Settings
            </h2>

            {/* Language & Personality Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider font-montserrat text-[var(--muted)]">Primary Language</label>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)] font-montserrat font-bold uppercase tracking-wider cursor-pointer"
                >
                  <option value="hinglish">Hinglish (Hindi + English)</option>
                  <option value="hi-IN">Hindi (hi-IN)</option>
                  <option value="en-IN">English - Indian (en-IN)</option>
                  <option value="en-US">English - US (en-US)</option>
                  <option value="en-GB">English - UK (en-GB)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider font-montserrat text-[var(--muted)]">Agent Personality</label>
                <select
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)] font-montserrat font-bold uppercase tracking-wider cursor-pointer"
                >
                  <option value="professional">Professional (Formal/Concise)</option>
                  <option value="friendly">Friendly (Warm/Conversational)</option>
                  <option value="assertive">Assertive (Direct/Sales-focused)</option>
                  <option value="empathetic">Empathetic (Caring/Supportive)</option>
                </select>
              </div>
            </div>

            {/* Provider Radios */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider font-montserrat text-[var(--muted)]">Voice Provider</label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  provider === 'elevenlabs' 
                    ? 'border-[var(--primary-bg)] bg-[var(--primary-bg)]/5 text-[var(--heading)]' 
                    : 'border-[var(--border)] bg-transparent text-[var(--body)] hover:bg-[var(--hover-bg)]/20'
                }`}>
                  <span className="text-xs font-montserrat font-bold uppercase tracking-wider">ElevenLabs (HD Voices)</span>
                  <input 
                    type="radio" 
                    name="voice_provider" 
                    checked={provider === 'elevenlabs'}
                    onChange={() => handleProviderChange('elevenlabs')}
                    className="sr-only"
                  />
                </label>

                <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  provider === 'sarvam' 
                    ? 'border-[var(--primary-bg)] bg-[var(--primary-bg)]/5 text-[var(--heading)]' 
                    : 'border-[var(--border)] bg-transparent text-[var(--body)] hover:bg-[var(--hover-bg)]/20'
                }`}>
                  <span className="text-xs font-montserrat font-bold uppercase tracking-wider">Sarvam AI (Indic Accents)</span>
                  <input 
                    type="radio" 
                    name="voice_provider" 
                    checked={provider === 'sarvam'}
                    onChange={() => handleProviderChange('sarvam')}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {/* Voice Picker Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider font-montserrat text-[var(--muted)]">Select Voice</label>
              <div className="flex gap-3">
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="flex-grow bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)] font-montserrat font-bold uppercase tracking-wider cursor-pointer"
                >
                  {provider === 'elevenlabs' ? (
                    <>
                      {elevenLabsVoices.length > 0 ? elevenLabsVoices.map(voice => (
                        <option key={voice.voice_id} value={voice.voice_id}>
                          {voice.name} ({voice.labels?.gender || 'Unknown'}, {voice.labels?.accent || 'Standard'})
                        </option>
                      )) : (
                        <option value="EXAVITQu4vr4xnSDxMaL">Rachel (Female, Warm)</option>
                      )}
                      {selectedVoice.startsWith('cloned-') && (
                        <option value={selectedVoice}>Cloned Custom Voice ({selectedVoice.slice(0, 11)})</option>
                      )}
                    </>
                  ) : (
                    <>
                      {sarvamVoices.length > 0 ? sarvamVoices.map(voice => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name} ({voice.gender})
                        </option>
                      )) : (
                        <option value="aditi">Aditi (Female)</option>
                      )}
                    </>
                  )}
                </select>
                <button
                  onClick={() => handlePlayPreview(selectedVoice)}
                  disabled={isPreviewing}
                  className="px-5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider font-montserrat transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isPreviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : playingId === selectedVoice ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              {provider === 'elevenlabs' && (
                <p className="text-[10px] text-[var(--muted)] font-sans mt-2">Want more voices? Upgrade to an ElevenLabs paid plan.</p>
              )}
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[var(--border)]">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-montserrat font-bold uppercase tracking-wider text-[var(--muted)]">
                  <span>Speaking Speed</span>
                  <span className="text-[var(--heading)] font-mono">{speed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-violet-400"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-montserrat font-bold uppercase tracking-wider text-[var(--muted)]">
                  <span>Pitch Shift</span>
                  <span className="text-[var(--heading)] font-mono">{pitch > 0 ? `+${pitch}` : pitch}</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={pitch}
                  onChange={(e) => setPitch(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-violet-400"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSaveVoiceSettings}
                disabled={saving || resetting}
                className="px-6 py-3.5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-montserrat font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.01] shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Voice Settings'}
              </button>

              <button
                type="button"
                onClick={handleResetVoice}
                disabled={saving || resetting}
                className="px-6 py-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-montserrat font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Voice Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* Voice Cloning (2 cols) */}
        <div className="lg:col-span-2">
          {isPaid ? (
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-bold font-display text-[var(--heading)]">Premium Voice Cloning</h3>
                <p className="text-xs text-[var(--muted)] font-sans">
                  Upload an audio file of a human voice (10s - 2min) to synthesize an exact digital replica.
                </p>
              </div>

              <form onSubmit={handleCloneVoice} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider font-montserrat text-[var(--muted)]">Voice Name</label>
                  <input
                    type="text"
                    required
                    value={clonedName}
                    onChange={(e) => setClonedName(e.target.value)}
                    placeholder="e.g. My Custom Voice"
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)] font-sans"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider font-montserrat text-[var(--muted)]">Upload Reference Audio</label>
                  <div className="border border-dashed border-[var(--border)] rounded-xl p-6 text-center cursor-pointer hover:bg-[var(--hover-bg)]/20 transition-all flex flex-col items-center justify-center gap-2">
                    <Upload className="w-6 h-6 text-[var(--muted)]" />
                    <input 
                      type="file" 
                      accept="audio/*" 
                      onChange={(e) => setCloningFile(e.target.files?.[0] || null)}
                      className="sr-only"
                      id="voice-clone-upload"
                    />
                    <label htmlFor="voice-clone-upload" className="text-xs font-montserrat font-bold uppercase tracking-wider text-violet-500 hover:text-violet-600 cursor-pointer">
                      {cloningFile ? cloningFile.name : 'Select Audio File'}
                    </label>
                    <span className="text-[10px] text-[var(--muted)] font-sans">WAV, MP3, or M4A up to 10MB</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCloning}
                  className="w-full py-3.5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-montserrat font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isCloning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Clone voice reference'}
                </button>
              </form>
            </div>
          ) : (
            <LockedFeature 
              title="Voice Cloning" 
              description="Instantly replicate any executive or agent voice from a small audio sample. Perfect for highly personalized cold outreach." 
              upgradeUrl={upgradeUrl} 
            />
          )}
        </div>

      </div>
    </div>
  )
}
