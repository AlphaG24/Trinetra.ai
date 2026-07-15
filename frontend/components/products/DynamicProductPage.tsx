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
        label: "Live",
        textClass: "text-[#10B981]",
        bgClass: "bg-[rgba(16,185,129,0.1)]",
        borderClass: "border-[rgba(16,185,129,0.18)]",
        dotClass: "bg-[#10B981]",
      };
    case "beta":
      return {
        label: "Beta",
        textClass: "text-[#F59E0B]",
        bgClass: "bg-[rgba(245,158,11,0.1)]",
        borderClass: "border-[rgba(245,158,11,0.18)]",
        dotClass: "bg-[#F59E0B]",
      };
    default:
      return {
        label: "Coming Soon",
        textClass: "text-[#A8A0C0]",
        bgClass: "bg-[rgba(107,96,136,0.12)]",
        borderClass: "border-[rgba(107,96,136,0.18)]",
        dotClass: "bg-[#6B6088]",
      };
  }
}

function getAccent(product: ProductRecord | null) {
  switch (product?.agentType) {
    case "voice":
      return { icon: Phone, glow: "rgba(139,92,246,0.1)", border: "#8B5CF6", iconClass: "text-[#A78BFA]" };
    case "chat":
      return {
        icon: MessageCircleHeart,
        glow: "rgba(192,132,252,0.14)",
        border: "#C084FC",
        iconClass: "text-[#F0ABFC]",
      };
    case "social":
      return {
        icon: CalendarDays,
        glow: "rgba(245,158,11,0.1)",
        border: "#F59E0B",
        iconClass: "text-[#F59E0B]",
      };
    case "workflow":
      return { icon: Network, glow: "rgba(167,139,250,0.1)", border: "#A78BFA", iconClass: "text-[#A78BFA]" };
    default:
      return { icon: Bot, glow: "rgba(139,92,246,0.1)", border: "#8B5CF6", iconClass: "text-[#A78BFA]" };
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
        <p className="text-center font-sans text-[15px] font-medium text-[#10B981]">{message}</p>
      ) : (
        <form className="flex flex-col gap-[14px] sm:flex-row" onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            className="h-[52px] flex-1 rounded-[12px] border border-[#1E0A35] bg-[#0C0118] px-[16px] font-sans text-[15px] text-[#F5F3FF] placeholder:text-[#6B6088] focus:border-[#8B5CF6] focus:outline-none"
          />
          <button
            type="submit"
            disabled={status === "submitting"}
            className="h-[52px] rounded-[12px] bg-[#F59E0B] px-[22px] font-sans text-[15px] font-semibold text-[#080010] transition-all duration-300 hover:bg-[#D97706] disabled:cursor-not-allowed disabled:bg-[#A8A0C0]"
          >
            {status === "submitting" ? "Submitting..." : "Get Early Access ->"}
          </button>
        </form>
      )}

      {status === "error" ? (
        <p className="mt-[12px] text-center font-sans text-[14px] text-[#EF4444]">{message}</p>
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
        <section className="min-h-[calc(100vh-72px)] bg-[#080010] px-[20px] pb-[120px] pt-[140px]">
          <div className="mx-auto max-w-[720px] rounded-[24px] border border-[#1E0A35] bg-[#130224] px-[24px] py-[32px] text-center font-sans text-[15px] text-[#A8A0C0]">
            Loading product...
          </div>
        </section>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <section className="min-h-[calc(100vh-72px)] bg-[#080010] px-[20px] pb-[120px] pt-[140px]">
          <div className="mx-auto max-w-[720px] rounded-[24px] border border-[#1E0A35] bg-[#130224] px-[24px] py-[32px] text-center">
            <p className="font-sans text-[16px] text-[#A8A0C0]">Product not found.</p>
            <Link
              href="/"
              className="mt-[16px] inline-flex font-sans text-[15px] text-[#A78BFA] transition-colors hover:text-[#F5F3FF]"
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
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#080010]">
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
            background: `radial-gradient(ellipse 800px 500px at top center, ${accent.glow} 0%, transparent 70%)`,
          }}
        />

        <section className="relative z-10 flex w-full flex-col items-center px-[20px] pb-[80px] pt-[140px] text-center">
          <div
            className={`mb-[24px] inline-flex items-center gap-[8px] rounded-full border px-[16px] py-[6px] font-sans text-[13px] font-medium ${statusMeta.bgClass} ${statusMeta.borderClass} ${statusMeta.textClass}`}
          >
            <span className={`h-[6px] w-[6px] rounded-full ${statusMeta.dotClass}`} />
            {statusMeta.label}
          </div>

          <div
            className="mb-[24px] flex h-[64px] w-[64px] items-center justify-center rounded-[16px] border bg-[#130224] shadow-[0_0_30px_rgba(139,92,246,0.18)]"
            style={{ borderColor: accent.border }}
          >
            <AccentIcon size={32} className={accent.iconClass} />
          </div>

          <h1 className="mb-[24px] font-display text-[40px] font-bold leading-tight tracking-[-0.02em] text-[#F5F3FF] md:text-[52px]">
            {product.name}
          </h1>

          {product.description ? (
            <p className="mb-[40px] max-w-[620px] font-sans text-[16px] font-normal leading-relaxed text-[#A8A0C0] md:text-[18px]">
              {product.description}
            </p>
          ) : null}

          {product.status === "coming_soon" ? (
            <ProductWaitlistForm slug={product.slug} />
          ) : (
            <div className="flex w-full flex-col gap-[16px] sm:w-auto sm:flex-row">
              <Link
                href="/login"
                className="rounded-full bg-[#FBBF24] px-[32px] py-[16px] font-sans text-[16px] font-semibold text-[#080010] shadow-[0_0_30px_rgba(251,191,36,0.2)] transition-all hover:-translate-y-1 hover:bg-[#F59E0B]"
              >
                Activate Your AI {"->"}
              </Link>
              <button
                type="button"
                onClick={() => handleDemoClick()}
                className="rounded-full border border-[#2D1255] bg-[rgba(19,2,36,0.5)] px-[32px] py-[16px] font-sans text-[16px] font-medium text-[#A78BFA] transition-all hover:-translate-y-1 hover:bg-[#2D1255] hover:text-[#F5F3FF]"
              >
                {secondaryButtonLabel}
              </button>
            </div>
          )}

          {isVoiceProduct && voiceStatusCopy ? (
            <div
              className={`mt-[18px] w-full max-w-[620px] rounded-[16px] border px-[18px] py-[14px] text-left font-sans text-[14px] leading-[1.6] ${voiceStatusTone}`}
            >
              {voiceStatusCopy}
            </div>
          ) : null}

          {isChatProduct && chatStatusCopy ? (
            <div
              className={`mt-[18px] w-full max-w-[620px] rounded-[16px] border px-[18px] py-[14px] text-left font-sans text-[14px] leading-[1.6] ${chatStatusTone}`}
            >
              {chatStatusCopy}
            </div>
          ) : null}

          {isChatProduct && chatConversationStarters.length > 0 ? (
            <div className="mt-[28px] w-full max-w-[820px] rounded-[24px] border border-[rgba(45,18,85,0.78)] bg-[rgba(12,1,24,0.82)] px-[18px] py-[18px] sm:px-[24px]">
              <span className="block text-center font-sans text-[12px] font-semibold uppercase tracking-[0.22em] text-[#6B6088]">
                Conversation Starters
              </span>
              <div className="mt-[16px] grid w-full grid-cols-1 gap-[12px] sm:grid-cols-2">
                {chatConversationStarters.map((prompt, index) => {
                  const isActivePrompt = chatStarterPrompt === prompt;
                  const shouldCenterLastPrompt =
                    chatConversationStarters.length % 2 === 1 &&
                    index === chatConversationStarters.length - 1;

                  return (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleDemoClick(prompt)}
                      className={`min-h-[56px] w-full rounded-[18px] border px-[18px] py-[14px] text-center font-sans text-[14px] font-medium leading-[1.5] transition-all duration-300 hover:-translate-y-0.5 ${
                        shouldCenterLastPrompt ? "sm:col-span-2 sm:mx-auto sm:max-w-[360px]" : ""
                      } ${
                        isActivePrompt
                          ? "border-[rgba(192,132,252,0.5)] bg-[rgba(76,29,149,0.3)] text-[#F5D0FE]"
                          : "border-[rgba(45,18,85,0.9)] bg-[rgba(19,2,36,0.52)] text-[#C4B5FD] hover:border-[rgba(192,132,252,0.45)] hover:bg-[rgba(45,18,85,0.45)] hover:text-[#F5F3FF]"
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

        {product.features.length > 0 ? (
          <section className="relative z-10 w-full px-[20px] py-[80px]">
            <div className="mx-auto max-w-[1200px]">
              <h2 className="mb-[40px] text-center font-display text-[32px] font-bold text-[#F5F3FF]">
                What It Does
              </h2>
              <div className={`grid grid-cols-1 gap-[24px] ${product.features.length > 1 ? "md:grid-cols-2 lg:grid-cols-3" : ""}`}>
                {product.features.map((feature) => (
                  <div
                    key={`${feature.title}-${feature.description}`}
                    className="rounded-[16px] border border-[#1E0A35] bg-[#130224] p-[32px]"
                  >
                    {feature.title ? (
                      <h3 className="mb-[12px] font-display text-[20px] font-semibold text-[#F5F3FF]">
                        {feature.title}
                      </h3>
                    ) : null}
                    {feature.description ? (
                      <p className="font-sans text-[15px] leading-[1.7] text-[#A8A0C0]">
                        {feature.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {product.howItWorks.length > 0 ? (
          <section className="relative z-10 w-full border-y border-[#1E0A35] bg-[#0C0118] px-[20px] py-[80px]">
            <div className="mx-auto flex max-w-[840px] flex-col items-center">
              <h2 className="mb-[64px] font-display text-[32px] font-bold text-[#F5F3FF]">
                How It Works
              </h2>
              <div className="relative flex w-full flex-col gap-[48px] pl-[20px]">
                <div className="absolute bottom-[24px] left-[44px] top-[24px] z-0 w-[2px] border-l-2 border-dotted border-[#2D1255]" />
                {product.howItWorks.map((step, index) => (
                  <div key={`${step.title}-${index}`} className="relative z-10 flex gap-[24px]">
                    <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full border border-[#8B5CF6] bg-[#130224] font-display text-[20px] font-bold text-[#A78BFA] shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                      {index + 1}
                    </div>
                    <div className="flex flex-col pt-[8px]">
                      {step.title ? (
                        <h3 className="mb-[8px] font-display text-[20px] font-semibold text-[#F5F3FF]">
                          {step.title}
                        </h3>
                      ) : null}
                      {step.description ? (
                        <p className="max-w-[560px] font-sans text-[15px] font-normal leading-relaxed text-[#A8A0C0]">
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

        {product.useCases.length > 0 ? (
          <section className="relative z-10 w-full px-[20px] py-[100px]">
            <div className="mx-auto max-w-[1200px]">
              <h2 className="mb-[48px] text-center font-display text-[32px] font-bold text-[#F5F3FF]">
                Built For
              </h2>
              <div className="grid grid-cols-1 gap-[24px] md:grid-cols-2">
                {product.useCases.map((useCase) => (
                  <div
                    key={`${useCase.industry}-${useCase.description}`}
                    className="flex gap-[16px] rounded-[16px] border border-[#1E0A35] bg-[#130224] p-[24px]"
                  >
                    <div className="text-[32px] leading-none">{useCase.emoji || "*"}</div>
                    <div>
                      {useCase.industry ? (
                        <h3 className="mb-[8px] font-display text-[18px] font-semibold text-[#F5F3FF]">
                          {useCase.industry}
                        </h3>
                      ) : null}
                      {useCase.description ? (
                        <p className="font-sans text-[14px] leading-[1.7] text-[#A8A0C0]">
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

        {product.faq.length > 0 ? (
          <section className="relative z-10 w-full border-t border-[#1E0A35] bg-[#0C0118] px-[20px] py-[80px]">
            <div className="mx-auto max-w-[840px]">
              <h2 className="mb-[48px] text-center font-display text-[32px] font-bold text-[#F5F3FF]">
                Frequently Asked Questions
              </h2>
              <div className="flex flex-col gap-[16px]">
                {product.faq.map((item, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div
                      key={`${item.question}-${index}`}
                      className="overflow-hidden rounded-[12px] border border-[#1E0A35] bg-[#130224]"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq((current) => (current === index ? null : index))}
                        className="flex w-full items-center justify-between p-[20px] text-left"
                      >
                        <span className="font-sans text-[16px] font-medium text-[#F5F3FF]">
                          {item.question}
                        </span>
                        <span className={`text-[#6B6088] transition-transform ${isOpen ? "rotate-180" : ""}`}>
                          v
                        </span>
                      </button>
                      {isOpen ? (
                        <div className="px-[20px] pb-[20px] pt-[0px] font-sans text-[15px] leading-relaxed text-[#A8A0C0]">
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

        <section className="relative z-10 flex w-full flex-col items-center px-[20px] py-[100px] text-center">
          <h2 className="mb-[32px] font-display text-[36px] font-bold text-[#F5F3FF]">
            Ready to get started?
          </h2>
          {product.status === "coming_soon" ? (
            <ProductWaitlistForm slug={product.slug} />
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[#FBBF24] px-[40px] py-[20px] font-sans text-[18px] font-bold text-[#080010] shadow-[0_0_40px_rgba(251,191,36,0.25)] transition-all hover:-translate-y-1 hover:bg-[#F59E0B]"
            >
              Activate Your AI {"->"}
            </Link>
          )}
        </section>
      </div>
    </Layout>
  );
}
