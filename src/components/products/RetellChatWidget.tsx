"use client";

import { useEffect, useRef, useState } from "react";

import {
  RETELL_CHAT_BOT_NAME,
  RETELL_CHAT_COLOR,
  RETELL_CHAT_LOGO_URL,
  RETELL_CHAT_TITLE,
} from "@/lib/agent-branding";

const RETELL_PUBLIC_KEY = process.env.NEXT_PUBLIC_RETELL_PUBLIC_KEY?.trim() ?? "";
const RETELL_AGENT_ID = process.env.NEXT_PUBLIC_RETELL_AGENT_ID?.trim() ?? "";

const RETELL_WIDGET_SCRIPT_ID = "retell-widget";
const RETELL_WIDGET_SCRIPT_SRC = "https://dashboard.retellai.com/retell-widget.js";
const PANEL_OPEN_TIMEOUT_MS = 12000;
const THEME_STYLE_ID = "netra-theme-css";

export const RETELL_CHAT_IS_CONFIGURED = true; // Handle missing config errors dynamically, don't just hide.

/* ── Injected CSS: animations + panel theme + hide native launcher ── */
const NETRA_CSS = `
@keyframes netra-float{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-6px) rotate(-2deg)}75%{transform:translateY(-5px) rotate(2deg)}}
@keyframes netra-ring{0%{transform:scale(1);opacity:.5}80%,100%{transform:scale(1.3);opacity:0}}
@keyframes netra-glow{0%,100%{box-shadow:0 0 18px rgba(139,92,246,.3),0 8px 28px rgba(76,29,149,.3)}50%{box-shadow:0 0 32px rgba(139,92,246,.5),0 12px 44px rgba(76,29,149,.45)}}
@keyframes netra-sway{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
[data-netra-panel]{
  border:1.5px solid rgba(139,92,246,.32)!important;
  border-radius:20px!important;
  box-shadow:0 25px 70px rgba(0,0,0,.55),0 0 50px rgba(76,29,149,.22)!important;
  overflow:hidden!important;
  z-index:2147483647!important;
  position:fixed!important;
  pointer-events:auto!important;
}
[data-netra-hide]{
  opacity:0!important;
  pointer-events:none!important;
  z-index:-1!important;
  visibility:hidden!important;
}
`;

interface RetellChatWidgetProps {
  enabled: boolean;
  dynamic?: Record<string, unknown>;
  hideLauncher?: boolean;
  logoUrl?: string;
  openRequestId?: number;
  onReady?: () => void;
  onOpenChange?: (isOpen: boolean) => void;
  onError?: (message: string) => void;
}

function serializeDynamic(d: RetellChatWidgetProps["dynamic"]) {
  if (!d || typeof d !== "object") return "{}";
  const o = Object.entries(d).reduce<Record<string, string>>((r, [k, v]) => {
    if (!k) return r;
    if (typeof v === "string") { r[k] = v; } else if (typeof v === "number" || typeof v === "boolean") { r[k] = String(v); }
    return r;
  }, {});
  return Object.keys(o).length > 0 ? JSON.stringify(o) : "{}";
}

function isVisible(el: HTMLElement) {
  const s = window.getComputedStyle(el);
  if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function isBottomDocked(r: DOMRect) { return window.innerHeight - r.bottom <= 80; }
function isEdgeDocked(r: DOMRect) {
  return (window.innerWidth - r.right <= 80) || (r.left <= 80);
}

function isRetellInjected(el: HTMLElement) {
  if (el.id === "__next" || el.id === "root" || el.id === "app") return false;
  if (el.closest("main, section, article, [id='products'], nav, footer, [id='__next']")) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width > 600) return false;
  const pos = window.getComputedStyle(el).position;
  if (pos === "fixed" || pos === "absolute") return true;
  return false;
}

