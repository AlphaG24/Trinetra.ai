'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Play, Pause, FileText, Database, ShieldAlert, Sparkles, Sliders, Settings, 
  Terminal, Activity, ArrowRight, Phone, MessageSquare, Share2, Copy, Check, RefreshCw, Download, ExternalLink
} from 'lucide-react'
import { VoiceDemo } from '../demo/VoiceDemo'
import { TranscriptModal } from '../modals/TranscriptModal'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { toast } from 'sonner'

interface Tool {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  icon_url: string | null
  subdomain_url: string | null
  ui_config: any
  created_at: string
  is_active: boolean
  is_visible_in_marketplace: boolean
  is_demo_allowed: boolean
  demo_limit_config: any
  marketplace_metadata: any
}

interface Quota {
  user_id: string
  service_slug: string
  usage_metric_type: string
  quota_allocated: number
  quota_used: number
}

interface AnalyticsLog {
  id: string
  service_slug: string
  user_id: string
  status: string
  event_data: any
  created_at: string
}

interface WorkspaceClientProps {
  tool: Tool
  quota: Quota
  slug: string
  user: {
    id: string
    email?: string
  }
  logs: AnalyticsLog[]
}

// Format created_at to localized format
const formatCreatedAt = (dateString: string) => {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const yesterday = new Date()
    yesterday.setDate(now.getDate() - 1)
    const isYesterday = date.toDateString() === yesterday.toDateString()
    const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true }
    const timeStr = date.toLocaleTimeString('en-US', options)
    if (isToday) return `Today, ${timeStr}`
    if (isYesterday) return `Yesterday, ${timeStr}`
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`
  } catch {
    return dateString
  }
}

export function WorkspaceClient({ tool, quota, slug, user, logs }: WorkspaceClientProps) {
  const router = useRouter()

  // ----------------------------------------------------
  // RENDER DYNAMIC CANVAS BY SLUG
  // ----------------------------------------------------
  switch (slug) {
    case 'anika-voice':
      return <VoiceWorkspace tool={tool} quota={quota} user={user} logs={logs} router={router} />
    
    case 'structurer':
      return <ExternalDataWorkspace tool={tool} quota={quota} user={user} logs={logs} router={router} />
    
    default:
      return (
        <div className="flex-grow flex items-center justify-center py-8 w-full animate-in fade-in zoom-in-95 duration-500">
          <Card className="max-w-md w-full border-zinc-800 bg-[#0f1117]/80 backdrop-blur-md rounded-2xl p-8 text-center relative overflow-hidden">
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 mb-4">
              <Sliders className="w-8 h-8" />
            </div>
            <CardHeader className="p-0 space-y-2">
              <CardTitle className="text-xl font-bold text-white">Module configuration pending</CardTitle>
              <CardDescription className="text-zinc-400 text-xs leading-relaxed max-w-xs mx-auto">
                This agent's interactive workspace module is currently under development or requires additional provisioning.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )
  }
}

// ============================================================================
// VOICE WORKSPACE COMPONENT (ANIKA)
// ============================================================================
interface VoiceWorkspaceProps {
  tool: Tool
  quota: Quota
  user: { id: string; email?: string }
  logs: AnalyticsLog[]
  router: any
}

function VoiceWorkspace({ tool, quota, user, logs, router }: VoiceWorkspaceProps) {
  const [selectedCall, setSelectedCall] = useState<AnalyticsLog | null>(null)

  return (
    <div className="space-y-8 w-full">
      <div className="bg-[var(--bg-surface)]/30 border border-zinc-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" /> Deployed Sandbox: {tool.name}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            You are inside the isolated demo sandbox. Free limit remains active.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-lg text-xs font-semibold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Live Connection
          </span>
        </div>
      </div>

      {/* Voice Interface Controls */}
      <VoiceDemo 
        agentPhone="+1 (341) 441-8499" 
        disabled={quota.quota_used >= quota.quota_allocated}
        assignedVapiAgentId={tool.marketplace_metadata?.assigned_vapi_agent_id || null}
        onCallStarted={() => {
          router.refresh()
        }}
        onCallEnded={() => {
          setTimeout(() => {
            router.refresh()
          }, 3000)
          setTimeout(() => {
            router.refresh()
          }, 7000)
        }}
      />

      {/* Recent Test History Table */}
      <section className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          Recent Test History
        </h2>
        <div className="bg-[#0f1117]/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 uppercase bg-white/[0.02] border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date/Time</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Duration</th>
                  <th className="px-6 py-4 font-semibold">Sentiment</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Transcript Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 font-mono text-sm">
                      No recent executions found. Start a call above to begin!
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const rawDuration = log.event_data?.duration || log.event_data?.call_duration || 0
                    const mins = Math.floor(rawDuration / 60)
                    const secs = Math.floor(rawDuration % 60)
                    const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`

                    const rawSentiment = log.event_data?.sentiment || 'Neutral'
                    const sentimentStr = rawSentiment.toLowerCase().includes('positive') ? '😊 Positive' :
                                         rawSentiment.toLowerCase().includes('negative') ? '😢 Negative' : '😐 Neutral'

                    return (
                      <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-6 py-4 font-medium text-white">
                          {formatCreatedAt(log.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400">
                            Voice
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-300">
                          {durationStr}
                        </td>
                        <td className="px-6 py-4 text-zinc-300">
                          {sentimentStr}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            log.status === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setSelectedCall(log)}
                            className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all inline-flex items-center gap-1 text-xs"
                            title="View Transcript"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Transcript Terminal Modal */}
      <TranscriptModal
        isOpen={selectedCall !== null}
        onClose={() => setSelectedCall(null)}
        transcript={selectedCall?.event_data?.transcript || "Voice sandbox execution log fetched successfully. No extended transcript registered for this run."}
        recordingUrl={selectedCall?.event_data?.recording_url || null}
        callerName="Voice Sandbox Execution"
      />
    </div>
  )
}

