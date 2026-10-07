/**
 * frontend/src/lib/safety/piiScrubber.ts
 *
 * Client-Side PII Sanitizer & External Log Scrubber.
 * Ensures zero inadvertent client telemetry leakage of phone numbers,
 * Aadhaar numbers, JWTs, or auth secrets to Sentry or analytics.
 */

const PHONE_REGEX = /\+91[\s\-]?[6-9]\d{9}|(?<!\d)91[6-9]\d{9}(?!\d)|(?<![\d\+])[6-9]\d{9}(?!\d)|(?<!\d)[6-9]\d{4}[\s\-]\d{5}(?!\d)|(?<!\d)[6-9]\d{2}[\s\-]\d{3}[\s\-]\d{4}(?!\d)/g
const AADHAAR_REGEX = /(?<![\d\+])[2-9]\d{3}[\s\-]\d{4}[\s\-]\d{4}(?!\d)|(?<![\d\+])[2-8]\d{11}(?!\d)/g
const SSN_REGEX = /(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)/g
const JWT_REGEX = /\beyJ[a-zA-Z0-9_\-]{10,}\.eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}\b/g
const BEARER_REGEX = /\bBearer\s+[a-zA-Z0-9_\-\.]{16,}\b/gi
const API_KEY_REGEX = /\b(?:sk|sbp|pk|ak|key)_[a-zA-Z0-9_\-]{16,}\b|\bAIzaSy[a-zA-Z0-9_\-]{33}\b/gi

const SENSITIVE_KEYS = new Set([
  'password', 'secret', 'token', 'access_token', 'refresh_token',
  'authorization', 'api_key', 'apikey', 'service_role_key',
  'supabase_key', 'cookie', 'credit_card', 'cvv', 'card_number', 'aadhaar', 'ssn',
])

export function maskPhone(val: string): string {
  const digitsOnly = val.replace(/\D/g, '')
  if (digitsOnly.length < 10) return '[REDACTED_PHONE]'

  const prefix = val.startsWith('+91') || (val.startsWith('91') && digitsOnly.length === 12)
    ? '+91 '
    : (val.startsWith('+') ? '+' : '')

  const d10 = digitsOnly.slice(-10)
  if (d10.length === 10) {
    return `${prefix}${d10.slice(0, 2)}******${d10.slice(-2)}`
  }
  return '[REDACTED_PHONE]'
}

export function maskAadhaar(val: string): string {
  const digits = val.replace(/\D/g, '')
  if (digits.length === 12) {
    return `XXXX-XXXX-${digits.slice(-4)}`
  }
  return '[REDACTED_AADHAAR]'
}

export function maskSSN(val: string): string {
  const digits = val.replace(/\D/g, '')
  if (digits.length === 9) {
    return `***-**-${digits.slice(-4)}`
  }
  return '[REDACTED_SSN]'
}

export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return text

  return text
    .replace(BEARER_REGEX, 'Bearer [REDACTED_TOKEN]')
    .replace(JWT_REGEX, '[REDACTED_JWT]')
    .replace(API_KEY_REGEX, '[REDACTED_API_KEY]')
    .replace(PHONE_REGEX, (match) => maskPhone(match))
    .replace(AADHAAR_REGEX, (match) => maskAadhaar(match))
    .replace(SSN_REGEX, (match) => maskSSN(match))
}

export function sanitizeObject<T>(data: T, depth = 0): T {
  if (depth > 10) return '[MAX_DEPTH_EXCEEDED]' as unknown as T
  if (!data) return data

  if (typeof data === 'string') {
    return sanitizeText(data) as unknown as T
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeObject(item, depth + 1)) as unknown as T
  }

  if (typeof data === 'object') {
    const scrubbed: Record<string, any> = {}
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      const lowerKey = key.toLowerCase().trim()
      if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token')) {
        scrubbed[key] = '[REDACTED]'
      } else {
        scrubbed[key] = sanitizeObject(val, depth + 1)
      }
    }
    return scrubbed as T
  }

  return data
}
