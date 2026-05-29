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

  const login = (password) => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD || password === process.env.REACT_APP_ADMIN_PASSWORD) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("trinetra_admin", "true");
      }
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, error: "Incorrect password" };
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("trinetra_admin");
    }
    setIsAuthenticated(false);
  };

  return { isAuthenticated, isMounted, login, logout };
}
