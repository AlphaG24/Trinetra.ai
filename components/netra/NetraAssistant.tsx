"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, ChevronDown, X } from "lucide-react";
import { usePathname } from "next/navigation";

type ChatRole = "assistant" | "user";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface LeadData {
  name: string | null;
  phone: string | null;
  interest: string | null;
}

const WELCOME_MESSAGE = `Hi! I'm Netra, your AI assistant at Trinetra AI.

I can help you with:
- Learn about our AI agents
- Understand pricing and plans
- Get started with an agent
- Answer any questions

What would you like to know?`;

const INITIAL_MESSAGES: ChatMessage[] = [{ role: "assistant", content: WELCOME_MESSAGE }];
const QUICK_REPLIES = [
  "Tell me about agents",
  "Show me pricing",
  "I want to get started",
] as const;

const NETRA_MEMORY = {
  initialized: false,
  messages: INITIAL_MESSAGES as ChatMessage[],
  panelOpen: false,
  quickRepliesHidden: false,
};

const NETRA_CONVERSATION_KEY = "netra_conversation";
const NETRA_PANEL_OPEN_KEY = "netra_panel_open";
const NETRA_QUICK_REPLIES_KEY = "netra_quick_replies_hidden";
const NETRA_INITIAL_GLOW_KEY = "netra_initial_glow_played";
const NETRA_LEAD_CAPTURED_KEY = "netra_lead_captured";

function getBubbleMessage(pathname: string) {
  if (pathname === "/") return "Hey! Want to see what AI can do for your business?";
  if (pathname.includes("/pricing")) return "Need help choosing the right plan?";
  if (pathname.includes("/products")) return "Questions about this agent? Ask me!";
  if (pathname.includes("/contact")) return "I can help you get started right now!";
  if (pathname.includes("/about")) return "Want to know more about our story?";
  if (pathname.includes("/blog")) return "Looking for something specific?";
  return "Hi! Need any help?";
}

function isPrivatePath(pathname: string) {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname === "/login";
}

function extractPhone(messages: ChatMessage[]) {
  const userMessages = messages.filter((message) => message.role === "user");
  for (let i = userMessages.length - 1; i >= 0; i -= 1) {
    const match = userMessages[i].content.match(/(?:\+91[\s-]*)?(?:\d[\s-]*){10,12}/);
    if (!match) continue;
    const raw = match[0].trim();
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 10) return digits;
    if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
    if (raw.startsWith("+91")) return raw;
  }
  return null;
}

function extractName(messages: ChatMessage[]) {
  for (let i = 1; i < messages.length; i += 1) {
    const current = messages[i];
    const previous = messages[i - 1];
    if (current.role !== "user" || previous.role !== "assistant") continue;
    if (!previous.content.toLowerCase().includes("name")) continue;
    const normalized = current.content.trim().replace(/^(my name is|i am|i'm|this is)\s+/i, "").trim();
    if (!normalized || normalized.includes("?") || /\d/.test(normalized)) continue;
    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length >= 1 && words.length <= 4) return normalized;
  }
  return null;
}

function extractInterest(messages: ChatMessage[]) {
  const userMessages = messages.filter((message) => message.role === "user");
  for (let i = userMessages.length - 1; i >= 0; i -= 1) {
    const text = userMessages[i].content.toLowerCase();
    if (text.includes("voice")) return "voice";
    if (text.includes("chat")) return "chat";
    if (text.includes("social")) return "social";
    if (text.includes("workflow")) return "workflow";
    if (text.includes("agent")) return "general";
  }
  return null;
}

function isValidStoredMessages(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        (item.role === "assistant" || item.role === "user") &&
        typeof item.content === "string"
    )
  );
}

