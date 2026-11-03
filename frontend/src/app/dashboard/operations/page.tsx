'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Brain,
  Mic,
  MicOff,
  Upload,
  Plus,
  RefreshCw,
  Trash2,
  FileText,
  Calendar,
  Package,
  ArrowRight,
  Check,
  Loader2,
  X,
  FileSpreadsheet
} from 'lucide-react'
import { toast } from 'sonner'

interface DirectiveItem {
  id: string
  title: string
  category: string
  status: string
  created_at: string
  updated_at: string
  metadata: {
    prompt_override?: string
    voice_transcript?: string
    summary_hindi?: string
    action_type?: string
    is_active?: boolean
    [key: string]: any
  }
}

interface IngestedDocument {
  id: string
  name: string
  size: number
  type: string
  extractedSummary?: string
  uploadedAt: string
}

const QUICK_VOICE_PROMPTS = [
  {
    label: 'Salon / Clinic Timings',
    text: 'Aaj mai 10 baje se 4 bje tak salon open rakhunga to us time ke according he appointments lena'
  },
  {
    label: 'Store Closed / Reschedule',
    text: 'Aaj mai shop close rakhunga so aaj ki saari appointment kal schedule karo aur us hisab se karna'
  },
  {
    label: 'Logistics / Fleet Update',
    text: 'Aaj mere paas koi gaadi nahi hai par products available hai to aur koi product mat lena sirf gadi ki jarurat hai'
  },
  {
    label: 'Urgent Discount / Offer',
    text: 'Aaj sabhi haircut aur facials par 20% discount offer karo aur minimum price limit strict rakhna'
  }
]