// ============================================================================
// EXTERNAL DATA WORKSPACE COMPONENT (STRUCTURER)
// ============================================================================
interface ExternalDataWorkspaceProps {
  tool: Tool
  quota: Quota
  user: { id: string }
  logs: AnalyticsLog[]
  router: any
}

function ExternalDataWorkspace({ tool, quota, user, logs, router }: ExternalDataWorkspaceProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Safe URL Construction to prevent fatal page crashes
  const finalLaunchUrl = useMemo(() => {
    let rawUrl = process.env.NEXT_PUBLIC_STRUCTURER_URL || tool.marketplace_metadata?.subdomain_url || tool.subdomain_url;
    
    if (!rawUrl) {
      console.error("Structurer URL environment variable (NEXT_PUBLIC_STRUCTURER_URL) is missing, and no tool metadata fallback exists. Using default fallback.");
      rawUrl = 'https://structurer.trinetraedu-ai.com';
    } else {
      rawUrl = rawUrl.trim();
    }
    
    // Ensure rawUrl has correct protocol prefix
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = `https://${rawUrl}`
    }

    try {
      const urlObj = new URL(rawUrl)
      urlObj.searchParams.set('user_id', user.id)
      return urlObj.toString()
    } catch (err) {
      console.error("Safe URL parser failed, performing fallback concatenation:", err)
      const separator = rawUrl.includes('?') ? '&' : '?'
      return `${rawUrl}${separator}user_id=${user.id}`
    }
  }, [tool, user])

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => {
      setIsRefreshing(false)
      toast.success("Sandbox quotas successfully updated.")
    }, 800)
  }

  const handleDownloadJson = (log: AnalyticsLog) => {
    toast.success("Downloading processed document JSON payload...")
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(log.event_data, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `structurer_output_${log.id}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return (
    <div className="space-y-8 w-full animate-in fade-in duration-500">
      
      {/* Top - Sleek, Minimalist Banner */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border border-zinc-800 bg-[#0f1117]/60 backdrop-blur-md rounded-2xl p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-4 text-left">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
            <ExternalLink className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">External Compute Environment</h4>
            <p className="text-xs text-zinc-400 mt-0.5">Trinetra Structurer requires a dedicated secure node.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800/80 font-medium text-xs px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Quotas
          </button>
          <a
            href={finalLaunchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border border-violet-400/20 shadow-[0_0_20px_rgba(139,92,246,0.25)] text-white font-semibold tracking-wide uppercase text-xs px-6 py-2.5 rounded-xl text-center transition-all duration-200 flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            Launch Console ↗
          </a>
        </div>
      </div>

      {/* Bottom - History Table */}
      <section className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          Recent OCR Executions
        </h2>
        <div className="bg-[#0f1117]/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 uppercase bg-white/[0.02] border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date/Time</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Document Output</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Payload Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 font-mono text-sm">
                      No recent executions found. Launch the console to process data.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const docOutput = log.event_data?.document_name || 
                                      (log.event_data?.rows_processed ? `${log.event_data.rows_processed} rows processed` : '') || 
                                      'Processed Document Output'

                    return (
                      <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-6 py-4 font-medium text-white">
                          {formatCreatedAt(log.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400">
                            OCR
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-300 font-medium">
                          {docOutput}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            log.status === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDownloadJson(log)}
                            className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all inline-flex items-center gap-1 text-xs"
                            title="Download JSON Payload"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download JSON
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </div>
  )
}