function NetraRobotIcon({ size, animated = false }: { size: number; animated?: boolean }) {
  const robotStyle = { "--netra-size": `${size}px`, width: size, height: size } as CSSProperties;
  const transition = { repeat: Infinity, ease: "easeInOut" as const };

  return (
    <span className="netra-robot" style={robotStyle}>
      <span className="netra-robot__aura" />
      <span className="netra-robot__shadow" />
      <motion.span
        className="netra-robot__shell"
        animate={animated ? { y: [0, -2, 0] } : undefined}
        transition={{ duration: 3.2, ...transition }}
      >
        <span className="netra-robot__antenna netra-robot__antenna--left" />
        <span className="netra-robot__antenna netra-robot__antenna--right" />

        <motion.span
          className="netra-robot__arm netra-robot__arm--left"
          style={{ originX: 0.84, originY: 0.2 }}
          animate={animated ? { rotate: [-10, 18, -6, 14, -10] } : undefined}
          transition={{ duration: 1.9, ...transition }}
        >
          <span className="netra-robot__arm-upper" />
          <span className="netra-robot__arm-lower" />
          <span className="netra-robot__hand netra-robot__hand--left">
            <span className="netra-robot__finger netra-robot__finger--one" />
            <span className="netra-robot__finger netra-robot__finger--two" />
            <span className="netra-robot__finger netra-robot__finger--three" />
          </span>
        </motion.span>

        <span className="netra-robot__arm netra-robot__arm--right">
          <span className="netra-robot__arm-upper" />
          <span className="netra-robot__arm-lower" />
          <span className="netra-robot__hand netra-robot__hand--right" />
        </span>

        <span className="netra-robot__ear netra-robot__ear--left" />
        <span className="netra-robot__ear netra-robot__ear--right" />

        <span className="netra-robot__head">
          <span className="netra-robot__visor">
            <motion.span
              className="netra-robot__eye netra-robot__eye--left"
              animate={animated ? { scaleY: [1, 1, 0.72, 1] } : undefined}
              transition={{ duration: 4.6, ...transition }}
            />
            <motion.span
              className="netra-robot__eye netra-robot__eye--right"
              animate={animated ? { scaleY: [1, 1, 0.72, 1] } : undefined}
              transition={{ duration: 4.6, ...transition }}
            />
          </span>
        </span>

        <span className="netra-robot__torso" />
        <span className="netra-robot__shoulder netra-robot__shoulder--left" />
        <span className="netra-robot__shoulder netra-robot__shoulder--right" />
        <span className="netra-robot__core">
          <span className="netra-robot__core-ring" />
          <span className="netra-robot__core-mark" />
        </span>
      </motion.span>
    </span>
  );
}

