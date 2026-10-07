/**
 * frontend/src/lib/safety/rolePolicy.ts
 * 
 * Centralized Role and Exemption Policy for Trinetra AI.
 * Implements Master Plan Section 18.3 & 18.4 (Authoritative Overrides).
 */

export type UserRole = 'customer' | 'developer_tester' | 'admin';

export const NON_EXEMPTIBLE_PRIMITIVES = new Set([
  'ai_disclosure',
  'call_recording_notice',
  'pii_redaction',
  'audit_logging',
  'mfa_requirement',
  'statutory_curfew',
  'dnd_scrubbing',
]);

export const EXEMPTIBLE_BUSINESS_LIMITS = new Set([
  'agent_creation_limit',
  'phone_number_claim_limit',
  'call_concurrency_limit',
  'monthly_minutes_quota',
  'trial_period_expiry',
  'wallet_balance_zero_block',
]);

export const STEP_UP_REAUTH_ACTIONS = new Set([
  'kyc_view',
  'wallet_adjust',
  'price_change',
  'credential_update',
  'number_release_override',
]);

export const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function normalizeRole(roleRaw?: string | null): UserRole {
  if (!roleRaw) return 'customer';
  const clean = roleRaw.trim().toLowerCase();
  if (['developer_tester', 'dev_test', 'tester'].includes(clean)) {
    return 'developer_tester';
  }
  if (['admin', 'super_admin'].includes(clean)) {
    return 'admin';
  }
  return 'customer';
}

export function canExempt(roleRaw: string | null | undefined, key: string): { exempt: boolean; reason: string } {
  const role = normalizeRole(roleRaw);
  const cleanKey = key.trim().toLowerCase();

  // 1. Non-exemptible primitives: strictly forbidden
  if (NON_EXEMPTIBLE_PRIMITIVES.has(cleanKey)) {
    return {
      exempt: false,
      reason: 'Security, disclosure, PII redaction, audit logs, and statutory compliance primitives can NEVER be bypassed by any role.',
    };
  }

  // 2. Business limits
  if (EXEMPTIBLE_BUSINESS_LIMITS.has(cleanKey)) {
    if (role === 'developer_tester' || role === 'admin') {
      return {
        exempt: true,
        reason: `Role '${role}' is exempt from business limit '${cleanKey}' for testing.`,
      };
    }
    return {
      exempt: false,
      reason: `Customer accounts are subject to business limit '${cleanKey}'.`,
    };
  }

  return {
    exempt: false,
    reason: `Unknown or unexemptible limit: '${cleanKey}'.`,
  };
}

export function isExemptFromBusinessLimits(roleRaw: string | null | undefined, limitKey: string): boolean {
  return canExempt(roleRaw, limitKey).exempt;
}

export function canViewKycDocuments(roleRaw: string | null | undefined): boolean {
  const role = normalizeRole(roleRaw);
  // developer_tester cannot view KYC documents per Section 18.4
  if (role === 'developer_tester') return false;
  return role === 'admin';
}

export function isAccountExcludedFromMetrics(roleRaw: string | null | undefined): boolean {
  return normalizeRole(roleRaw) === 'developer_tester';
}

export function validateNumberForFlow(
  numberMetadata: { is_sandbox?: boolean; label?: string; sandbox_label?: string; kyc_status?: string },
  flowType: string
): { valid: boolean; reason?: string } {
  const isSandbox = Boolean(
    numberMetadata.is_sandbox === true ||
    String(numberMetadata.label || '').trim().toUpperCase() === 'TEST' ||
    String(numberMetadata.sandbox_label || '').trim().toUpperCase() === 'TEST'
  );

  const flow = flowType.trim().toLowerCase();

  if (isSandbox) {
    if (['customer_campaign', 'customer_live', 'production_dialer', 'customer_inbound'].includes(flow)) {
      return {
        valid: false,
        reason: 'Sandbox test numbers (labeled TEST) are strictly prohibited from customer-facing live campaign flows.',
      };
    }
    return { valid: true };
  }

  const kycStatus = String(numberMetadata.kyc_status || 'verified').toLowerCase();
  if (['customer_campaign', 'customer_live'].includes(flow) && ['pending', 'rejected', 'missing'].includes(kycStatus)) {
    return {
      valid: false,
      reason: 'Real numbers cannot be activated in live customer flows without verified provider KYC.',
    };
  }

  return { valid: true };
}

export function requiresStepUpReauth(action: string): boolean {
  return STEP_UP_REAUTH_ACTIONS.has(action.trim().toLowerCase());
}
