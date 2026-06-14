'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Phone, Check, Copy, Share2, Square } from 'lucide-react'
import Vapi from '@vapi-ai/web'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000"

export function VoiceDemo({
  agentPhone,
  disabled = false,
  assignedVapiAgentId = null,
  onCallStarted,
  onCallEnded
}: {
  agentPhone: string
  disabled?: boolean
  assignedVapiAgentId?: string | null
  onCallStarted?: (minutesUsed: number, minutesLimit: number) => void
  onCallEnded?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [callState, setCallState] = useState<'idle' | 'calling' | 'active' | 'ended'>('idle')
  const [secondsConnected, setSecondsConnected] = useState<number>(0)

  const vapiRef = useRef<Vapi | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const copyPhone = () => {
    navigator.clipboard.writeText(agentPhone)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const startBrowserCall = async () => {
    console.log("1. Button Clicked! Current state:", { disabled, callState });

    if (disabled) {
      console.log("ABORT: Button is disabled (Quota reached or prop passed as true).");
      return;
    }

    if (callState !== 'idle' && callState !== 'ended') {
      console.log("ABORT: callState is not idle/ended. Current state:", callState);
      return;
    }

    console.log("2. Guard checks passed. Authenticating user...");
    setCallState('calling')

    try {
      // 1. Authenticate user
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      console.log("3. Auth result:", { userId: user?.id, error: authError });

      if (authError || !user || !user.id || user.id === 'undefined' || user.id === 'null') {
        toast.error("Authentication required to make demo calls.")
        setCallState('idle')
        return
      }

      const userId = user.id

      // 1. Fetch credentials from backend
      const apiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      console.log("Target Backend URL:", apiUrl);

      const response = await fetch(`${apiUrl}/api/voice/start-demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: userId,
          assigned_vapi_agent_id: assignedVapiAgentId
        }),
      });

      if (response.status === 403) {
        toast.error("Trial limit reached! Please upgrade to continue.", {
          description: "Purchase full access or book an appointment to deploy your own agent."
        })
        onCallStarted?.(20, 20)
        setCallState('idle')
        return
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Backend Error ${response.status}: ${errText}`);
      }

      const data = await response.json();

      // Update quota in parent
      onCallStarted?.(data.minutes_used ?? 0, data.minutes_limit ?? 20)

      // Double check limits before starting the call
      // --- THE FIX: ENV PRIORITY & SANITIZATION ---
      console.log("3. Resolving Credentials...");
      const rawApiKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || data.api_key;
      const rawAgentId = assignedVapiAgentId || process.env.NEXT_PUBLIC_VAPI_AGENT_ID || data.agent_id;
      
      if (!rawApiKey || !rawAgentId) {
        throw new Error("CRITICAL: Missing Vapi credentials in both ENV and Database.");
      }

      const finalApiKey = rawApiKey.trim();
      const finalAgentId = rawAgentId.trim();

      console.log("Using API Key starting with:", finalApiKey.substring(0, 5) + "...");
      console.log("Using Agent ID:", finalAgentId);

      console.log("4. Starting Vapi Connection...");
      
      // Instantiate Vapi cleanly
      const vapiInstance = new Vapi(finalApiKey);
      vapiRef.current = vapiInstance;

      // Attach Listeners
      vapiInstance.on('call-start', () => {
        setCallState('active')
        setSecondsConnected(0)
        toast.success("Voice call connected!")
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
          setSecondsConnected(prev => prev + 1)
        }, 1000)
      })

      vapiInstance.on('call-end', () => {
        setCallState('ended')
        toast.success("Voice call ended.")
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        vapiInstance.removeAllListeners()
        if (vapiRef.current === vapiInstance) vapiRef.current = null
        onCallEnded?.()
        setTimeout(() => setCallState('idle'), 3000)
      })

      vapiInstance.on('error', (err) => {
        console.error("/// VAPI ERROR EVENT TRIGGERED ///");
        console.error("Raw Error:", err);
        try {
          console.error("Vapi Error Event Detailed:", JSON.stringify(err, null, 2));
        } catch (e) {
          console.error("Vapi Error Event Detailed (non-JSON):", String(err));
        }
        let errorMsg = "Voice connection failed.";
        
        if (err && typeof err === 'object') {
          try {
            console.error("Detailed Stringified Error:", JSON.stringify(err, null, 2));
          } catch (e) {
            console.error("Could not stringify error object:", e);
          }
          
          const msg = (err as any).message || (err as any).error?.message || (err as any).errorMsg || (err as any).error;
          if (msg && typeof msg === 'string') {
            errorMsg = msg;
          }
        } else if (typeof err === 'string') {
          errorMsg = err;
        }
        
        toast.error(`Voice connection failed: ${errorMsg}`);
        setCallState('idle')
        if (timerRef.current) clearInterval(timerRef.current)
        vapiInstance.removeAllListeners()
        if (vapiRef.current === vapiInstance) vapiRef.current = null
      })

      const sanitizedUserId = userId || "anonymous"
      const sanitizedUserEmail = user.email || "no-email"

      // 5. Start the call and pass the user ID and user email context
      await vapiInstance.start(finalAgentId, {
        metadata: {
          userId: sanitizedUserId,
          userEmail: sanitizedUserEmail
        },
        variableValues: {
          user_id: sanitizedUserId,
          user_email: sanitizedUserEmail
        }
      });
      console.log("5. Vapi Connection Request Sent Successfully!");

    } catch (error: any) {
      console.error("Connection Sequence Failed:", error);
      try {
        console.error("Connection Sequence Failed Detailed:", JSON.stringify(error, null, 2));
      } catch (e) {
        console.error("Connection Sequence Failed Detailed (non-JSON):", String(error));
      }
      toast.error("Failed to connect to the voice server.")
      setCallState('idle')
    }
  }

  const endBrowserCall = () => {
    if (vapiRef.current) {
      try {
        vapiRef.current.stop()
      } catch (err) {
        console.warn("[VoiceDemo] Error stopping call:", err)
        setCallState('ended')
        setTimeout(() => setCallState('idle'), 3000)
      }
    } else {
      setCallState('idle')
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (vapiRef.current) {
        try {
          vapiRef.current.stop()
        } catch { }
        vapiRef.current.removeAllListeners()
      }
    }
  }, [])

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* Option A: Browser Call */}
      <div className="bg-[#0f1117]/90 border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Mic className="w-5 h-5 text-purple-400" />
          Test from Browser
        </h3>
        <p className="text-sm text-white/60 mb-6">
          No phone needed - talk directly through your computer&apos;s microphone.
        </p>

        <div className="mt-auto">
          {callState === 'idle' && (
            <button
              onClick={startBrowserCall}
              disabled={disabled || callState !== 'idle'}
              className="relative z-10 w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:border disabled:border-zinc-700 disabled:shadow-none"
            >
              <Mic className="w-4 h-4" /> Start Test Call
            </button>
          )}

          {callState === 'calling' && (
            <button disabled className="w-full py-3 px-4 bg-white/10 text-white/50 font-semibold rounded-xl flex items-center justify-center gap-2 cursor-wait">
              <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
              Connecting to agent...
            </button>
          )}

          {callState === 'active' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm text-red-400 font-medium">● Recording</span>
                </div>
                <span className="text-sm font-mono text-white">{formatTime(secondsConnected)}</span>
              </div>
              <button
                onClick={endBrowserCall}
                className="w-full py-3 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Square className="w-4 h-4 fill-current" /> End Call
              </button>
            </div>
          )}

          {callState === 'ended' && (
            <button disabled className="w-full py-3 px-4 bg-green-500/20 text-green-500 font-semibold rounded-xl flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> Call Ended Successfully
            </button>
          )}
        </div>
      </div>

      {/* Option B: Direct Phone Call */}
      <div className="bg-[#0f1117]/90 border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Phone className="w-5 h-5 text-amber-500" />
          Call directly
        </h3>
        <p className="text-sm text-white/60 mb-6">
          Dial this number from any phone to test exactly what your customers experience.
        </p>

        <div className="mt-auto space-y-3">
          <div className="w-full py-4 px-4 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between">
            <span className="text-2xl font-mono tracking-widest text-white">{agentPhone}</span>
            <button
              onClick={copyPhone}
              className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
              title="Copy number"
            >
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          <a
            href={`https://wa.me/?text=Test+my+AI+agent:+${encodeURIComponent(agentPhone)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-amber-500/30"
          >
            <Share2 className="w-4 h-4" /> Share on WhatsApp
          </a>
        </div>
      </div>

    </div>
  )
}