export default function OperationsBrainPage() {
  const [directives, setDirectives] = useState<DirectiveItem[]>([])
  const [documents, setDocuments] = useState<IngestedDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Modals
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false)
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Document state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isIngestingDocs, setIsIngestingDocs] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Custom Rule Form
  const [ruleTitle, setRuleTitle] = useState('')
  const [rulePrompt, setRulePrompt] = useState('')

  const fetchDirectives = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true)
      const res = await fetch('/api/business-catalog?category=voice_directive')
      const json = await res.json()
      if (json.success && json.data) {
        setDirectives(json.data.items || [])
      }
    } catch (err) {
      console.error('Failed to load directives:', err)
      if (isManual) toast.error('Failed to load directives')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDirectives()
    // Load persisted documents from localStorage if any
    try {
      const savedDocs = localStorage.getItem('trinetra_ingested_docs')
      if (savedDocs) setDocuments(JSON.parse(savedDocs))
    } catch (_) {}
  }, [])

  // Web Speech Recognition
  const startRecording = () => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in this browser. Please use Chrome or type your instruction.')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'hi-IN'

      recognition.onstart = () => setIsRecording(true)
      recognition.onresult = (event: any) => {
        let fullTranscript = ''
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + ' '
        }
        setVoiceTranscript(fullTranscript.trim())
      }
      recognition.onerror = (err: any) => {
        console.error('Speech recognition error:', err)
        setIsRecording(false)
      }
      recognition.onend = () => setIsRecording(false)

      recognition.start()
      recognitionRef.current = recognition
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      toast.error('Could not activate microphone')
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }

  const handleApplyVoiceDirective = async () => {
    if (!voiceTranscript.trim()) {
      toast.error('Please speak or type an instruction first.')
      return
    }

    try {
      setIsProcessingVoice(true)
      const res = await fetch('/api/business-catalog/voice-directive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: voiceTranscript.trim() })
      })

      const json = await res.json()
      if (json.success) {
        toast.success('Spoken instruction successfully added to Brain!')
        setIsVoiceModalOpen(false)
        setVoiceTranscript('')
        fetchDirectives()
      } else {
        toast.error(json.error || 'Failed to process voice directive')
      }
    } catch (err) {
      toast.error('Network error processing voice directive')
    } finally {
      setIsProcessingVoice(false)
    }
  }

  const handleToggleDirective = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'available' ? 'reserved' : 'available'
    try {
      const res = await fetch('/api/business-catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus })
      })
      const json = await res.json()
      if (json.success) {
        toast.success(nextStatus === 'available' ? 'Directive activated for calls' : 'Directive paused')
        fetchDirectives()
      }
    } catch {
      toast.error('Failed to update directive status')
    }
  }

  const handleDeleteDirective = async (id: string) => {
    if (!confirm('Are you sure you want to delete this directive?')) return
    try {
      const res = await fetch(`/api/business-catalog?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('Directive deleted')
        fetchDirectives()
      }
    } catch {
      toast.error('Failed to delete directive')
    }
  }

  // Document Ingest
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const newFiles = Array.from(e.target.files)
    setUploadedFiles(prev => [...prev, ...newFiles])
  }

  const handleUploadAndProcessDocs = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please select at least one document.')
      return
    }

    try {
      setIsIngestingDocs(true)
      const formData = new FormData()
      uploadedFiles.forEach(file => formData.append('files', file))

      const res = await fetch('/api/ingest', {
        method: 'POST',
        body: formData
      })
      const json = await res.json()

      if (json.success) {
        const newDocs: IngestedDocument[] = uploadedFiles.map(file => ({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          extractedSummary: 'Extracted key business knowledge, pricing limits, and operating rules.',
          uploadedAt: new Date().toISOString()
        }))

        const combined = [...newDocs, ...documents]
        setDocuments(combined)
        try {
          localStorage.setItem('trinetra_ingested_docs', JSON.stringify(combined))
        } catch (_) {}

        toast.success(`Successfully extracted knowledge from ${uploadedFiles.length} file(s)!`)
        setIsDocumentModalOpen(false)
        setUploadedFiles([])
      } else {
        toast.error(json.error || 'Failed to extract documents')
      }
    } catch (err) {
      toast.error('Network error during document ingest')
    } finally {
      setIsIngestingDocs(false)
    }
  }

  const handleDeleteDocument = (id: string) => {
    const updated = documents.filter(d => d.id !== id)
    setDocuments(updated)
    try {
      localStorage.setItem('trinetra_ingested_docs', JSON.stringify(updated))
    } catch (_) {}
    toast.success('Document reference removed')
  }

  // Custom Rule
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ruleTitle.trim() || !rulePrompt.trim()) {
      toast.error('Title and instruction are required')
      return
    }

    try {
      const res = await fetch('/api/business-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ruleTitle.trim(),
          category: 'voice_directive',
          status: 'available',
          metadata: {
            prompt_override: rulePrompt.trim(),
            action_type: 'rule_override',
            is_active: true
          }
        })
      })

      const json = await res.json()
      if (json.success) {
        toast.success('Operating rule created')
        setIsRuleModalOpen(false)
        setRuleTitle('')
        setRulePrompt('')
        fetchDirectives()
      } else {
        toast.error(json.error || 'Failed to save rule')
      }
    } catch {
      toast.error('Network error creating rule')
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--heading)] tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6 text-[var(--heading)]" />
            <span>Operations & Instructions Brain</span>
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1 max-w-2xl">
            Live business operating rules, daily spoken directives, and uploaded knowledge sources referenced live by your AI voice agents during customer calls.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchDirectives(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Directives"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Mic className="w-4 h-4" />
            <span>Speak Directive</span>
          </button>

          <button
            onClick={() => setIsDocumentModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] font-bold text-xs cursor-pointer shadow-xs transition-colors"
          >
            <Upload className="w-4 h-4 text-[var(--muted)]" />
            <span>Upload Documents</span>
          </button>

          <button
            onClick={() => setIsRuleModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] font-bold text-xs cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-[var(--muted)]" />
            <span>+ Add Rule</span>
          </button>
        </div>
      </div>

      {/* Top Specialized Operational Hub Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Appointments Schedule Sheet Link Card */}
        <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[var(--heading)]" />
                <h3 className="font-bold text-sm text-[var(--heading)]">Live Appointments Schedule Sheet</h3>
              </div>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Dynamic Excel-style spreadsheet with time ranges, available slots, and in-call booked appointments updating live during calls.
              </p>
            </div>
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard/appointments"
              className="inline-flex items-center gap-2 text-xs font-bold text-[var(--heading)] hover:opacity-80 transition-opacity"
            >
              <span>Open Schedule Sheet (Excel Grid)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Product Inventory & Pricing Sheet Link Card */}
        <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[var(--heading)]" />
                <h3 className="font-bold text-sm text-[var(--heading)]">Live Products, Inventory & Pricing Sheet</h3>
              </div>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Real-time spreadsheet tracking initial stock, in-call sold pieces, available units, base prices, and strict AI floor limits.
              </p>
            </div>
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard/inventory"
              className="inline-flex items-center gap-2 text-xs font-bold text-[var(--heading)] hover:opacity-80 transition-opacity"
            >
              <span>Open Inventory & Pricing Sheet (Excel Grid)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Section 1: Active Spoken Voice Directives & Daily Overrides */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-[var(--heading)]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--heading)]">
              Active Spoken Voice Directives & Daily Overrides ({directives.length})
            </h2>
          </div>
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--heading)] cursor-pointer"
          >
            + New Voice Rule
          </button>
        </div>

        {loading ? (
          <div className="p-10 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] text-center text-[var(--muted)]">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--heading)]" />
            <span className="text-xs">Loading active voice rules...</span>
          </div>
        ) : directives.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] text-center space-y-3">
            <Mic className="w-8 h-8 mx-auto text-[var(--muted)] stroke-1" />
            <div>
              <p className="text-sm font-bold text-[var(--heading)]">No voice directives recorded</p>
              <p className="text-xs text-[var(--muted)] max-w-md mx-auto mt-0.5">
                Speak instructions in Hindi, Hinglish, or English (e.g. "Aaj salon 10 baje khulega" or "Aaj store closed hai") and Trinetra will enforce it during live customer calls.
              </p>
            </div>
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs rounded-xl cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" /> Speak to Brain
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {directives.map(item => {
              const meta = item.metadata || {}
              const isActive = item.status === 'available'

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-4 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
                          {meta.action_type || 'DAILY SPOKEN OVERRIDE'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-[var(--heading)]">{item.title}</h3>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {isActive ? 'Active in Calls' : 'Paused'}
                    </span>
                  </div>

                  {meta.voice_transcript && (
                    <div className="p-3 rounded-xl bg-[var(--hover-bg)] text-xs text-[var(--heading)] italic font-mono border border-[var(--border)]">
                      "{meta.voice_transcript}"
                    </div>
                  )}

                  {meta.prompt_override && (
                    <div className="text-xs space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">
                        Live Agent Instruction:
                      </span>
                      <p className="text-[var(--heading)] bg-[var(--hover-bg)]/50 p-2.5 rounded-xl border border-[var(--border)] leading-relaxed">
                        {meta.prompt_override}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs">
                    <span className="text-[10px] text-[var(--muted)] font-mono">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleDirective(item.id, item.status)}
                        className="px-3 py-1 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] cursor-pointer text-xs font-semibold shadow-xs transition-colors"
                      >
                        {isActive ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteDirective(item.id)}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 text-[var(--muted)] hover:text-red-500 cursor-pointer transition-colors"
                        title="Delete Directive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Section 2: Ingested Knowledge Documents & Sources */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--heading)]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--heading)]">
              Ingested Business Knowledge Documents ({documents.length})
            </h2>
          </div>
          <button
            onClick={() => setIsDocumentModalOpen(true)}
            className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--heading)] cursor-pointer"
          >
            + Upload Document
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] text-center space-y-3">
            <FileSpreadsheet className="w-8 h-8 mx-auto text-[var(--muted)] stroke-1" />
            <div>
              <p className="text-sm font-bold text-[var(--heading)]">No documents uploaded yet</p>
              <p className="text-xs text-[var(--muted)] max-w-md mx-auto mt-0.5">
                Upload your rate card, service price PDF, product specifications, or company FAQs. The AI brain extracts the exact facts for caller queries.
              </p>
            </div>
            <button
              onClick={() => setIsDocumentModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] font-bold text-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> Upload File
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)]">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--heading)] line-clamp-1">{doc.name}</h4>
                      <p className="text-[10px] text-[var(--muted)] font-mono">
                        {(doc.size / 1024).toFixed(1)} KB • {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-1 rounded text-[var(--muted)] hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--hover-bg)] text-[11px] text-[var(--muted)] leading-relaxed">
                  {doc.extractedSummary || 'Extracted knowledge indexed for in-call agent queries.'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Speak to Brain Modal */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-xl p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--heading)] flex items-center gap-2">
                <Mic className="w-5 h-5 text-[var(--heading)]" />
                <span>Speak Operational Directive to Brain</span>
              </h2>
              <button
                onClick={() => {
                  stopRecording()
                  setIsVoiceModalOpen(false)
                }}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--muted)]">
              Speak naturally in Hindi, Hinglish, or English. Trinetra's AI extracts your exact directive and injects it live into your AI voice agent answering calls.
            </p>

            {/* Quick Prompt Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Try Examples:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_VOICE_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setVoiceTranscript(qp.text)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--hover-bg)] hover:bg-[var(--card-bg)] text-[var(--heading)] border border-[var(--border)] transition-colors cursor-pointer text-left"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Recording Area */}
            <div className="p-4 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] flex flex-col items-center justify-center gap-3">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse scale-105'
                    : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:scale-105'
                }`}
              >
                {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <span className="text-xs font-semibold text-[var(--heading)]">
                {isRecording ? 'Listening... Speak your directive' : 'Click to start speaking'}
              </span>
            </div>

            {/* Editable Transcript */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-[var(--muted)] tracking-wider">
                Recognized Spoken Transcript:
              </label>
              <textarea
                rows={3}
                value={voiceTranscript}
                onChange={e => setVoiceTranscript(e.target.value)}
                placeholder="Or type here: e.g. Aaj salon 10 baje khulega, uske baad hi appointment book karna..."
                className="w-full p-3 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  stopRecording()
                  setIsVoiceModalOpen(false)
                }}
                className="px-4 py-2 rounded-xl bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)] font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyVoiceDirective}
                disabled={isProcessingVoice || !voiceTranscript.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isProcessingVoice ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing with AI...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Directive</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Documents Modal */}
      {isDocumentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--heading)] flex items-center gap-2">
                <Upload className="w-5 h-5 text-[var(--heading)]" />
                <span>Upload Documents to Brain</span>
              </h2>
              <button
                onClick={() => setIsDocumentModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-[var(--border)] hover:border-zinc-400 dark:hover:border-zinc-600 rounded-2xl text-center cursor-pointer transition-colors space-y-2 bg-[var(--hover-bg)]/40"
            >
              <Upload className="w-8 h-8 mx-auto text-[var(--muted)] stroke-1" />
              <div className="text-xs font-bold text-[var(--heading)]">
                Click to select PDF, Excel, Word, or Text files
              </div>
              <p className="text-[11px] text-[var(--muted)]">Supports .pdf, .xlsx, .csv, .docx, .txt</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.csv,.docx,.txt"
                onChange={handleFilesSelected}
                className="hidden"
              />
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Selected Files ({uploadedFiles.length}):
                </span>
                {uploadedFiles.map((f, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg bg-[var(--hover-bg)] border border-[var(--border)] text-xs flex items-center justify-between"
                  >
                    <span className="font-medium text-[var(--heading)] truncate">{f.name}</span>
                    <span className="text-[10px] font-mono text-[var(--muted)]">
                      {(f.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setIsDocumentModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)] font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadAndProcessDocs}
                disabled={isIngestingDocs || uploadedFiles.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isIngestingDocs ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting Knowledge...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Extract & Save to Brain</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Rule Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--heading)] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[var(--heading)]" />
                <span>Add Operating Rule / Guardrail</span>
              </h2>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--heading)] mb-1">Rule Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mandatory Appointment Confirmation or Pricing Floor Rule"
                  value={ruleTitle}
                  onChange={e => setRuleTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--heading)] mb-1">
                  In-Call Agent Instruction (Prompt Override) *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Always ask for customer's phone number before confirming appointment. Never offer discounts exceeding 15% on salon services."
                  value={rulePrompt}
                  onChange={e => setRulePrompt(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Save Operating Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
