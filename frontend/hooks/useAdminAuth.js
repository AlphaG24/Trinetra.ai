"use client";

import { useState, useEffect } from "react";

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      setIsAuthenticated(sessionStorage.getItem("trinetra_admin") === "true");
    }
  }, []);

  const login = async (password) => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        return { success: false, error: data.error || 'Authentication failed' };
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("trinetra_admin", "true");
      }
      setIsAuthenticated(true);
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Network error occurred' };
    }
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("trinetra_admin");
    }
    setIsAuthenticated(false);
  };

  return { isAuthenticated, isMounted, login, logout };
}
