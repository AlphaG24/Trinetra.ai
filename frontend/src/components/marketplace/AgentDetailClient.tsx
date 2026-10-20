'use client'

import { ToolDetailClient } from './ToolDetailClient'

interface AgentDetailClientProps {
  service?: any
  tool?: any
  config?: Record<string, string>
  profile?: any
  agents?: any[]
}

/**
 * AgentDetailClient
 * Re-exports the unified ToolDetailClient dashboard layout.
 * Ensures compatibility across Next.js HMR, dev server cache, and route transitions.
 */
export function AgentDetailClient(props: AgentDetailClientProps) {
  const tool = props.tool || props.service || {}
  return (
    <ToolDetailClient 
      tool={tool} 
      profile={props.profile} 
      config={props.config || {}} 
      agents={props.agents || []} 
    />
  )
}

export default AgentDetailClient
