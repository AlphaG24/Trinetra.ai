import { useState } from 'react'
import { 
  BookOpen, PhoneCall, HelpCircle, Plug, BarChart2, CheckCircle2, Copy, Check
} from 'lucide-react'

export function AgentSetupGuide({ agent }: { agent: any }) {
  const [copiedText, setCopiedText] = useState<string | null>(null)
  
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(id)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const forwardingCodes = [
    { provider: 'Airtel', code: '*21*{{number}}#', notes: 'Dial from your mobile to forward all calls.' },
    { provider: 'VI (Vodafone Idea)', code: '**21*{{number}}#', notes: 'Dial from your mobile to forward all calls.' },
    { provider: 'BSNL', code: '*21*{{number}}#', notes: 'Dial from your mobile to forward all calls.' },
    { provider: 'Jio', code: 'Jio Call Forwarding', notes: 'Go to MyJio App → Call Settings → Call Forwarding, or dial *401*{number}' }
  ]

  const agentNumber = agent?.phone_number || '+91 XXXXX XXXXX'

  return (
    <div className="space-y-6 text-left max-w-4xl animate-in fade-in duration-300">
      <div className="pb-4 border-b border-zinc-200 dark:border-white/5">
        <h2 className="text-xl font-bold font-display text-zinc-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-violet-500" /> Agent Documentation & Setup Guide
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Learn how to connect phone numbers, configure forwarding, and launch automated campaigns.
        </p>
      </div>

      {/* Grid sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Getting Started */}
        <div className="bg-white dark:bg-[#0D0120] border border-zinc-200 dark:border-white/5 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center text-xs text-violet-500 font-bold">1</span>
            Getting Started
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Verify your agent behaves correctly by making a quick test call. Click the <strong>"Try Demo"</strong> button to test the conversation flow directly inside your web browser using Web-RTC sandbox simulation.
          </p>
          <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-3 border border-zinc-100 dark:border-white/5 text-[11px] text-zinc-500 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Web Sandbox Features
            </div>
            <p>• Zero calling charges or latency</p>
            <p>• Real-time speech transcription</p>
            <p>• Instantly loads prompt updates</p>
          </div>
        </div>

        {/* Phone Numbers */}
        <div className="bg-white dark:bg-[#0D0120] border border-zinc-200 dark:border-white/5 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center text-xs text-violet-500 font-bold">2</span>
            Phone Numbers Setup
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            To connect your voice agent to the real public telephony network, go to the <strong>Numbers</strong> tab on your dashboard to buy or assign a dedicated phone number to this agent.
          </p>
          <div className="bg-zinc-50 dark:bg-white/5 rounded-xl p-3 border border-zinc-100 dark:border-white/5 text-[11px] text-zinc-500 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Active Assignment
            </div>
            <p>• Outbound calls use this Caller ID</p>
            <p>• Inbound calls automatically ring the agent</p>
          </div>
        </div>

      </div>

      {/* Call Forwarding Section */}
      <div className="bg-white dark:bg-[#0D0120] border border-zinc-200 dark:border-white/5 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <PhoneCall className="w-4 h-4 text-violet-500" /> Call Forwarding Setup (Airtel, Jio, VI, BSNL)
        </h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          If you want your existing business mobile number to route calls directly to your Trinetra AI Voice Agent, set up call forwarding to the agent's virtual phone number: <strong>{agentNumber}</strong>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {forwardingCodes.map((item, idx) => {
            const rawCode = item.code.replace('{{number}}', agentNumber);
            const isCopied = copiedText === `fwd-${idx}`;

            return (
              <div 
                key={idx}
                className="bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 rounded-xl p-4 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{item.provider}</h4>
                  <p className="text-[10px] text-zinc-500 mt-1">{item.notes}</p>
                </div>
                <div className="flex items-center justify-between bg-white dark:bg-[#12101A] border border-zinc-200 dark:border-white/10 rounded-lg p-2 mt-2">
                  <code className="text-xs font-mono text-violet-600 dark:text-violet-400">{rawCode}</code>
                  <button
                    onClick={() => handleCopy(rawCode, `fwd-${idx}`)}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Grid Section 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Integrations */}
        <div className="bg-white dark:bg-[#0D0120] border border-zinc-200 dark:border-white/5 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Plug className="w-4 h-4 text-violet-500" /> Third-Party Integrations
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Dispatch lead events and summaries to CRM platforms (Salesforce, Zoho), get instant alerts on Telegram/WhatsApp, or configure custom Webhooks to forward JSON call logs to your custom servers.
          </p>
        </div>

        {/* Campaigns */}
        <div className="bg-white dark:bg-[#0D0120] border border-zinc-200 dark:border-white/5 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-violet-500" /> Outbound Call Campaigns
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Configure automated batch calling under the <strong>Campaigns</strong> tab. Upload a contact spreadsheet (CSV), map phone columns, and set scheduling parameters. The agent will run calls automatically.
          </p>
        </div>

      </div>

      {/* FAQ Troubleshooting */}
      <div className="bg-white dark:bg-[#0D0120] border border-zinc-200 dark:border-white/5 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-violet-500" /> Frequently Asked Questions (FAQ)
        </h3>
        <div className="space-y-3 pt-2 text-xs text-zinc-600 dark:text-zinc-400">
          <div>
            <h4 className="font-bold text-zinc-900 dark:text-white">Q: How do I change the agent voice language?</h4>
            <p className="mt-1 leading-relaxed">A: Go to the <strong>Voice</strong> tab. Select your preferred primary language (Hinglish, Hindi, or English) and select one of our premium voice speakers.</p>
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-white/5">
            <h4 className="font-bold text-zinc-900 dark:text-white">Q: What happens if a call fails to connect?</h4>
            <p className="mt-1 leading-relaxed">A: Telephony logs are checked instantly. If a call experiences carrier timeouts or gets blocked by DND, the campaign scheduler registers a fail status and schedules an automatic retry.</p>
          </div>
        </div>
      </div>

    </div>
  )
}
