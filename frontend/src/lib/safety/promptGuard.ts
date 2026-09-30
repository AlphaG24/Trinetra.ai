/**
 * Prompt Guard: AI Transparency & Truthfulness (Frontend Validation)
 * ===================================================================
 * Enforces compliance with AI disclosure mandates.
 * Prohibits prompts that instruct agents to deny being an AI or claim to be human.
 */

export const FORBIDDEN_DECEPTIVE_PATTERNS = [
  /\b(?:never|don'?t|do\s+not)\s+(?:reveal|tell|say|disclose|admit)\s+(?:that\s+)?(?:you\s+are|you'?re|being|to\s+be)\s+(?:an?\s+)?(?:ai|bot|robot|artificial|virtual|machine|automated)\b/i,
  /\b(?:never|don'?t|do\s+not)\s+(?:say|mention)\s+(?:that\s+)?you\s+are\s+(?:an?\s+)?(?:ai|bot|robot)\b/i,
  /\b(?:pretend|claim|insist|convince|act\s+as\s+if)\s+(?:to\s+be|that\s+you\s+are|you'?re)\s+(?:a\s+)?(?:real\s+)?(?:human|person|flesh\s+and\s+blood|living\s+human)\b/i,
  /\b(?:if\s+asked\s+if\s+you\s+are\s+(?:ai|bot|robot|human))\s*[,:]?\s*(?:say\s+no|deny|say\s+human|claim\s+human|do\s+not\s+admit)\b/i,
  /\b(?:deny|refuse\s+to\s+admit)\s+(?:being|that\s+you\s+are)\s+(?:an?\s+)?(?:ai|bot|robot)\b/i,
  /\b(?:say|tell\s+them)\s+(?:you\s+are|you'?re)\s+(?:a\s+real\s+person|a\s+human\s+being|not\s+(?:an?\s+)?ai)\b/i,
  /\b(?:kabhi\s+(?:bhi\s+)?mat\s+batana|mat\s+batao|mat\s+kehna|kabhi\s+reveal\s+mat\s+karo)\s+ki\s+(?:tum|aap)\s+(?:ai|bot|robot)\s+ho\b/i,
  /\b(?:bolo\s+ki\s+tum\s+insan\s+ho|insaan\s+hone\s+ka\s+natak|main\s+insaan\s+hoon\s+bolna)\b/i,
  /\b(?:agar\s+koi\s+pooche\s+ki\s+ai\s+ho\s+toh\s+mana\s+kar\s+dena)\b/i,
];

export function validatePromptAiSafety(promptText: string): { isValid: boolean; violations: string[] } {
  if (!promptText || typeof promptText !== 'string') {
    return { isValid: true, violations: [] };
  }

  const violations: string[] = [];
  for (const pattern of FORBIDDEN_DECEPTIVE_PATTERNS) {
    const match = promptText.match(pattern);
    if (match) {
      violations.push(match[0]);
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

export function sanitizePromptDeception(promptText: string): string {
  if (!promptText || typeof promptText !== 'string') return '';
  let cleaned = promptText;
  for (const pattern of FORBIDDEN_DECEPTIVE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned.trim();
}
