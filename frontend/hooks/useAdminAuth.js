"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ADMIN_IDLE_TIMEOUT_MS,
  getStoredAdminSession,
  saveAdminSession,
  touchAdminSession,
  clearAdminSession,
  cacheStepUpToken,
  getValidStepUpToken,
} from "@/src/lib/safety/adminAuthService";

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [idleTimeRemaining, setIdleTimeRemaining] = useState(ADMIN_IDLE_TIMEOUT_MS);
  const lastActiveRef = useRef(Date.now());

  // Check and refresh session on mount
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const stored = getStoredAdminSession();
      if (stored && stored.isAuthenticated) {
        setIsAuthenticated(true);
        lastActiveRef.current = stored.lastActiveAt;
      } else {
        // Fallback for legacy key if within valid session
        const legacy = sessionStorage.getItem("trinetra_admin") === "true";
        if (legacy) {
          const now = Date.now();
          saveAdminSession({
            isAuthenticated: true,
            userId: null,
            role: "admin",
            isMfaVerified: true,
            lastActiveAt: now,
            sessionExpiresAt: now + ADMIN_IDLE_TIMEOUT_MS,
          });
          setIsAuthenticated(true);
          lastActiveRef.current = now;
        } else {
          setIsAuthenticated(false);
        }
      }
    }
  }, []);

  // Activity listeners to update last active timestamp
  const handleUserActivity = useCallback(() => {
    if (!isAuthenticated) return;
    const now = Date.now();
    // Throttle updates to at most once every 5 seconds
    if (now - lastActiveRef.current > 5000) {
      lastActiveRef.current = now;
      touchAdminSession();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    // Heartbeat check every 10 seconds for idle timeout (30 min)
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActiveRef.current;
      const remaining = Math.max(0, ADMIN_IDLE_TIMEOUT_MS - elapsed);
      setIdleTimeRemaining(remaining);

      if (elapsed > ADMIN_IDLE_TIMEOUT_MS) {
        clearAdminSession();
        setIsAuthenticated(false);
        setSessionExpired(true);
      }
    }, 10000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      clearInterval(interval);
    };
  }, [isAuthenticated, handleUserActivity]);

  const login = async (password, mfaCode = null) => {
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, mfa_code: mfaCode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error || "Authentication failed" };
      }

      const now = Date.now();
      saveAdminSession({
        isAuthenticated: true,
        userId: null,
        role: "admin",
        isMfaVerified: true,
        lastActiveAt: now,
        sessionExpiresAt: now + ADMIN_IDLE_TIMEOUT_MS,
      });
      sessionStorage.setItem("trinetra_admin", "true"); // legacy compatibility
      lastActiveRef.current = now;
      setIsAuthenticated(true);
      setSessionExpired(false);
      return { success: true };
    } catch (err) {
      return { success: false, error: "Network error occurred" };
    }
  };

  const logout = () => {
    clearAdminSession();
    setIsAuthenticated(false);
    setSessionExpired(false);
  };

  /**
   * Requests a step-up token for a privileged action (kyc_view, wallet_adjust, price_change, credential_update).
   * First checks cached unexpired step-up token; if missing, invokes step-up API.
   */
  const requestStepUp = async (action, credential, credentialType = "password") => {
    const existing = getValidStepUpToken(action);
    if (existing) {
      return { success: true, token: existing, cached: true };
    }

    try {
      const res = await fetch("/api/admin/step-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          credential,
          credential_type: credentialType,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Step-up re-authentication failed" };
      }

      cacheStepUpToken(action, data.step_up_token, data.expires_in_seconds || 300);
      return { success: true, token: data.step_up_token, cached: false };
    } catch (err) {
      return { success: false, error: "Step-up network error" };
    }
  };

  return {
    isAuthenticated,
    isMounted,
    sessionExpired,
    idleTimeRemaining,
    login,
    logout,
    requestStepUp,
  };
}
