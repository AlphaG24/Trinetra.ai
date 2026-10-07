/**
 * frontend/src/lib/safety/adminAuthService.ts
 * 
 * Admin 30-Minute Idle Sessions, Mandatory MFA & Privileged Step-Up Auth Engine.
 * Implements Master Plan Section 18.4 (Authoritative Overrides).
 */

export const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes (1,800,000 ms)
export const STEP_UP_TOKEN_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes (300,000 ms)

export type PrivilegedAction =
  | 'kyc_view'
  | 'wallet_adjust'
  | 'price_change'
  | 'credential_update'
  | 'number_release_override';

export interface AdminSessionState {
  isAuthenticated: boolean;
  userId: string | null;
  role: string | null;
  isMfaVerified: boolean;
  lastActiveAt: number; // Unix timestamp in ms
  sessionExpiresAt: number; // Unix timestamp in ms
}

export interface StepUpAuthToken {
  token: string;
  action: PrivilegedAction | '*';
  expiresAt: number;
}

const SESSION_STORAGE_KEY = 'trinetra_admin_session';
const STEP_UP_STORAGE_PREFIX = 'trinetra_step_up_';

/**
 * Initializes or loads the admin session from sessionStorage.
 */
export function getStoredAdminSession(): AdminSessionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: AdminSessionState = JSON.parse(raw);
    const now = Date.now();

    // Check 30-minute idle expiry
    if (now - session.lastActiveAt > ADMIN_IDLE_TIMEOUT_MS) {
      clearAdminSession();
      return null;
    }

    return session;
  } catch {
    clearAdminSession();
    return null;
  }
}

/**
 * Saves or updates the active admin session state in sessionStorage.
 */
export function saveAdminSession(session: AdminSessionState): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

/**
 * Refreshes the last active timestamp for the admin session.
 */
export function touchAdminSession(): boolean {
  const session = getStoredAdminSession();
  if (!session) return false;
  const now = Date.now();
  session.lastActiveAt = now;
  session.sessionExpiresAt = now + ADMIN_IDLE_TIMEOUT_MS;
  saveAdminSession(session);
  return true;
}

/**
 * Clears admin session and any cached step-up tokens.
 */
export function clearAdminSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem('trinetra_admin'); // legacy key cleanup
  // Clear step-up tokens
  const keys = Object.keys(sessionStorage);
  keys.forEach((key) => {
    if (key.startsWith(STEP_UP_STORAGE_PREFIX)) {
      sessionStorage.removeItem(key);
    }
  });
}

/**
 * Stores a verified step-up token for a privileged action.
 */
export function cacheStepUpToken(action: PrivilegedAction | '*', token: string, expiresInSeconds: number = 300): void {
  if (typeof window === 'undefined') return;
  const item: StepUpAuthToken = {
    token,
    action,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  };
  sessionStorage.setItem(`${STEP_UP_STORAGE_PREFIX}${action}`, JSON.stringify(item));
}

/**
 * Retrieves an active, unexpired step-up token for the action.
 */
export function getValidStepUpToken(action: PrivilegedAction): string | null {
  if (typeof window === 'undefined') return null;
  try {
    // Check action-specific token or wildcard token
    for (const key of [`${STEP_UP_STORAGE_PREFIX}${action}`, `${STEP_UP_STORAGE_PREFIX}*`]) {
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      const data: StepUpAuthToken = JSON.parse(raw);
      if (Date.now() < data.expiresAt) {
        return data.token;
      }
      sessionStorage.removeItem(key);
    }
    return null;
  } catch {
    return null;
  }
}