/** Recursively find an element inside shadow roots */
function findInShadow(root: Element | ShadowRoot, selector: string): HTMLElement | null {
  const hit = (root as Element).querySelector?.<HTMLElement>(selector);
  if (hit) return hit;
  const all = (root as Element).querySelectorAll?.('*') ?? [];
  for (const el of all) {
    if (el.shadowRoot) {
      const found = findInShadow(el.shadowRoot, selector);
      if (found) return found;
    }
  }
  return null;
}

/** Click the center of an element, going through Shadow DOM if needed */
function clickCenter(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  // Dispatch the events — works even for shadow hosts
  const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy };
  el.dispatchEvent(new MouseEvent("mousedown", opts));
  el.dispatchEvent(new MouseEvent("mouseup", opts));
  el.dispatchEvent(new MouseEvent("click", opts));
  // Also try clicking the deepest element at that point (penetrates shadow DOM)
  const deep = document.elementFromPoint(cx, cy) as HTMLElement | null;
  if (deep && deep !== el) {
    deep.dispatchEvent(new MouseEvent("mousedown", opts));
    deep.dispatchEvent(new MouseEvent("mouseup", opts));
    deep.dispatchEvent(new MouseEvent("click", opts));
  }
}

function findPanel() {
  // Check known ID in regular DOM
  const exact = document.getElementById("retell-chat");
  if (exact && isVisible(exact)) return exact;

  // Check inside shadow roots for the chat panel
  const shadowPanel = findInShadow(document.body, "[id*='retell-chat'], [class*='retell-chat'], [class*='retell-panel']");
  if (shadowPanel && isVisible(shadowPanel)) return shadowPanel;

  // Check for input fields (chat interface)
  const fields = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[placeholder],textarea[placeholder]");
  for (const f of fields) {
    const ph = f.placeholder.toLowerCase();
    if (!ph.includes("ask") && !ph.includes("question") && !ph.includes("message")) continue;
    let cur = f.parentElement;
    while (cur && cur !== document.body) {
      if (isVisible(cur) && isRetellInjected(cur)) {
        const rect = cur.getBoundingClientRect();
        if (rect.width >= 240 && rect.height >= 300) return cur as HTMLElement;
      }
      cur = cur.parentElement;
    }
  }

  // KEY: When the Retell chat opens, the shadow host EXPANDS from ~56px (button) to
  // full panel size (300px+). Detect this as the "panel open" state.
  for (const host of document.querySelectorAll<HTMLElement>("body *")) {
    if (!host.shadowRoot) continue;
    if (host.getAttribute("data-netra-hide") === "true") continue;
    const rect = host.getBoundingClientRect();
    // Panel is open when the shadow host is tall (>= 300px)
    if (rect.width >= 240 && rect.height >= 300) return host;
    // Also check if the shadow root contains a chat input (panel is open)
    const shadowInput = host.shadowRoot.querySelector<HTMLElement>("input, textarea");
    if (shadowInput && rect.width >= 240) return host;
  }

  for (const el of document.querySelectorAll<HTMLElement>("body > div, body > aside, [data-retell-chat-wrapper]")) {
    if (!isVisible(el) || !isRetellInjected(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 240 || rect.height < 300) continue;
    const t = el.textContent?.trim() ?? "";
    if (t.includes(RETELL_CHAT_TITLE) || t.includes(RETELL_CHAT_BOT_NAME) || t.includes("Ask a detailed question")) return el;
  }
  return null;
}

function findLauncher(panel: HTMLElement | null) {
  // Try well-known Retell IDs first
  const byId = document.getElementById("retell-fab") ?? document.getElementById("retell-widget-launcher");
  if (byId && byId.getAttribute("data-netra-hide") !== "true") return byId;

  // PRIORITY: Shadow DOM hosts — the Retell widget injects a shadow host div
  // that is fixed-positioned at bottom edge and has a shadowRoot
  for (const el of document.querySelectorAll<HTMLElement>("body > div, body > *")) {
    if (el.dataset.netraOwn) continue;
    if (el.getAttribute("data-netra-hide") === "true") continue;
    if (!el.shadowRoot) continue; // Must be a shadow host
    const rect = el.getBoundingClientRect();
    if (rect.width < 30 || rect.width > 200 || rect.height < 30) continue;
    if (!isBottomDocked(rect)) continue;
    if (panel && (el === panel || panel.contains(el) || el.contains(panel))) continue;
    return el;
  }

  // Fallback: any visible, bottom-docked, small, fixed/absolute element
  for (const el of document.querySelectorAll<HTMLElement>("body > *, body > * > *")) {
    if (el.dataset.netraOwn) continue;
    if (el.getAttribute("data-netra-hide") === "true") continue;
    if (!isVisible(el)) continue;
    if (panel && (el === panel || panel.contains(el) || el.contains(panel))) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 40 || rect.width > 140 || rect.height < 40 || rect.height > 140) continue;
    if (!isBottomDocked(rect) || !isEdgeDocked(rect)) continue;
    const pos = window.getComputedStyle(el).position;
    if (pos !== "fixed" && pos !== "absolute") continue;
    return el;
  }

  return null;
}

