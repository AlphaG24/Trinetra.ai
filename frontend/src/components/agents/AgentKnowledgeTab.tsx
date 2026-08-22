import { useState, useEffect } from 'react'
import { Upload, BookOpen, Trash2, HelpCircle, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { LockedFeature } from './LockedFeature'
import { toast } from 'sonner'

interface DocumentItem {
  id: string
  name: string
  status: 'processing' | 'ready' | 'failed'
  created_at: string
}

interface AgentKnowledgeTabProps {
  agent: any
  unlocked: boolean
  upgradeUrl: string
}

export function AgentKnowledgeTab({ agent, unlocked, upgradeUrl }: AgentKnowledgeTabProps) {
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [queryText, setQueryText] = useState('')
  const [queryResponse, setQueryResponse] = useState('')
  const [isQuerying, setIsQuerying] = useState(false)

  const supabase = createClient()
  const agentId = agent.id

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('agent_knowledge')
        .select('id, name, status, created_at')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocs(data || [])
    } catch (err: any) {
      console.error('Failed to load documents:', err)
      toast.error('Failed to load documents from database')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (unlocked && agentId) {
      fetchDocuments()
    }
  }, [unlocked, agentId])

  useEffect(() => {
    const hasProcessing = docs.some(d => d.status === 'processing')
    if (hasProcessing) {
      const timer = setInterval(() => {
        fetchDocuments()
      }, 3000)
      return () => clearInterval(timer)
    }
  }, [docs])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['.pdf', '.docx', '.txt']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!allowedTypes.includes(ext)) {
      toast.error('Only PDF, DOCX, and TXT files are allowed.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("agent_id", agentId)

      const res = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) throw new Error(await res.text())

      toast.success('Document uploaded successfully. Parsing in progress...')
      fetchDocuments()
    } catch (err: any) {
      toast.error('Failed to upload document: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDoc = async (id: string) => {
    try {
      const res = await fetch(`/api/knowledge/documents/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error(await res.text())

      toast.success('Document deleted')
      setDocs(prev => prev.filter(d => d.id !== id))
    } catch (err: any) {
      toast.error('Failed to delete document: ' + err.message)
    }
  }

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!queryText.trim()) return

    if (docs.length === 0) {
      toast.error('Please upload at least one document to query the knowledge base.')
      return
    }

    setIsQuerying(true)
    setQueryResponse('')

    try {
      const res = await fetch('/api/knowledge/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          agent_id: agentId
        })
      })

      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setQueryResponse(data.answer || data.response || 'No response returned.')
    } catch (err: any) {
      toast.error("Failed to query knowledge base: " + err.message)
    } finally {
      setIsQuerying(false)
    }
  }

  if (!unlocked) {
    return (
      <LockedFeature
        title="Knowledge Base"
        description="Train your agent with your business documents, FAQs, and product information so it can answer customer inquiries accurately."
        upgradeUrl={upgradeUrl}
      />
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* Document List (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold font-display text-[var(--heading)] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-violet-400" /> Uploaded Training Materials
              </h2>
              <button
                onClick={fetchDocuments}
                className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--hover-bg)]/20 transition-colors"
                title="Refresh Documents"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[var(--muted)]" />
              </button>
            </div>

            {/* Upload Area */}
            <div className="border border-dashed border-[var(--border)] rounded-xl p-8 text-center bg-[var(--background)]/20 flex flex-col items-center justify-center gap-3">
              <Upload className="w-8 h-8 text-[var(--muted)]" />
              <div>
                <input
                  type="file"
                  id="kb-file-input"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <label
                  htmlFor="kb-file-input"
                  className="px-5 py-2.5 bg-[var(--primary-bg)] border border-[var(--border)] text-[var(--heading)] hover:bg-[var(--hover-bg)] text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-all inline-block shadow-sm"
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </label>
              </div>
              <p className="text-[10px] text-[var(--muted)] leading-relaxed max-w-[240px] mx-auto">
                Support PDF, DOCX, and TXT files up to 25MB. Files are automatically split, embedded, and indexed.
              </p>
            </div>

            {/* File List */}
            <div className="space-y-3">
              {loading ? (
                <div className="py-12 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-500" /> Loading documents...
                </div>
              ) : docs.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--body)]">
                  Upload documents about your business. Your agent will use them to answer customer questions.
                </div>
              ) : (
                docs.map((doc) => {
                  const isReady = doc.status === 'ready'
                  const isFailed = doc.status === 'failed'

                  return (
                    <div
                      key={doc.id}
                      className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]/40 hover:bg-[var(--hover-bg)]/20 transition-all flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-[var(--heading)] font-sans truncate max-w-[200px] sm:max-w-xs">
                          {doc.name}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isReady ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-500 tracking-wider">
                                <CheckCircle2 className="w-3 h-3" /> Ready — your agent will use this knowledge
                              </span>
                              <span className="text-[10px] text-[var(--muted)]">Documents are automatically included in your agent's responses. No save needed.</span>
                            </div>
                          ) : isFailed ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-red-500 tracking-wider">
                              <AlertCircle className="w-3 h-3" /> Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-500 tracking-wider animate-pulse">
                              <Loader2 className="w-3 h-3 animate-spin" /> Extracting text...
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Q&A Playground (2 cols) */}
        <div className="lg:col-span-2">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-sm space-y-6 text-left">
            <div className="space-y-2">
              <h3 className="text-lg font-bold font-display text-[var(--heading)] flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-violet-400" /> Q&A Playground
              </h3>
              <p className="text-xs text-[var(--muted)] font-sans leading-relaxed">
                Test your agent's knowledge retrieval by asking questions. Responses are dynamically generated from your uploaded materials.
              </p>
            </div>

            <form onSubmit={handleAskQuestion} className="space-y-4">
              <div className="space-y-2">
                <textarea
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder={docs.length === 0 ? "Upload documents to enable Q&A" : "Ask a question about your documents..."}
                  rows={4}
                  required
                  disabled={docs.length === 0}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)] font-sans resize-none disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={isQuerying || docs.length === 0}
                className="w-full py-3.5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-montserrat font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isQuerying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask Assistant'}
              </button>
            </form>

            {queryResponse && (
              <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 space-y-2">
                <h4 className="text-[10px] uppercase tracking-wider font-montserrat font-bold text-[var(--muted)]">Answer:</h4>
                <p className="text-xs font-sans text-[var(--body)] leading-relaxed whitespace-pre-wrap">
                  {queryResponse}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