export function NetraAssistant() {
  const pathname = usePathname() || "/";
  const [restored, setRestored] = useState(NETRA_MEMORY.initialized);
  const [isMobile, setIsMobile] = useState(false);
  const [panelOpen, setPanelOpen] = useState(NETRA_MEMORY.panelOpen);
  const [messages, setMessages] = useState<ChatMessage[]>(NETRA_MEMORY.messages);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [showInitialGlow, setShowInitialGlow] = useState(false);
  const [quickRepliesHidden, setQuickRepliesHidden] = useState(false);
  const [leadData, setLeadData] = useState<LeadData>({ name: null, phone: null, interest: null });
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const leadCaptureInFlightRef = useRef(false);
  const lastPathRef = useRef(pathname);

  const bubbleMessage = useMemo(() => getBubbleMessage(pathname), [pathname]);
  const hasLeadReady = Boolean(leadData.name && leadData.phone);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    try {
      if (!NETRA_MEMORY.initialized) {
        const storedConversation = sessionStorage.getItem(NETRA_CONVERSATION_KEY);
        if (storedConversation) {
          const parsed = JSON.parse(storedConversation) as unknown;
          if (isValidStoredMessages(parsed) && parsed.length > 0) {
            NETRA_MEMORY.messages = parsed;
            setMessages(parsed);
          }
        }

        NETRA_MEMORY.panelOpen = sessionStorage.getItem(NETRA_PANEL_OPEN_KEY) === "true";
        NETRA_MEMORY.quickRepliesHidden =
          sessionStorage.getItem(NETRA_QUICK_REPLIES_KEY) === "true";

        setPanelOpen(NETRA_MEMORY.panelOpen);
        setQuickRepliesHidden(NETRA_MEMORY.quickRepliesHidden);
      }

      if (!sessionStorage.getItem(NETRA_INITIAL_GLOW_KEY)) {
        setShowInitialGlow(true);
        sessionStorage.setItem(NETRA_INITIAL_GLOW_KEY, "true");
      }
    } catch (error) {
      console.error("Failed to restore Netra session state", error);
    } finally {
      NETRA_MEMORY.initialized = true;
      setRestored(true);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(NETRA_CONVERSATION_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error("Failed to persist Netra conversation", error);
    }
    NETRA_MEMORY.messages = messages;
  }, [messages, restored]);

  useEffect(() => {
    if (!restored) return;
    sessionStorage.setItem(NETRA_PANEL_OPEN_KEY, panelOpen ? "true" : "false");
    NETRA_MEMORY.panelOpen = panelOpen;
  }, [panelOpen, restored]);

  useEffect(() => {
    if (!restored) return;
    sessionStorage.setItem(NETRA_QUICK_REPLIES_KEY, quickRepliesHidden ? "true" : "false");
    NETRA_MEMORY.quickRepliesHidden = quickRepliesHidden;
  }, [quickRepliesHidden, restored]);

  useEffect(() => {
    if (!isMobile) return;
    document.body.style.overflow = panelOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, panelOpen]);

  useEffect(() => {
    if (!panelOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, panelOpen]);

  useEffect(() => {
    if (!restored || panelOpen) return;
    const storageKey = `netra_bubble_shown_${pathname}`;
    if (sessionStorage.getItem(storageKey)) return;
    const isRouteChange = lastPathRef.current !== pathname;
    lastPathRef.current = pathname;
    setBubbleVisible(false);

    const showTimer = window.setTimeout(() => {
      setBubbleVisible(true);
      sessionStorage.setItem(storageKey, "true");
    }, isRouteChange ? 300 : 4000);

    const hideTimer = window.setTimeout(() => {
      setBubbleVisible(false);
    }, 10000);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [panelOpen, pathname, restored]);

  useEffect(() => {
    if (!restored || messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "assistant") return;

    const detectedLeadData: LeadData = {
      name: extractName(messages),
      phone: extractPhone(messages),
      interest: extractInterest(messages),
    };

    setLeadData(detectedLeadData);

    const hasCapturedLead = sessionStorage.getItem(NETRA_LEAD_CAPTURED_KEY) === "true";
    if (hasCapturedLead || !detectedLeadData.name || !detectedLeadData.phone) return;
    if (leadCaptureInFlightRef.current) return;

    leadCaptureInFlightRef.current = true;

    const persistLead = async () => {
      const interest = detectedLeadData.interest || "general";
      const dbRequest = fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: detectedLeadData.name,
          email: "",
          phone: detectedLeadData.phone,
          companyName: "",
          source: "chat_widget",
          interestedProduct: interest,
          message: "Lead captured via Netra chat assistant",
          status: "new",
        }),
      });

      const formData = new FormData();
      formData.append("name", detectedLeadData.name);
      formData.append("phone", detectedLeadData.phone);
      formData.append("interest", interest === "general" ? "General inquiry" : interest);
      formData.append("source", "Netra Chat Assistant");
      formData.append("message", "New lead from Netra chat widget on trinetraai.com");

      const formspreeRequest = fetch("https://formspree.io/f/xwvryvag", {
        method: "POST",
        body: formData,
      });

      const [dbResult, formspreeResult] = await Promise.allSettled([dbRequest, formspreeRequest]);
      const dbSucceeded = dbResult.status === "fulfilled" && dbResult.value.ok;
      const formspreeSucceeded = formspreeResult.status === "fulfilled" && formspreeResult.value.ok;

      if (dbSucceeded && formspreeSucceeded) {
        sessionStorage.setItem(NETRA_LEAD_CAPTURED_KEY, "true");
      }

      leadCaptureInFlightRef.current = false;
    };

    void persistLead().catch((error) => {
      console.error("Failed to capture Netra lead", error);
      leadCaptureInFlightRef.current = false;
    });
  }, [messages, restored]);

  const handleOpenPanel = () => {
    setBubbleVisible(false);
    setPanelOpen(true);
  };

  const handleTogglePanel = () => {
    setBubbleVisible(false);
    setPanelOpen((prev) => !prev);
  };

  const sendMessage = async (messageText: string, fromQuickReply = false) => {
    const trimmed = messageText.trim();
    if (!trimmed || isTyping) return;

    if (fromQuickReply) {
      setQuickRepliesHidden(true);
    }

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const previousMessages = [...messages];
    setMessages([...previousMessages, userMessage]);
    setInputValue("");
    setIsTyping(true);
    setPanelOpen(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: previousMessages, page: pathname }),
      });

      const payload = (await response.json().catch(() => null)) as { reply?: string } | null;
      const reply =
        payload?.reply ||
        "I'm having trouble thinking right now. You can reach our team directly at +91 95806 19562. We'd love to help!";

      setMessages((current) => [...current, { role: "assistant", content: reply }]);
    } catch (error) {
      console.error("Failed to get Netra reply", error);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "I'm having trouble thinking right now. You can reach our team directly at +91 95806 19562. We'd love to help!",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  if (isPrivatePath(pathname)) return null;

  return (
    <>
      <AnimatePresence>
        {bubbleVisible ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed z-[998] max-w-[220px] rounded-[12px] border border-[#2D1255] bg-[#130224] px-[14px] py-[10px] text-left text-[13px] text-[#F5F3FF] shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
            style={{
              right: isMobile ? 20 : 28,
              bottom: isMobile ? 92 : 100,
              maxWidth: isMobile ? 200 : 220,
              fontSize: isMobile ? 12 : 13,
            }}
          >
            <button type="button" onClick={handleOpenPanel} className="block w-full pr-[18px] text-left">
              {bubbleMessage}
            </button>
            <button
              type="button"
              aria-label="Dismiss Netra message"
              onClick={(event) => {
                event.stopPropagation();
                setBubbleVisible(false);
              }}
              className="absolute right-[8px] top-[8px] text-[#6B6088] transition-colors hover:text-[#F5F3FF]"
            >
              <X size={14} />
            </button>
            <span className="netra-bubble-arrow" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        className="fixed z-[998]"
        data-netra-lead-ready={hasLeadReady ? "true" : "false"}
        style={{ right: isMobile ? 20 : 28, bottom: isMobile ? 20 : 28 }}
      >
        <button
          type="button"
          onClick={handleTogglePanel}
          className="group relative flex items-center justify-center overflow-visible rounded-full transition-all duration-300 ease-in-out hover:scale-[1.08] hover:shadow-[0_8px_28px_rgba(139,92,246,0.5)]"
          style={{
            width: isMobile ? 50 : 56,
            height: isMobile ? 50 : 56,
            boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
          }}
          aria-label={panelOpen ? "Close Netra assistant" : "Open Netra assistant"}
        >
          {showInitialGlow ? <span className="netra-glow-ring" /> : null}
          <NetraRobotIcon size={isMobile ? 50 : 56} animated />
        </button>
      </div>

      <AnimatePresence>
        {panelOpen ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`fixed z-[999] flex flex-col overflow-hidden border border-[#1E0A35] bg-[#0C0118] shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${
              isMobile ? "inset-0 h-screen w-screen rounded-none" : "rounded-[20px]"
            }`}
            style={
              isMobile
                ? undefined
                : {
                    right: 28,
                    bottom: 96,
                    width: 370,
                    height: 500,
                    transformOrigin: "bottom right",
                  }
            }
          >
            <div className="flex h-[56px] items-center justify-between border-b border-[#1E0A35] bg-[#130224] px-[14px]">
              <div className="flex items-center gap-[12px]">
                <NetraRobotIcon size={28} />
                <div className="flex flex-col">
                  <div className="flex items-center gap-[6px]">
                    <span className="text-[15px] font-bold text-[#F5F3FF]">Netra</span>
                    <span className="h-[8px] w-[8px] rounded-full bg-[#10B981]" />
                  </div>
                  <span className="text-[11px] text-[#6B6088]">AI Assistant</span>
                </div>
              </div>

              <div className="flex items-center gap-[4px]">
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  aria-label="Minimize Netra"
                  className="flex h-[32px] w-[32px] items-center justify-center rounded-full text-[#6B6088] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F5F3FF]"
                >
                  <ChevronDown size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  aria-label="Close Netra"
                  className="flex h-[32px] w-[32px] items-center justify-center rounded-full text-[#6B6088] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F5F3FF]"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="netra-scroll flex-1 overflow-y-auto bg-[#080010] px-[16px] py-[16px]">
              <div className="flex flex-col gap-[12px]">
                {messages.map((message, index) => {
                  const isAssistant = message.role === "assistant";
                  const showQuickReplies =
                    index === 0 &&
                    isAssistant &&
                    message.content === WELCOME_MESSAGE &&
                    !quickRepliesHidden &&
                    messages.length === 1;

                  return (
                    <div key={`${message.role}-${index}-${message.content.slice(0, 16)}`} className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
                      <div className="max-w-[82%]">
                        <div
                          className={`whitespace-pre-wrap px-[14px] py-[10px] text-[14px] leading-[1.5] ${
                            isAssistant
                              ? "rounded-[16px_16px_16px_4px] border border-[#1E0A35] bg-[#130224] text-[#F5F3FF]"
                              : "rounded-[16px_16px_4px_16px] bg-[#8B5CF6] text-white"
                          }`}
                        >
                          {message.content}
                        </div>

                        {showQuickReplies ? (
                          <div className="mt-[10px] flex flex-wrap gap-[8px]">
                            {QUICK_REPLIES.map((quickReply) => (
                              <button
                                key={quickReply}
                                type="button"
                                onClick={() => void sendMessage(quickReply, true)}
                                className="rounded-full border border-[#2D1255] bg-[rgba(139,92,246,0.1)] px-[14px] py-[6px] text-[13px] text-[#A78BFA] transition-all duration-200 hover:border-[#8B5CF6] hover:bg-[rgba(139,92,246,0.2)]"
                              >
                                {quickReply}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                {isTyping ? (
                  <div className="flex justify-start">
                    <div className="rounded-[16px_16px_16px_4px] border border-[#1E0A35] bg-[#130224] px-[14px] py-[12px]">
                      <div className="flex items-center gap-[6px]">
                        <span className="netra-typing-dot" />
                        <span className="netra-typing-dot" />
                        <span className="netra-typing-dot" />
                      </div>
                    </div>
                  </div>
                ) : null}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className={`border-t border-[#1E0A35] bg-[#130224] px-[14px] py-[12px] ${isMobile ? "pb-[max(12px,env(safe-area-inset-bottom))]" : ""}`}>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage(inputValue);
                }}
                className="relative"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder="Type a message..."
                  className="w-full rounded-[12px] border border-[#1E0A35] bg-[#0C0118] px-[14px] py-[10px] pr-[52px] text-[14px] text-[#F5F3FF] placeholder:text-[#6B6088] outline-none transition-colors focus:border-[#8B5CF6]"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  className="absolute right-[10px] top-1/2 flex h-[32px] w-[32px] -translate-y-1/2 items-center justify-center rounded-full text-white transition-colors duration-200 disabled:cursor-not-allowed"
                  style={{ backgroundColor: inputValue.trim() && !isTyping ? "#8B5CF6" : "#2D1255" }}
                >
                  <ArrowUp size={16} />
                </button>
              </form>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <style jsx global>{`
        @keyframes netra-glow-pulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.36); opacity: 0; }
        }

        @keyframes netra-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.65; }
          40% { transform: translateY(-4px); opacity: 1; }
        }

        .netra-glow-ring {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 2px solid rgba(139, 92, 246, 0.3);
          animation: netra-glow-pulse 3s ease-out 2;
          pointer-events: none;
        }

        .netra-bubble-arrow {
          position: absolute;
          right: 24px;
          bottom: -7px;
          width: 14px;
          height: 14px;
          border-right: 1px solid #2d1255;
          border-bottom: 1px solid #2d1255;
          background: #130224;
          transform: rotate(45deg);
        }

        .netra-robot { position: relative; display: block; overflow: visible; }
        .netra-robot__aura {
          position: absolute;
          inset: 8%;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(34,211,238,0.62) 0%, rgba(34,211,238,0.28) 38%, rgba(139,92,246,0.18) 60%, transparent 78%);
          filter: blur(calc(var(--netra-size) * 0.16));
        }
        .netra-robot__shadow {
          position: absolute;
          left: 22%;
          right: 22%;
          bottom: 4%;
          height: 10%;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(8,0,16,0.36) 0%, rgba(8,0,16,0.12) 58%, transparent 100%);
        }
        .netra-robot__hi {
          position: absolute;
          left: 4%;
          top: 2%;
          z-index: 5;
          min-width: calc(var(--netra-size) * 0.28);
          padding: calc(var(--netra-size) * 0.05) calc(var(--netra-size) * 0.1);
          border-radius: 9999px;
          background: rgba(245,243,255,0.96);
          color: #130224;
          font-size: calc(var(--netra-size) * 0.16);
          font-weight: 700;
          line-height: 1;
          text-align: center;
          box-shadow: 0 8px 20px rgba(8,0,16,0.2);
        }
        .netra-robot__hi::after {
          content: "";
          position: absolute;
          left: 32%;
          bottom: -16%;
          width: 22%;
          height: 42%;
          background: rgba(245,243,255,0.96);
          clip-path: polygon(0 0, 100% 0, 28% 100%);
        }

        .netra-robot__shell, .netra-robot__arm, .netra-robot__head, .netra-robot__visor, .netra-robot__torso, .netra-robot__core,
        .netra-robot__ear, .netra-robot__shoulder, .netra-robot__antenna, .netra-robot__arm-upper, .netra-robot__arm-lower,
        .netra-robot__hand, .netra-robot__finger { position: absolute; }

        .netra-robot__shell { inset: 0; }
        .netra-robot__antenna {
          top: 6%;
          width: 2%;
          height: 11%;
          border-radius: 9999px;
          background: linear-gradient(180deg, #a5f3fc 0%, #0ea5e9 100%);
          z-index: 1;
        }
        .netra-robot__antenna::after {
          content: "";
          position: absolute;
          left: 50%;
          top: -22%;
          width: 260%;
          aspect-ratio: 1;
          transform: translateX(-50%);
          border-radius: 9999px;
          background: #38bdf8;
          box-shadow: 0 0 10px rgba(56,189,248,0.6);
        }
        .netra-robot__antenna--left { left: 31%; transform: rotate(-6deg); }
        .netra-robot__antenna--right { right: 31%; transform: rotate(6deg); }

        .netra-robot__ear {
          top: 19%;
          width: 12%;
          height: 18%;
          border-radius: 9999px;
          background: linear-gradient(180deg, #67e8f9 0%, #0891b2 100%);
          box-shadow: inset -1px -2px 3px rgba(8,0,16,0.2), 0 2px 8px rgba(34,211,238,0.18);
          z-index: 1;
        }
        .netra-robot__ear--left { left: 18%; transform: rotate(14deg); }
        .netra-robot__ear--right { right: 18%; transform: rotate(-14deg); }

        .netra-robot__head {
          left: 50%;
          top: 12%;
          width: 48%;
          height: 28%;
          transform: translateX(-50%);
          border-radius: 48% 48% 42% 42%;
          background: linear-gradient(180deg, #ffffff 0%, #e7edf6 100%);
          box-shadow: inset 0 -3px 6px rgba(15,23,42,0.15), 0 3px 10px rgba(8,0,16,0.12);
          z-index: 3;
        }
        .netra-robot__visor {
          inset: 18% 12% 16%;
          border-radius: 9999px 9999px 56% 56%;
          background: linear-gradient(180deg, #111827 0%, #05070d 100%);
          overflow: hidden;
        }
        .netra-robot__eye {
          top: 32%;
          width: 11%;
          height: 28%;
          border-radius: 9999px;
          background: #38bdf8;
          box-shadow: 0 0 10px rgba(56,189,248,0.75);
        }
        .netra-robot__eye--left { left: 27%; }
        .netra-robot__eye--right { right: 27%; }

        .netra-robot__torso {
          left: 50%;
          top: 38%;
          width: 50%;
          height: 48%;
          transform: translateX(-50%);
          border-radius: 46% 46% 52% 52% / 32% 32% 68% 68%;
          background: linear-gradient(180deg, #ffffff 0%, #eef2f7 58%, #d8dee9 100%);
          box-shadow: inset 0 -4px 8px rgba(15,23,42,0.12), 0 6px 14px rgba(8,0,16,0.14);
          z-index: 2;
        }
        .netra-robot__torso::before {
          content: "";
          position: absolute;
          left: 10%;
          right: 10%;
          top: 12%;
          height: 6%;
          border-radius: 9999px;
          background: linear-gradient(90deg, transparent, rgba(15,23,42,0.35), transparent);
        }
        .netra-robot__shoulder {
          top: 52%;
          width: 15%;
          height: 15%;
          border-radius: 9999px;
          background: linear-gradient(180deg, #1f2937 0%, #0f172a 100%);
          box-shadow: inset 0 1px 3px rgba(255,255,255,0.08);
          z-index: 3;
        }
        .netra-robot__shoulder--left { left: 16%; }
        .netra-robot__shoulder--right { right: 16%; }
        .netra-robot__core {
          left: 50%;
          top: 53%;
          width: 30%;
          height: 30%;
          transform: translateX(-50%);
          border-radius: 9999px;
          background: radial-gradient(circle at 35% 35%, #181f2c 0%, #05070c 74%);
          border: 1px solid rgba(255,255,255,0.08);
          z-index: 4;
        }
        .netra-robot__core-ring { inset: 16%; border-radius: 9999px; border: 2px solid rgba(245,243,255,0.16); }
        .netra-robot__core-mark {
          left: 50%;
          top: 50%;
          width: 18%;
          height: 18%;
          transform: translate(-50%, -50%);
          border-radius: 9999px;
          background: #f5f3ff;
          box-shadow: 0 0 8px rgba(245,243,255,0.32);
        }

        .netra-robot__arm { z-index: 1; }
        .netra-robot__arm--left { left: 4%; top: 24%; width: 24%; height: 42%; }
        .netra-robot__arm--right { right: 7%; top: 55%; width: 18%; height: 28%; transform: rotate(10deg); }
        .netra-robot__arm-upper, .netra-robot__arm-lower {
          border-radius: 9999px;
          background: linear-gradient(180deg, #ffffff 0%, #d8e0e9 100%);
          box-shadow: inset 0 -2px 3px rgba(15,23,42,0.14);
        }
        .netra-robot__arm--left .netra-robot__arm-upper { right: 18%; top: 20%; width: 22%; height: 44%; }
        .netra-robot__arm--left .netra-robot__arm-lower { left: 16%; top: 4%; width: 18%; height: 38%; transform: rotate(30deg); transform-origin: bottom center; }
        .netra-robot__arm--right .netra-robot__arm-upper { left: 18%; top: 6%; width: 22%; height: 44%; }
        .netra-robot__arm--right .netra-robot__arm-lower { right: 12%; bottom: 18%; width: 18%; height: 34%; transform: rotate(-22deg); transform-origin: top center; }
        .netra-robot__hand {
          width: 26%;
          height: 20%;
          border-radius: 9999px;
          background: radial-gradient(circle at 35% 35%, #18212f 0%, #05070d 100%);
          border: 1px solid rgba(34,211,238,0.46);
          box-shadow: 0 0 10px rgba(34,211,238,0.16);
        }
        .netra-robot__hand--left { left: 2%; top: -2%; }
        .netra-robot__hand--right { right: 0; bottom: 0; }
        .netra-robot__finger {
          top: -22%;
          width: 14%;
          height: 40%;
          border-radius: 9999px;
          background: linear-gradient(180deg, #67e8f9 0%, #06b6d4 100%);
        }
        .netra-robot__finger--one { left: 20%; transform: rotate(-18deg); }
        .netra-robot__finger--two { left: 42%; }
        .netra-robot__finger--three { left: 64%; transform: rotate(18deg); }

        .netra-typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: #6b6088;
          animation: netra-dot-bounce 0.7s infinite ease-in-out;
        }
        .netra-typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .netra-typing-dot:nth-child(3) { animation-delay: 0.3s; }
        .netra-scroll::-webkit-scrollbar { width: 6px; }
        .netra-scroll::-webkit-scrollbar-track { background: transparent; }
        .netra-scroll::-webkit-scrollbar-thumb { background: #2d1255; border-radius: 9999px; }
      `}</style>
    </>
  );
}