function NetraRobot() {
  return (
    <svg width="42" height="42" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g style={{ transformOrigin: "24px 12px", animation: "netra-sway 2s ease-in-out infinite" }}>
        <line x1="24" y1="12" x2="24" y2="4" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="24" cy="3" r="3" fill="#FBBF24">
          <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
        </circle>
      </g>
      <rect x="8" y="12" width="32" height="24" rx="8" fill="#E9D5FF" />
      <circle cx="17" cy="24" r="4.5" fill="#4C1D95" />
      <circle cx="31" cy="24" r="4.5" fill="#4C1D95" />
      <circle cx="17" cy="23" r="2" fill="#C4B5FD">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="31" cy="23" r="2" fill="#C4B5FD">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="18" cy="22" r="1" fill="white" opacity="0.8" />
      <circle cx="32" cy="22" r="1" fill="white" opacity="0.8" />
      <path d="M18 29 Q24 34 30 29" stroke="#7C3AED" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="2" y="18" width="6" height="12" rx="3" fill="#DDD6FE" />
      <rect x="40" y="18" width="6" height="12" rx="3" fill="#DDD6FE" />
    </svg>
  );
}

export function RetellChatWidget({
  enabled,
  dynamic,
  hideLauncher = true,
  logoUrl = RETELL_CHAT_LOGO_URL,
  openRequestId = 0,
  onReady,
  onOpenChange,
  onError,
}: RetellChatWidgetProps) {
  const readyRef = useRef(onReady);
  const openChangeRef = useRef(onOpenChange);
  const errorRef = useRef(onError);
  const openRequestRef = useRef(openRequestId);
  const openPanelRef = useRef<() => void>(() => {});
  const dynamicJson = serializeDynamic(dynamic);
  const [showRobot, setShowRobot] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => { readyRef.current = onReady; }, [onReady]);
  useEffect(() => { openChangeRef.current = onOpenChange; }, [onOpenChange]);
  useEffect(() => { errorRef.current = onError; }, [onError]);
  useEffect(() => {
    openRequestRef.current = openRequestId;
    if (openRequestId > 0) openPanelRef.current();
  }, [openRequestId]);

  useEffect(() => {
    if (document.getElementById(THEME_STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = THEME_STYLE_ID;
    s.textContent = NETRA_CSS;
    document.head.appendChild(s);
    return () => { s.remove(); };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let hasOpened = false;
    let isOpen = false;
    let missCount = 0;
    let timedOut = false;
    let disposed = false;
    let modifying = false;
    let raf = 0;
    let userRequested = openRequestRef.current > 0;

    const hide = (el: HTMLElement | null) => {
      if (!el || !hideLauncher || !el.isConnected) return;
      if (el.getAttribute("data-netra-hide") === "true") return;
      modifying = true;
      el.setAttribute("data-netra-hide", "true");
      el.style.setProperty("opacity", "0", "important");
      el.style.setProperty("pointer-events", "none", "important");
      // NOTE: Do NOT set visibility:hidden on shadow hosts — it prevents the
      // shadow-dom chat panel from rendering when opened.
      if (!el.shadowRoot) {
        el.style.setProperty("visibility", "hidden", "important");
      }
      queueMicrotask(() => { modifying = false; });
    };

    const unhide = (el: HTMLElement | null) => {
      if (!el) return;
      el.removeAttribute("data-netra-hide");
      el.style.removeProperty("opacity");
      el.style.removeProperty("pointer-events");
      el.style.removeProperty("visibility");
    };

    const requestOpen = () => {
      // Configuration Validation (CRITICAL FOR UX)
      if (!RETELL_AGENT_ID) {
        errorRef.current?.("Missing NEXT_PUBLIC_RETELL_AGENT_ID.");
        return;
      }
      if (!RETELL_PUBLIC_KEY) {
        errorRef.current?.("Missing NEXT_PUBLIC_RETELL_PUBLIC_KEY.");
        return;
      }

      userRequested = true;
      const start = Date.now();

      // Strategy 1: Try Retell's programmatic JS API if exposed on window
      // The widget script may expose window.RetellWidget or similar after load
      const tryProgrammaticOpen = () => {
        const w = window as unknown as Record<string, unknown>;
        // Try common Retell programmatic API patterns
        if (typeof w["RetellWidget"] === "object" && w["RetellWidget"] !== null) {
          const rw = w["RetellWidget"] as Record<string, unknown>;
          if (typeof rw["open"] === "function") { (rw["open"] as () => void)(); return true; }
        }
        if (typeof w["retellWidget"] === "object" && w["retellWidget"] !== null) {
          const rw = w["retellWidget"] as Record<string, unknown>;
          if (typeof rw["open"] === "function") { (rw["open"] as () => void)(); return true; }
        }
        return false;
      };
      
      const tryOpen = () => {
        if (disposed) return;
        const panel = findPanel();
        if (panel) { sync(); return; }

        // Try programmatic API first (cleanest approach)
        if (tryProgrammaticOpen()) {
          window.setTimeout(() => { if (!disposed) sync(); }, 400);
          window.setTimeout(tryOpen, 800);
          return;
        }

        // Strategy 2: Find launcher (left OR right docked) and click it
        const launcher =
          findLauncher(panel) ??
          document.getElementById("retell-fab") ??
          document.getElementById("retell-widget-launcher") ??
          document.querySelector<HTMLElement>("[data-netra-hide='true']");

        if (launcher) {
          unhide(launcher);
          // Wait one frame for layout, then click using shadow-DOM-aware clickCenter
          requestAnimationFrame(() => {
            if (disposed) return;
            clickCenter(launcher);
            // Re-hide after the click event has propagated
            window.setTimeout(() => { if (!disposed && !findPanel()) hide(launcher); }, 400);
          });
        }

        if (Date.now() - start >= PANEL_OPEN_TIMEOUT_MS) {
          if (findPanel()) { sync(); return; }
          errorRef.current?.("Retell SDK failed to open the chat. Check that your agent is active and the domain is allowed in the Retell dashboard.");
          return;
        }
        window.setTimeout(tryOpen, launcher ? 700 : 350);
      };
      tryOpen();
    };

    const sync = () => {
      if (disposed) return;
      try {
        const launcher = findLauncher(null);
        hide(launcher);

        if (!userRequested) return;

        const panel = findPanel();
        if (panel) panel.setAttribute("data-netra-panel", "true");

        setIsPanelOpen(Boolean(panel));

        if (panel) {
          // Force panel to be visible — override any z-index / visibility issues
          panel.setAttribute("data-netra-panel", "true");
          panel.style.setProperty("z-index", "2147483647", "important");
          panel.style.setProperty("position", "fixed", "important");
          panel.style.setProperty("pointer-events", "auto", "important");
          panel.style.removeProperty("opacity");
          panel.style.removeProperty("visibility");
          panel.style.removeProperty("display");

          hasOpened = true;
          timedOut = false;
          missCount = 0;
          if (!isOpen) {
            isOpen = true;
            if (openRequestRef.current > 0) setShowRobot(true);
            openChangeRef.current?.(true);
          }
          return;
        }

        if (!hasOpened) return;
        missCount++;
        if (isOpen && missCount >= 4) {
          isOpen = false;
          openChangeRef.current?.(false);
        }
      } catch { }
    };

    openPanelRef.current = requestOpen;

    const existing = document.getElementById(RETELL_WIDGET_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");

    if (!existing) {
      if (!RETELL_AGENT_ID || !RETELL_PUBLIC_KEY) {
        // Validation handled during requestOpen, don't throw immediate console errors if environment isn't strictly ready
      } else {
        script.id = RETELL_WIDGET_SCRIPT_ID;
        script.src = RETELL_WIDGET_SCRIPT_SRC;
        script.type = "module";
        script.dataset.publicKey = RETELL_PUBLIC_KEY;
        script.dataset.agentId = RETELL_AGENT_ID;
        script.dataset.title = RETELL_CHAT_TITLE;
        script.dataset.botName = RETELL_CHAT_BOT_NAME;
        script.dataset.color = RETELL_CHAT_COLOR;
        script.dataset.autoOpen = "false";
        script.dataset.showAiPopup = "false";
        script.async = true;
        script.defer = true;
      }
    }

    if (logoUrl && script.dataset) script.dataset.logoUrl = logoUrl;
    if (script.dataset) {
      if (dynamicJson !== "{}") { script.dataset.dynamic = dynamicJson; } else { delete script.dataset.dynamic; }
    }

    script.onload = () => {
      readyRef.current?.();
      sync();
      if (openRequestRef.current > 0) requestOpen();
    };
    script.onerror = () => {
      if (!existing) script.remove();
      errorRef.current?.("Retell SDK failed to load (network error/blocked).");
    };

    const observer = new MutationObserver(() => {
      if (modifying) return;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { raf = 0; sync(); });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const interval = window.setInterval(sync, 1000);

    const timeout = window.setTimeout(() => {
      if (findPanel() || hasOpened || timedOut || !RETELL_AGENT_ID || !RETELL_PUBLIC_KEY) return;
      const launcher = findLauncher(null) || document.getElementById("retell-fab") || document.querySelector<HTMLElement>("[data-netra-hide='true']");
      if (launcher) {
        hide(launcher);
        return;
      }
      timedOut = true;
      errorRef.current?.("Retell agent is inactive or agentId is invalid: " + (RETELL_AGENT_ID || "Unknown"));
    }, PANEL_OPEN_TIMEOUT_MS);

    if (!existing && RETELL_AGENT_ID && RETELL_PUBLIC_KEY) { document.head.appendChild(script); } else if (existing) {
      readyRef.current?.();
      sync();
      if (openRequestRef.current > 0) requestOpen();
    }

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      openPanelRef.current = () => {};
      script.onload = null;
      script.onerror = null;
    };
  }, [dynamicJson, enabled, hideLauncher, logoUrl]);

  if (!enabled) return null;

  if (!showRobot || isPanelOpen) return null;

  return (
    <button
      type="button"
      data-netra-own="true"
      onClick={() => openPanelRef.current()}
      className="fixed bottom-[28px] right-[28px] z-[70] flex items-center justify-center"
      aria-label="Reopen Netra chat"
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
    >
      <span
        className="absolute inset-[-8px] rounded-full border-2 border-[rgba(139,92,246,0.3)]"
        style={{ animation: "netra-ring 2.5s ease-out infinite" }}
      />
      <div
        className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[rgba(192,132,252,0.4)] bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#3B0764]"
        style={{ animation: "netra-glow 3s ease-in-out infinite" }}
      >
        <div style={{ animation: "netra-float 3s ease-in-out infinite" }}>
          <NetraRobot />
        </div>
      </div>
    </button>
  );
}

