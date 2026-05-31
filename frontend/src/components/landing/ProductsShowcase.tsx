"use client";

import React from "react";

import { motion } from "framer-motion";
import {
  Bot,
  Check,
  Database,
  GitCommit,
  Mail,
  Send,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { SocialAgentGallery } from "@/components/social/SocialAgentGallery";
import { VOICE_AGENT_NAME } from "@/lib/agent-branding";
import { ProductRecord, useVisibleProducts } from "@/lib/site-content";

const VoiceVisual = () => (
  <div className="mx-auto flex w-full max-w-[420px] flex-col items-center rounded-[20px] border border-[#1E0A35] bg-[#130224] p-[32px] shadow-[0_20px_60px_rgba(122,63,145,0.1)]">
    <div className="mb-[8px] text-[13px] font-semibold uppercase tracking-wider text-[#6B6088]">
      Incoming Call
    </div>
    <div className="mb-[4px] font-display text-[32px] font-medium text-[#F2EAF7]">{VOICE_AGENT_NAME}</div>
    <div className="mb-[32px] font-mono text-[16px] text-[#C59DD9]">02:34</div>

    <div className="relative w-full rounded-[16px] rounded-tl-sm bg-[#2B0D3E] p-[20px] text-[15px] leading-relaxed text-[#A8A0C0] shadow-md">
      {"Good afternoon! I'd be happy to book an appointment for you. Dr. Patel is available tomorrow at 3 PM. Shall I confirm?"}
    </div>

    <div className="mt-[40px] flex items-center gap-[10px] rounded-full border border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.1)] px-[20px] py-[8px] text-[14px] font-medium text-[#10B981]">
      <span className="h-[10px] w-[10px] animate-pulse rounded-full bg-[#10B981]" />
      AI Handling
    </div>
  </div>
);

const ChatVisual = () => (
  <div className="mx-auto flex w-full max-w-[420px] flex-col overflow-hidden rounded-[20px] border border-[#1E0A35] bg-[#130224] shadow-[0_20px_60px_rgba(122,63,145,0.1)]">
    <div className="flex items-center gap-[14px] border-b border-[#1E0A35] bg-[#2B0D3E] p-[20px]">
      <div className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[rgba(122,63,145,0.15)] text-[#7A3F91]">
        <Bot size={24} />
      </div>
      <div>
        <div className="text-[16px] font-medium text-[#F2EAF7]">Trinetra Support</div>
        <div className="flex items-center gap-[6px] text-[13px] text-[#10B981]">
          <span className="h-[8px] w-[8px] animate-pulse rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          Online actively
        </div>
      </div>
    </div>

    <div className="flex min-h-[300px] flex-col gap-[20px] p-[24px]">
      <div className="max-w-[85%] self-end rounded-[14px] rounded-tr-sm border border-[rgba(122,63,145,0.2)] bg-[rgba(122,63,145,0.15)] px-[16px] py-[12px] text-[15px] text-[#E5E7EB]">
        Do you integrate with my existing CRM out of the box?
      </div>
      <div className="max-w-[85%] self-start rounded-[14px] rounded-tl-sm border border-[#2D1255] bg-[#1E0A35] px-[16px] py-[12px] text-[15px] leading-relaxed text-[#A8A0C0]">
        Yes! We natively integrate with Salesforce, HubSpot, and 50+ other CRMs instantly.
        We also support custom generic webhooks if needed!
      </div>
    </div>

    <div className="border-t border-[#1E0A35] bg-[#1E0A35] p-[16px]">
      <div className="flex w-full items-center justify-between rounded-full border border-[#2D1255] bg-[#080010] px-[20px] py-[12px] text-[14px] text-[#6B6088]">
        Type a message...
        <Send size={16} className="text-[#C59DD9]" />
      </div>
    </div>
  </div>
);

const SocialVisual = () => <SocialAgentGallery />;

const WorkflowVisual = () => (
  <div className="relative mx-auto flex w-full max-w-[400px] flex-col overflow-hidden rounded-[20px] border border-[#1E0A35] bg-[#130224] p-[24px] shadow-[0_20px_60px_rgba(122,63,145,0.1)]">
    <div className="mb-[20px] flex items-center justify-between border-b border-[#2D1255] pb-[16px]">
      <div className="flex items-center gap-[10px]">
        <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-[#7A3F91]/20 text-[#C59DD9]">
          <Workflow size={20} />
        </div>
        <div>
          <div className="text-[15px] font-medium text-[#F2EAF7]">Lead Processing</div>
          <div className="mt-[2px] flex items-center gap-[4px] text-[12px] text-[#10B981]">
            <div className="h-[6px] w-[6px] animate-pulse rounded-full bg-[#10B981]" />
            Active
          </div>
        </div>
      </div>
      <button className="flex items-center gap-[6px] rounded-[6px] bg-[#2D1255] px-[12px] py-[6px] font-sans text-[12px] text-[#A8A0C0]">
        <Zap size={14} className="text-[#F59E0B]" /> Run Now
      </button>
    </div>

    <div className="relative z-10 flex w-full flex-col gap-[16px] pl-[8px]">
      <div className="relative flex items-center gap-[16px] overflow-hidden rounded-[12px] border border-[#2D1255] bg-[#2B0D3E] p-[14px] shadow-sm">
        <div className="absolute left-0 top-0 h-full w-[4px] bg-[#7A3F91]" />
        <Mail size={22} className="ml-[4px] shrink-0 text-[#C59DD9]" />
        <div className="flex-1 truncate">
          <div className="truncate text-[14px] font-medium text-[#F2EAF7]">1. Incoming Email</div>
          <div className="truncate text-[13px] text-[#6B6088]">Trigger on new lead@...</div>
        </div>
      </div>

      <div className="relative ml-[36px] h-[16px] w-[2px] bg-[#2D1255] opacity-50" />

      <div className="relative flex items-center gap-[16px] overflow-hidden rounded-[12px] border border-[#7A3F91]/40 bg-[#2B0D3E] p-[14px] shadow-[0_0_15px_rgba(122,63,145,0.1)]">
        <div className="absolute left-0 top-0 h-full w-[4px] bg-gradient-to-b from-[#7A3F91] to-[#FBBF24]" />
        <Bot size={22} className="ml-[4px] shrink-0 text-[#FBBF24]" />
        <div className="flex-1 truncate">
          <div className="truncate text-[14px] font-medium text-[#F2EAF7]">2. AI Extraction</div>
          <div className="truncate text-[13px] text-[#A8A0C0]">Extract Intent &amp; Budget</div>
        </div>
        <Sparkles size={16} className="mr-[4px] shrink-0 animate-pulse text-[#FBBF24]" />
      </div>

      <div className="relative ml-[36px] h-[16px] w-[2px] bg-[#2D1255] opacity-50">
        <GitCommit
          size={14}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#130224] p-[1px] text-[#A8A0C0]"
        />
      </div>

      <div className="relative flex items-center gap-[16px] overflow-hidden rounded-[12px] border border-[#2D1255] bg-[#2B0D3E] p-[14px] shadow-sm">
        <div className="absolute left-0 top-0 h-full w-[4px] bg-[#10B981]" />
        <Database size={22} className="ml-[4px] shrink-0 text-[#10B981]" />
        <div className="flex-1 truncate">
          <div className="truncate text-[14px] font-medium text-[#F2EAF7]">3. Add to CRM</div>
          <div className="truncate text-[13px] text-[#6B6088]">Insert row into Database</div>
        </div>
      </div>
    </div>
  </div>
);

const fallbackProducts = [
  {
    slug: "voice-agent",
    name: "AI Voice Agent",
    tagline: "Always-on voice reception and appointment booking.",
    description:
      "Your AI receptionist that answers calls, books appointments, handles FAQs, and transfers to humans when needed. Speaks Hindi and English. Works 24/7/365.",
    status: "live",
    agentType: "voice",
    features: [
      { title: "Handles 100+ simultaneous calls", description: "" },
      { title: "Hindi & English with natural voice", description: "" },
      { title: "Books appointments to Google Calendar", description: "" },
      { title: "Intelligent escalation to humans", description: "" },
    ],
  },
  {
    slug: "chat-agent",
    name: "AI Chat Agent",
    tagline: "Website chat support and lead capture.",
    description:
      "Embed an intelligent chatbot on your website that understands your business, answers questions, captures leads, and never sleeps.",
    status: "coming_soon",
    agentType: "chat",
    features: [
      { title: "Learns from your docs and FAQs", description: "" },
      { title: "Captures leads automatically", description: "" },
      { title: "Escalates complex queries", description: "" },
      { title: "Embeds in 2 minutes", description: "" },
    ],
  },
  {
    slug: "social-agent",
    name: "AI Social Agent",
    tagline: "AI-assisted social publishing workflows.",
    description:
      "Generate, schedule, and post content across Instagram and social platforms. AI creates captions, suggests hashtags, and maintains your brand voice.",
    status: "beta",
    agentType: "social",
    features: [
      { title: "Auto-generates captions & hashtags", description: "" },
      { title: "Maintains brand voice consistency", description: "" },
      { title: "Schedules posts automatically", description: "" },
      { title: "Performance analytics", description: "" },
    ],
  },
  {
    slug: "workflow-agent",
    name: "AI Workflow Agent",
    tagline: "Cross-tool automations for business operations.",
    description:
      "Connect multiple tools together to automate multi-step business processes natively. Data extraction, intelligent routing, and pipeline reporting done autonomously.",
    status: "coming_soon",
    agentType: "workflow",
    features: [
      { title: "Connects multiple tools instantly", description: "" },
      { title: "Automates multi-step processes", description: "" },
      { title: "Data extraction and reporting", description: "" },
      { title: "Advanced branching logic", description: "" },
    ],
  },
] as const;

function getStatusMeta(status: ProductRecord["status"]) {
  switch (status) {
    case "live":
      return {
        label: "Live",
        badgeStyles:
          "text-[#10B981] bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.15)]",
      };
    case "beta":
      return {
        label: "Beta",
        badgeStyles:
          "text-[#F59E0B] bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.15)]",
      };
    default:
      return {
        label: "Coming Soon",
        badgeStyles:
          "text-[#6B6088] bg-[rgba(107,96,136,0.1)] border border-[rgba(107,96,136,0.15)]",
      };
  }
}

function getVisualComponent(agentType: ProductRecord["agentType"]) {
  switch (agentType) {
    case "voice":
      return VoiceVisual;
    case "chat":
      return ChatVisual;
    case "social":
      return SocialVisual;
    case "workflow":
      return WorkflowVisual;
    default:
      return VoiceVisual;
  }
}

function formatFeatureText(feature: { title: string; description: string }) {
  if (feature.title && feature.description) {
    return `${feature.title}: ${feature.description}`;
  }

  return feature.title || feature.description;
}

export function ProductsShowcase() {
  const { data, error } = useVisibleProducts();
  const products = data.length > 0 ? data : error ? fallbackProducts : [];

  if (products.length === 0) {
    return null;
  }

  return (
    <section id="products" className="w-full overflow-hidden bg-[#080010] pb-[60px] pt-[100px]">
      <div className="mx-auto max-w-[1280px] px-[20px] md:px-[80px]">
        <div className="mb-[80px] flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-[20px] inline-block rounded-full border border-[rgba(122,63,145,0.15)] bg-[rgba(122,63,145,0.1)] px-[16px] py-[6px] font-sans text-[13px] font-medium text-[#C59DD9]"
          >
            Our Products
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-[16px] font-display text-[34px] font-bold leading-tight tracking-[-0.02em] text-[#F2EAF7] md:text-[42px]"
          >
            AI Agents That{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, #C59DD9 0%, #FBBF24 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Actually
            </span>{" "}
            Work.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto max-w-[580px] font-sans text-[16px] font-normal leading-[1.6] text-[#A8A0C0] md:text-[18px]"
          >
            Not demos. Not concepts. Production-ready AI agents deployed in real businesses.
          </motion.p>
        </div>

        <div className="flex flex-col gap-[80px]">
          {products.map((product, idx) => {
            const VisualComponent = getVisualComponent(product.agentType);
            const isReversed = idx % 2 === 1;
            const statusMeta = getStatusMeta(product.status);
            const featureItems =
              product.features.length > 0
                ? product.features.map(formatFeatureText).filter(Boolean)
                : [];

            return (
              <React.Fragment key={product.slug}>
                <div
                  className={`flex flex-col items-center gap-[60px] md:flex-row ${
                    isReversed ? "md:flex-row-reverse" : ""
                  }`}
                >
                  <motion.div
                    initial={{ opacity: 0, x: isReversed ? 50 : -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="flex w-full flex-col items-start text-left md:w-1/2"
                  >
                    <div
                      className={`inline-block rounded-full px-[12px] py-[4px] font-sans text-[12px] font-medium ${statusMeta.badgeStyles}`}
                    >
                      {statusMeta.label}
                    </div>

                    <h3 className="mt-[16px] font-display text-[32px] font-bold leading-tight text-[#F2EAF7]">
                      {product.name}
                    </h3>

                    <p className="mt-[16px] font-sans text-[16px] font-normal leading-[1.7] text-[#A8A0C0]">
                      {product.tagline || product.description}
                    </p>

                    {featureItems.length > 0 ? (
                      <div className="mt-[24px] flex w-full flex-col gap-[12px]">
                        {featureItems.map((feature) => (
                          <div key={feature} className="flex items-start gap-[10px]">
                            <Check size={18} className="mt-[2px] shrink-0 text-[#10B981]" />
                            <span className="font-sans text-[15px] font-normal text-[#A8A0C0]">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {product.status === "live" || product.status === "beta" ? (
                      <Link
                        href={`/products/${product.slug}`}
                        className="mt-[28px] inline-block rounded-[10px] border border-[#2D1255] px-[24px] py-[12px] font-sans text-[15px] font-medium text-[#C59DD9] transition-all duration-300 hover:border-[#7A3F91] hover:bg-[rgba(122,63,145,0.05)]"
                      >
                        {`Explore ${product.name} ->`}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toast("Coming Soon! We're working on it.")}
                        aria-disabled={true}
                        className="mt-[28px] inline-flex cursor-not-allowed items-center rounded-[10px] border border-[#2D1255] px-[24px] py-[12px] font-sans text-[15px] font-medium text-[#C59DD9] opacity-60"
                      >
                        Coming Soon
                      </button>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: isReversed ? -50 : 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
                    className="w-full md:w-1/2"
                  >
                    <VisualComponent />
                  </motion.div>
                </div>

                {idx < products.length - 1 ? (
                  <div className="mx-auto h-[1px] w-2/5 bg-gradient-to-r from-transparent via-[#7A3F91] to-transparent opacity-30" />
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
