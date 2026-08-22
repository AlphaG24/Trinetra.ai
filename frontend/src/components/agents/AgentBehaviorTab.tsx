import { useState } from 'react'
import { Brain, Sliders, MessageSquare, ShieldAlert, Loader2, RotateCcw } from 'lucide-react'
import { LockedFeature } from './LockedFeature'
import { toast } from 'sonner'
import { PersonalitySelector } from './PersonalitySelector'

interface AgentBehaviorTabProps {
  agent: any
  unlocked: boolean
  upgradeUrl: string
}

export function AgentBehaviorTab({ agent, unlocked, upgradeUrl }: AgentBehaviorTabProps) {
  // Split system prompt into Core Prompt and Additional Instructions
  const fullPrompt = agent.system_prompt || ''
  const marker = "## ADDITIONAL INSTRUCTIONS"
  const markerIndex = fullPrompt.toUpperCase().indexOf(marker.toUpperCase())
  
  const corePrompt = markerIndex !== -1 ? fullPrompt.substring(0, markerIndex).trim() : fullPrompt.trim()
  const initialAdditional = markerIndex !== -1 ? fullPrompt.substring(markerIndex + marker.length).trim() : ''

  const [additionalInstructions, setAdditionalInstructions] = useState(initialAdditional)
  const [temperature, setTemperature] = useState(agent.temperature ?? 0.7)
  const [maxTokens, setMaxTokens] = useState(agent.max_tokens ?? 250)
  const [fallbackMessage, setFallbackMessage] = useState(agent.fallback_message || 'Mujhe yeh samajh nahi aaya, kripya dubara bataiye.')
  const [greetingMessage, setGreetingMessage] = useState(agent.greeting_message || agent.welcome_message || 'Hello!')
  const [endingMessage, setEndingMessage] = useState(agent.ending_message || 'Dhanyavad ji, aapse baat karke accha laga. Goodbye!')

  const [saving, setSaving] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleEnhancePrompt = async () => {
    const userInput = window.prompt("What custom behavior or instructions would you like to add?");
    if (!userInput) return;
    
    setEnhancing(true)
    try {
      const res = await fetch('/api/agents/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description: userInput,
          agent_type: agent.agent_type,
          mode: 'prompt',
          current_prompt: additionalInstructions
        })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to enhance prompt')
      
      setAdditionalInstructions(data.enhanced_prompt)
      toast.success('Instructions enhanced successfully')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message)
    } finally {
      setEnhancing(false)
    }
  }

  // Save behavior configurations to the PATCH endpoint
  const handleSaveBehavior = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    let finalGreeting = greetingMessage;
    let finalFallback = fallbackMessage;
    let finalEnding = endingMessage;

    toast.info('Auto-enhancing messages for TTS...');
    try {
      const enhanced = await fetch('/api/agents/enhance-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          greeting: greetingMessage,
          fallback: fallbackMessage,
          ending: endingMessage
        })
      });
      const enhancedData = await enhanced.json();
      finalGreeting = enhancedData.enhanced_greeting || greetingMessage;
      finalFallback = enhancedData.enhanced_fallback || fallbackMessage;
      finalEnding = enhancedData.enhanced_ending || endingMessage;
      
      setGreetingMessage(finalGreeting);
      setFallbackMessage(finalFallback);
      setEndingMessage(finalEnding);
    } catch (err) {
      console.error("Auto-enhance failed", err);
    }

    // Reconstruct full prompt: Core Prompt + Additional Instructions
    const reconstructedPrompt = additionalInstructions.trim() 
      ? `${corePrompt}\n\n## ADDITIONAL INSTRUCTIONS\n${additionalInstructions.trim()}`
      : corePrompt;

    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: reconstructedPrompt,
          temperature,
          max_tokens: maxTokens,
          fallback_message: finalFallback,
          greeting_message: finalGreeting,
          ending_message: finalEnding
        })
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }
      toast.success('Agent behavior and prompt configuration synced!')
    } catch (err: any) {
      console.error('Failed to update agent behavior:', err)
      toast.error('Failed to save behavior settings: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleResetBehavior = async () => {
    if (!window.confirm("WARNING: This will reset all behavior settings, prompt directives, and greetings for this agent to factory defaults. Your custom instructions and modifications will be permanently deleted. Do you want to proceed?")) {
      return
    }
    setResetting(true)
    try {
      const res = await fetch(`/api/agents/${agent.id}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_type: 'behavior' })
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("Behavior settings reset successfully!")
      window.location.reload()
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to reset behavior: " + err.message)
    } finally {
      setResetting(false)
    }
  }

  if (!unlocked) {
    return (
      <LockedFeature
        title="Behavior & Instructions"
        description="Fine-tune your assistant's system instructions, response randomness (temperature), greeting/fallback sequences, and behavioral personality traits."
        upgradeUrl={upgradeUrl}
      />
    )
  }

  return (
    <form onSubmit={handleSaveBehavior} className="space-y-8 animate-in fade-in duration-300 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* Core Directives & Prompts (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold font-display text-[var(--heading)] flex items-center gap-2">
                <Brain className="w-5 h-5 text-violet-400" /> Behavioral Instructions
              </h2>
              <span className="text-[10px] text-[var(--muted)] font-mono">
                {additionalInstructions.length} chars
              </span>
            </div>

            {/* Read-Only Status Card */}
            <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--heading)]">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <span>Base Agent Personality Locked</span>
              </div>
              <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                The core prompt defining the agent's identity, conversational guardrails, Hinglish speaking rules, and workflow is active and protected. You can add specific rules, scripts, or details in the box below.
              </p>
            </div>

            {/* Prompt Textarea */}
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold uppercase tracking-wider font-montserrat text-[var(--muted)]">
                  Add Additional Instructions
                </label>
                <button
                  type="button"
                  onClick={handleEnhancePrompt}
                  disabled={enhancing || resetting}
                  className="text-[10px] bg-violet-500 hover:bg-violet-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {enhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                  Enhance with AI
                </button>
              </div>
              <textarea
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                placeholder="e.g. Always offer a 10% discount if the caller objects to the price. Or: If they want to meet Dr. Gupta, specify he only visits on Wednesdays."
                rows={12}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)] font-mono leading-relaxed resize-none"
              />
              <p className="text-[10px] text-[var(--muted)] font-sans">
                Define specific business logic, custom FAQs, schedules, or instructions for handling caller objections.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || resetting}
                className="px-6 py-3.5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-montserrat font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 hover:scale-[1.01] shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Core Logic'}
              </button>

              <button
                type="button"
                onClick={handleResetBehavior}
                disabled={saving || resetting}
                className="px-6 py-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-montserrat font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset to Default'}
              </button>
            </div>
          </div>
        </div>

        {/* Settings & Messaging (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Settings Card */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
            <h3 className="text-lg font-bold font-display text-[var(--heading)] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-violet-400" /> Model Hyperparameters
            </h3>
            
            <p className="text-xs text-[var(--muted)] bg-[var(--background)] p-4 rounded-xl border border-[var(--border)]">
              Advanced AI settings are configured automatically for optimal performance.
            </p>
          </div>

          {/* Quick Sequences */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
            <h3 className="text-lg font-bold font-display text-[var(--heading)] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-violet-400" /> Messaging Fallbacks
            </h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider font-montserrat text-[var(--muted)]">Greeting Message</label>
                <input
                  type="text"
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  placeholder="e.g. Hello, thanks for calling!"
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)] font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider font-montserrat text-[var(--muted)]">Default Fallback message</label>
                <input
                  type="text"
                  value={fallbackMessage}
                  onChange={(e) => setFallbackMessage(e.target.value)}
                  placeholder="e.g. Can you please repeat that?"
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)] font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider font-montserrat text-[var(--muted)]">Call Ending Message</label>
                <input
                  type="text"
                  value={endingMessage}
                  onChange={(e) => setEndingMessage(e.target.value)}
                  placeholder="Dhanyavad ji, aapse baat karke accha laga. Goodbye!"
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)] font-sans"
                />
              </div>
            </div>
          </div>

          {/* Multi-Personality Selector */}
          <PersonalitySelector
            agentId={agent.id}
            initialPersonalities={agent.personalities || null}
          />

        </div>

      </div>
    </form>
  )
}
