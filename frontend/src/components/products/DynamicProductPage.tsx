"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import Link from "next/link";
import { Bot, CalendarDays, MessageCircleHeart, Network, Phone } from "lucide-react";
import { toast } from "sonner";

import { Layout } from "@/components/layout/Layout";
import { RETELL_CHAT_LOGO_URL, VOICE_AGENT_NAME } from "@/lib/agent-branding";
import {
  RETELL_CHAT_IS_CONFIGURED,
  RetellChatWidget,
} from "@/components/products/RetellChatWidget";
import {
  getConfigString,
  hasConfiguredValue,
  ProductRecord,
  useSiteConfig,
  useVisibleProduct,
} from "@/lib/site-content";
import { useVapi } from "@/hooks/use-vapi";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getStatusMeta(status: ProductRecord["status"]) {
  switch (status) {
    case "live":
      return {
        label: "Live Now",
        textClass: "text-emerald-700",
        bgClass: "bg-emerald-50",
        borderClass: "border-emerald-200",
        dotClass: "bg-emerald-500",
      };
    case "beta":
      return {
        label: "Beta Access",
        textClass: "text-amber-700",
        bgClass: "bg-amber-50",
        borderClass: "border-amber-200",
        dotClass: "bg-amber-500",
      };
    default:
      return {
        label: "Coming Soon",
        textClass: "text-slate-600",
        bgClass: "bg-slate-100",
        borderClass: "border-slate-200",
        dotClass: "bg-slate-400",
      };
  }
}

function getAccent(product: ProductRecord | null) {
  switch (product?.agentType) {
    case "voice":
      return { icon: Phone, glow: "rgba(37,99,235,0.06)", border: "#2563EB", iconClass: "text-[#2563EB]" };
    case "chat":
      return {
        icon: MessageCircleHeart,
        glow: "rgba(37,99,235,0.06)",
        border: "#2563EB",
        iconClass: "text-[#2563EB]",
      };
    case "social":
      return {
        icon: CalendarDays,
        glow: "rgba(245,158,11,0.06)",
        border: "#F59E0B",
        iconClass: "text-amber-600",
      };
    case "workflow":
      return { icon: Network, glow: "rgba(37,99,235,0.06)", border: "#2563EB", iconClass: "text-[#2563EB]" };
    default:
      return { icon: Bot, glow: "rgba(37,99,235,0.06)", border: "#2563EB", iconClass: "text-[#2563EB]" };
  }
}

function getVoiceStatusCopy({
  isConfigured,
  isConnecting,
  isConnected,
  isSpeaking,
  error,
}: {
  isConfigured: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  isSpeaking: boolean;
  error: string | null;
}) {
  if (!isConfigured) {
    return "";
  }

  if (error) {
    return `We couldn't connect to ${VOICE_AGENT_NAME} right now. Please try again in a moment.`;
  }

  if (isConnecting) {
    return `Connecting to ${VOICE_AGENT_NAME}. Browser web calls usually take 5-10 seconds.`;
  }

  if (isConnected && isSpeaking) {
    return `${VOICE_AGENT_NAME} is speaking now. Reply naturally when it pauses.`;
  }

  if (isConnected) {
    return `You are live with ${VOICE_AGENT_NAME} now. Start speaking naturally.`;
  }

  return "";
}

function getChatConversationStarters(product: ProductRecord | null) {
  const featurePrompts = (product?.features ?? [])
    .map((feature) => feature.title.trim())
    .filter(Boolean)
    .map((title) => `Tell me more about ${title.toLowerCase()}.`);

  const defaultPrompts = [
    `How would ${product?.name ?? "this chat agent"} work on my website?`,
    "How do you qualify and capture leads automatically?",
    "How fast can this go live on my site?",
  ];

  return Array.from(new Set([...featurePrompts, ...defaultPrompts])).slice(0, 3);
}

