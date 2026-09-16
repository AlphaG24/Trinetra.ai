/**
 * Strips bracketed slugs (e.g. [sales_agent], [multi_agent]) and demo tags
 * so that only the clean, human-readable agent name is displayed across the platform.
 */
export function cleanAgentName(name?: string | null): string {
  if (!name || typeof name !== 'string') return 'Voice Agent';
  return name
    .replace(/^\[[^\]]+\]\s*/, '')   // Remove [slug] prefix like [sales_agent]
    .replace(/\s*-\s*Demo\s*$/i, '') // Remove - Demo suffix
    .replace(/\s*-\s*Trial\s*$/i, '') // Remove - Trial suffix
    .trim() || 'Voice Agent';
}
