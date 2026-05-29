import { useState } from "react";

const STORAGE_KEY = "trinetra_blog_user_id";

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const rand = () => Math.random().toString(16).slice(2);
  return `anon_${Date.now().toString(16)}_${rand()}_${rand()}`;
}

export default function useUserIdentifier() {
  const [identifier] = useState(() => {
    try {
      if (typeof window === "undefined") return generateId();
      const existing = window.localStorage.getItem(STORAGE_KEY);
      if (existing) return existing;

      const next = generateId();
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    } catch {
      return generateId();
    }
  });

  return identifier;
}