function getChatDynamicContext({
  companyName,
  product,
  slug,
  starterPrompt,
}: {
  companyName: string;
  product: ProductRecord | null;
  slug: string;
  starterPrompt: string;
}) {
  return {
    company_name: companyName,
    product_name: product?.name ?? "AI Chat Agent",
    product_slug: product?.slug ?? slug,
    product_tagline: product?.tagline ?? "",
    page_path: `/products/${product?.slug ?? slug}`,
    launch_context: starterPrompt ? "conversation_starter" : "cta_button",
    starter_prompt: starterPrompt,
  };
}

function ProductWaitlistForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!emailPattern.test(email.trim())) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          source: "waitlist",
          interestedProduct: slug,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setStatus("error");
        setMessage(payload?.error || "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setMessage("You're on the list! We'll notify you when early access opens.");
      setEmail("");
    } catch (error) {
      console.error("Failed to submit waitlist signup", error);
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="w-full max-w-[520px]">
      {status === "success" ? (
        <p className="text-center font-sans text-[15px] font-medium text-emerald-600">{message}</p>
      ) : (
        <form className="flex flex-col gap-[14px] sm:flex-row" onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your work email"
            className="h-[52px] flex-1 rounded-xl border border-slate-200 bg-white px-4 font-sans text-[15px] text-[#0F172A] placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none shadow-2xs"
          />
          <button
            type="submit"
            disabled={status === "submitting"}
            className="h-[52px] rounded-xl bg-[#2563EB] px-6 font-sans text-[15px] font-semibold text-white shadow-xs transition-all duration-300 hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {status === "submitting" ? "Submitting..." : "Get Early Access ->"}
          </button>
        </form>
      )}

      {status === "error" ? (
        <p className="mt-[12px] text-center font-sans text-[14px] text-rose-500">{message}</p>
      ) : null}
    </div>
  );
}

