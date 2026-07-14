// ============================================================================
// SECURITY: Structured Security Logger
//
// Outputs structured JSON for log aggregation (Vercel Logs / Datadog / etc.)
// NEVER logs: passwords, JWT tokens, full card numbers, raw PII
// ============================================================================

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'

interface SecurityLogEntry {
  level: LogLevel
  event: string
  timestamp: string
  [key: string]: string | number | boolean | undefined
}

// Fields that must NEVER be logged
const REDACTED_FIELDS = new Set([
  'password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'cookie',
  'secret',
  'api_key',
  'apikey',
  'credit_card',
  'card_number',
  'cvv',
  'ssn',
  'pan',
  'gst_number',
])

/**
 * Mask an email address for safe logging.
 * "ketan@gmail.com" → "k***n@gmail.com"
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain || local.length <= 2) return `***@${domain || '***'}`
  return `${local[0]}***${local[local.length - 1]}@${domain}`
}

/**
 * Mask an IP address for privacy (mask last octet for IPv4).
 * "192.168.1.100" → "192.168.1.xxx"
 */
function maskIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown'
  const parts = ip.split('.')
  if (parts.length === 4) {
    parts[3] = 'xxx'
    return parts.join('.')
  }
  // IPv6 or other — mask last segment
  return ip.replace(/:[^:]+$/, ':xxxx')
}

/**
 * Sanitize a key-value record, redacting sensitive fields and masking PII.
 */
function sanitizeDetails(details: Record<string, unknown>): Record<string, string | number | boolean | undefined> {
  const sanitized: Record<string, string | number | boolean | undefined> = {}

  for (const [key, value] of Object.entries(details)) {
    const lowerKey = key.toLowerCase()

    // Redact known sensitive fields
    if (REDACTED_FIELDS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]'
      continue
    }

    // Mask email fields
    if (lowerKey.includes('email') && typeof value === 'string' && value.includes('@')) {
      sanitized[key] = maskEmail(value)
      continue
    }

    // Mask IP addresses
    if (lowerKey === 'ip' && typeof value === 'string') {
      sanitized[key] = maskIp(value)
      continue
    }

    // Pass through safe primitives only
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value
    } else if (value === null || value === undefined) {
      sanitized[key] = undefined
    } else {
      // Objects/arrays — stringify but truncate to prevent log flooding
      const str = JSON.stringify(value)
      sanitized[key] = str.length > 200 ? str.slice(0, 200) + '...[truncated]' : str
    }
  }

  return sanitized
}

/**
 * Log a security event with structured JSON output.
 */
export function logSecurity(
  level: LogLevel,
  event: string,
  details: Record<string, unknown> = {}
): void {
  const entry: SecurityLogEntry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...sanitizeDetails(details),
  }

  switch (level) {
    case 'ERROR':
    case 'CRITICAL':
      console.error(JSON.stringify(entry))
      break
    case 'WARN':
      console.warn(JSON.stringify(entry))
      break
    default:
      console.log(JSON.stringify(entry))
  }
}

// Convenience exports
export const securityInfo = (event: string, details?: Record<string, unknown>) => logSecurity('INFO', event, details)
export const securityWarn = (event: string, details?: Record<string, unknown>) => logSecurity('WARN', event, details)
export const securityError = (event: string, details?: Record<string, unknown>) => logSecurity('ERROR', event, details)
export const securityCritical = (event: string, details?: Record<string, unknown>) => logSecurity('CRITICAL', event, details)
