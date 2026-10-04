/**
 * frontend/src/lib/safety/walletService.ts
 * 
 * Prepaid Wallet, Spend Limits & Reliability Score Engine.
 * Implements Master Plan Section 18.9 & 18.10 (Authoritative Overrides).
 */

export interface WalletState {
  organizationId: string;
  balancePaisa: number;
  balanceInr: number;
  currency: string;
  spendLimitPaisa: number;
  spendLimitInr: number;
  currentSpendPaisa: number;
  currentSpendInr: number;
  emergencyMinutesAvailable: number;
  emergencyMinutesClaimedAt: string | null;
  lastTopupAt: string | null;
}

export interface ReliabilityScoreBreakdown {
  score: number;
  breakdown: {
    payment_timeliness_points: number;
    account_longevity_points: number;
    call_compliance_points: number;
    kyc_verification_points: number;
  };
  transparent_rules: string[];
}

export interface PreCallCheckResult {
  authorized: boolean;
  status: string;
  message: string;
  isCallInProgressProtected?: boolean;
}

export const DEFAULT_SPEND_LIMIT_INR = 2500;
export const MAX_EMERGENCY_MINUTES = 50;

/**
 * Validates pre-call gating rules:
 * - Active in-progress calls are NEVER disconnected mid-call per Master Plan Sec 18.9.
 * - Subsequent calls gated if spend limit reached or balance exhausted.
 */
export function evaluatePreCallPermission(
  wallet: WalletState,
  reliabilityScore: number,
  isInProgressCall: boolean = false,
  userRole?: string
): PreCallCheckResult {
  // 1. In-progress call immunity
  if (isInProgressCall) {
    return {
      authorized: true,
      status: 'ACTIVE_CALL_PROTECTED',
      message: 'Active in-progress call is protected from disconnection per Master Plan Section 18.9.',
      isCallInProgressProtected: true,
    };
  }

  // 2. Dev / Admin bypass
  if (userRole === 'developer_tester' || userRole === 'admin') {
    return {
      authorized: true,
      status: 'EXEMPT_ROLE',
      message: `Account role '${userRole}' is exempt from business spend limits for testing.`,
    };
  }

  // 3. Spend Limit Exceeded
  if (wallet.currentSpendPaisa >= wallet.spendLimitPaisa) {
    return {
      authorized: false,
      status: 'SPEND_LIMIT_EXCEEDED',
      message: `Monthly spend limit of ₹${wallet.spendLimitInr.toFixed(2)} reached. Please increase spend limit in settings or request an override.`,
    };
  }

  // 4. Balance check
  if (wallet.balancePaisa <= 0) {
    if (wallet.emergencyMinutesAvailable > 0) {
      return {
        authorized: true,
        status: 'EMERGENCY_MINUTES_ACTIVE',
        message: `Prepaid balance exhausted. Using free emergency minutes (${wallet.emergencyMinutesAvailable} min remaining).`,
      };
    }

    if (reliabilityScore > 80) {
      return {
        authorized: false,
        status: 'INSUFFICIENT_FUNDS_ELIGIBLE_FOR_EMERGENCY',
        message: 'Wallet balance exhausted. Your Reliability Score qualifies you for 50 free emergency minutes. Claim them in your billing dashboard.',
      };
    }

    return {
      authorized: false,
      status: 'INSUFFICIENT_FUNDS',
      message: 'Prepaid wallet balance exhausted. Please top up your wallet to continue making calls.',
    };
  }

  return {
    authorized: true,
    status: 'AUTHORIZED',
    message: 'Call authorized.',
  };
}