export function DynamicProductPage({ slug }: { slug: string }) {
  const { data: siteConfig } = useSiteConfig();
  const { data: product, loading } = useVisibleProduct(slug);
  const { toggleCall, isConnecting, isConnected, isSpeaking, error, isConfigured } = useVapi();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [chatDemoStatus, setChatDemoStatus] = useState<"idle" | "loading" | "open" | "closed" | "error">("idle");
  const [chatDemoError, setChatDemoError] = useState("");
  const [chatStarterPrompt, setChatStarterPrompt] = useState("");
  const [chatOpenRequest, setChatOpenRequest] = useState(0);

  const demoPhoneNumber = getConfigString(siteConfig, "demo_phone_number");
  const companyName = getConfigString(siteConfig, "company_name") || "Trinetra AI";
  const isVoiceProduct = product?.agentType === "voice" || product?.slug === "voice-agent";
  const isChatProduct = product?.agentType === "chat" || product?.slug === "chat-agent";

  useEffect(() => {
    if (!product) {
      return;
    }

    document.title = product.metaTitle || `${product.name} — Trinetra AI`;
  }, [product]);

  useEffect(() => {
    setChatDemoStatus("idle");
    setChatDemoError("");
    setChatStarterPrompt("");
    setChatOpenRequest(0);
  }, [slug]);

  const accent = getAccent(product);
  const statusMeta = getStatusMeta(product?.status ?? "coming_soon");
  const chatConversationStarters = getChatConversationStarters(product);
  const chatDynamicContext = getChatDynamicContext({
    companyName,
    product,
    slug,
    starterPrompt: chatStarterPrompt,
  });
  const voiceStatusCopy = getVoiceStatusCopy({
    isConfigured,
    isConnecting,
    isConnected,
    isSpeaking,
    error,
  });
  const voiceStatusTone = error
    ? "border-[rgba(239,68,68,0.24)] bg-[rgba(127,29,29,0.22)] text-[#FCA5A5]"
    : isConnected
      ? "border-[rgba(16,185,129,0.24)] bg-[rgba(6,78,59,0.2)] text-[#A7F3D0]"
      : "border-[rgba(139,92,246,0.24)] bg-[rgba(45,18,85,0.32)] text-[#C4B5FD]";
  const chatStatusCopy =
    chatDemoStatus === "loading"
      ? `Opening the live chat demo for ${product?.name ?? "your AI agent"}.`
      : chatDemoStatus === "open" && chatStarterPrompt
        ? `Suggested first message: "${chatStarterPrompt}"`
        : chatDemoStatus === "error"
          ? chatDemoError ||
            "We couldn't load the live chat demo. Check your Retell public key and allowed domains."
          : "";
  const chatStatusTone =
    chatDemoStatus === "error"
      ? "border-[rgba(239,68,68,0.24)] bg-[rgba(127,29,29,0.22)] text-[#FCA5A5]"
      : chatDemoStatus === "open"
        ? "border-[rgba(192,132,252,0.24)] bg-[rgba(76,29,149,0.22)] text-[#E9D5FF]"
        : "border-[rgba(6,182,212,0.24)] bg-[rgba(8,47,73,0.24)] text-[#A5F3FC]";
  const secondaryButtonLabel =
    isVoiceProduct && isConfigured
      ? isConnecting
        ? "Connecting..."
        : isConnected
          ? `End ${VOICE_AGENT_NAME} Call`
          : `Talk to ${VOICE_AGENT_NAME}`
      : isChatProduct && RETELL_CHAT_IS_CONFIGURED
        ? chatDemoStatus === "loading"
          ? "Summoning Netra..."
          : chatDemoStatus === "open"
            ? "Netra is Live"
            : chatDemoStatus === "closed"
              ? "Bring Netra Back"
              : chatDemoStatus === "error"
                ? "Wake Netra Again"
                : "Ask Netra Anything"
        : hasConfiguredValue(demoPhoneNumber)
          ? "Try AI Demo"
          : "Request a Demo";

  const handleDemoClick = (starterPrompt?: string) => {
    window.location.assign("/login");
  };

  if (loading) {
    return (
      <Layout>
        <section className="min-h-[calc(100vh-72px)] bg-[#FAFAFA] px-5 pb-28 pt-36">
          <div className="mx-auto max-w-[720px] rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center font-sans text-[15px] text-[#64748B] shadow-xs">
            Loading product details...
          </div>
        </section>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <section className="min-h-[calc(100vh-72px)] bg-[#FAFAFA] px-5 pb-28 pt-36">
          <div className="mx-auto max-w-[720px] rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-xs">
            <p className="font-sans text-base font-bold text-[#0F172A]">Product not found.</p>
            <Link
              href="/"
              className="mt-4 inline-flex font-sans text-sm font-semibold text-[#2563EB] transition-colors hover:text-[#1D4ED8]"
            >
              Back to Home
            </Link>
          </div>
        </section>
      </Layout>
    );
  }

  const AccentIcon = accent.icon;

  return (
    <Layout>
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#FAFAFA] text-[#0F172A] font-sans selection:bg-blue-500/20">
        {isChatProduct ? (
          <RetellChatWidget
            enabled={true}
            dynamic={chatDynamicContext}
            logoUrl={RETELL_CHAT_LOGO_URL}
            openRequestId={chatOpenRequest}
            onReady={() => {
              setChatDemoError("");
            }}
            onOpenChange={(isOpen) => {
              if (isOpen) {
                setChatDemoError("");
                setChatDemoStatus("open");
                return;
              }

              setChatDemoError("");
              setChatDemoStatus("idle");
            }}
            onError={(message) => {
              setChatDemoError(message);
              setChatDemoStatus("error");
            }}
          />
        ) : null}

        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: `radial-gradient(ellipse 800px 500px at top center, rgba(37,99,235,0.06) 0%, transparent 70%)`,
          }}
        />

        {/* Hero Section */}
        <section className="relative z-10 flex w-full flex-col items-center px-5 pb-16 pt-32 text-center">
          <div
            className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-sans text-xs font-bold uppercase tracking-wider font-mono ${statusMeta.bgClass} ${statusMeta.borderClass} ${statusMeta.textClass}`}
          >
            <span className={`h-2 w-2 rounded-full ${statusMeta.dotClass}`} />
            {statusMeta.label}
          </div>

          <div
            className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-xs"
          >
            <AccentIcon size={32} className="text-[#2563EB]" />
          </div>

          <h1 className="mb-4 font-sans text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#0F172A]">
            {product.name}
          </h1>

          {product.description ? (
            <p className="mb-8 max-w-[620px] font-sans text-sm sm:text-base leading-relaxed text-[#64748B]">
              {product.description}
            </p>
          ) : null}

          {product.status === "coming_soon" ? (
            <ProductWaitlistForm slug={product.slug} />
          ) : (
            <div className="flex w-full flex-col gap-3.5 sm:w-auto sm:flex-row">
              <Link
                href="/login"
                className="rounded-full bg-[#2563EB] px-8 py-3.5 font-sans text-sm sm:text-base font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-[#1D4ED8] hover:-translate-y-0.5"
              >
                Activate Your AI {"->"}
              </Link>
              <button
                type="button"
                onClick={() => handleDemoClick()}
                className="rounded-full border border-slate-200 bg-white px-8 py-3.5 font-sans text-sm sm:text-base font-semibold text-[#0F172A] shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300 cursor-pointer"
              >
                {secondaryButtonLabel}
              </button>
            </div>
          )}

          {isVoiceProduct && voiceStatusCopy ? (
            <div
              className={`mt-4 w-full max-w-[620px] rounded-xl border px-4 py-3 text-left font-sans text-xs sm:text-sm leading-relaxed ${voiceStatusTone}`}
            >
              {voiceStatusCopy}
            </div>
          ) : null}

          {isChatProduct && chatStatusCopy ? (
            <div
              className={`mt-4 w-full max-w-[620px] rounded-xl border px-4 py-3 text-left font-sans text-xs sm:text-sm leading-relaxed ${chatStatusTone}`}
            >
              {chatStatusCopy}
            </div>
          ) : null}

          {isChatProduct && chatConversationStarters.length > 0 ? (
            <div className="mt-8 w-full max-w-[820px] rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
              <span className="block text-center font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Suggested Prompts
              </span>
              <div className="mt-4 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                {chatConversationStarters.map((prompt) => {
                  const isActivePrompt = chatStarterPrompt === prompt;
                  return (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleDemoClick(prompt)}
                      className={`min-h-[50px] w-full rounded-2xl border px-4 py-3 text-center font-sans text-xs sm:text-[13px] font-medium leading-relaxed transition-all duration-200 cursor-pointer ${
                        isActivePrompt
                          ? "border-[#2563EB] bg-blue-50/80 text-[#2563EB] font-semibold"
                          : "border-slate-200 bg-slate-50/60 text-[#334155] hover:border-[#2563EB]/40 hover:bg-blue-50/30 hover:text-[#2563EB]"
                      }`}
                    >
                      {prompt}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        {/* What It Does / Features */}
        {product.features.length > 0 ? (
          <section className="relative z-10 w-full px-5 py-16">
            <div className="mx-auto max-w-[1200px]">
              <h2 className="mb-10 text-center font-sans text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
                Core Capabilities
              </h2>
              <div className={`grid grid-cols-1 gap-5 ${product.features.length > 1 ? "md:grid-cols-2 lg:grid-cols-3" : ""}`}>
                {product.features.map((feature) => (
                  <div
                    key={`${feature.title}-${feature.description}`}
                    className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs hover:border-[#2563EB]/40 hover:shadow-[0_12px_32px_rgba(37,99,235,0.06)] transition-all duration-300"
                  >
                    {feature.title ? (
                      <h3 className="mb-2.5 font-sans text-lg font-bold text-[#0F172A]">
                        {feature.title}
                      </h3>
                    ) : null}
                    {feature.description ? (
                      <p className="font-sans text-xs sm:text-sm leading-relaxed text-[#64748B]">
                        {feature.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* How It Works */}
        {product.howItWorks.length > 0 ? (
          <section className="relative z-10 w-full border-y border-slate-200 bg-[#F8FAFC] px-5 py-16">
            <div className="mx-auto flex max-w-[840px] flex-col items-center">
              <h2 className="mb-12 font-sans text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
                How It Works
              </h2>
              <div className="relative flex w-full flex-col gap-8 sm:gap-10 pl-5">
                <div className="absolute bottom-6 left-10 top-6 z-0 w-[2px] border-l-2 border-dashed border-slate-300" />
                {product.howItWorks.map((step, index) => (
                  <div key={`${step.title}-${index}`} className="relative z-10 flex gap-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white font-mono text-base font-bold text-[#2563EB] shadow-xs">
                      {index + 1}
                    </div>
                    <div className="flex flex-col pt-1">
                      {step.title ? (
                        <h3 className="mb-1.5 font-sans text-base sm:text-lg font-bold text-[#0F172A]">
                          {step.title}
                        </h3>
                      ) : null}
                      {step.description ? (
                        <p className="max-w-[560px] font-sans text-xs sm:text-sm font-normal leading-relaxed text-[#64748B]">
                          {step.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* Target Use Cases */}
        {product.useCases.length > 0 ? (
          <section className="relative z-10 w-full px-5 py-16">
            <div className="mx-auto max-w-[1200px]">
              <h2 className="mb-10 text-center font-sans text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
                Engineered For Your Industry
              </h2>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {product.useCases.map((useCase) => (
                  <div
                    key={`${useCase.industry}-${useCase.description}`}
                    className="flex gap-4 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs"
                  >
                    <div className="text-2xl leading-none">{useCase.emoji || "⚡"}</div>
                    <div>
                      {useCase.industry ? (
                        <h3 className="mb-1.5 font-sans text-base font-bold text-[#0F172A]">
                          {useCase.industry}
                        </h3>
                      ) : null}
                      {useCase.description ? (
                        <p className="font-sans text-xs sm:text-sm leading-relaxed text-[#64748B]">
                          {useCase.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* FAQ */}
        {product.faq.length > 0 ? (
          <section className="relative z-10 w-full border-t border-slate-200 bg-[#F8FAFC] px-5 py-16">
            <div className="mx-auto max-w-[840px]">
              <h2 className="mb-10 text-center font-sans text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
                Frequently Asked Questions
              </h2>
              <div className="flex flex-col gap-3.5">
                {product.faq.map((item, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div
                      key={`${item.question}-${index}`}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq((current) => (current === index ? null : index))}
                        className="flex w-full items-center justify-between p-5 text-left cursor-pointer"
                      >
                        <span className="font-sans text-sm sm:text-base font-bold text-[#0F172A]">
                          {item.question}
                        </span>
                        <span className={`text-slate-400 font-mono transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                          ↓
                        </span>
                      </button>
                      {isOpen ? (
                        <div className="px-5 pb-5 pt-0 font-sans text-xs sm:text-sm leading-relaxed text-[#64748B] border-t border-slate-100 bg-slate-50/50">
                          {item.answer}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {/* Bottom CTA */}
        <section className="relative z-10 flex w-full flex-col items-center px-5 py-16 text-center">
          <h2 className="mb-6 font-sans text-2xl sm:text-3xl font-black text-[#0F172A]">
            Ready to deploy your AI voice pipeline?
          </h2>
          {product.status === "coming_soon" ? (
            <ProductWaitlistForm slug={product.slug} />
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[#2563EB] px-10 py-4 font-sans text-base font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-[#1D4ED8] hover:-translate-y-0.5"
            >
              Activate Your AI {"->"}
            </Link>
          )}
        </section>
      </div>
    </Layout>
  );
}
