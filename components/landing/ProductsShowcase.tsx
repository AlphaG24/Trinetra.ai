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

const VoiceVisual = () => (
  <div className="mx-auto flex w-full max-w-[420px] flex-col items-center rounded-[20px] border border-[#1E0A35] bg-[#130224] p-[32px] shadow-[0_20px_60px_rgba(139,92,246,0.1)]">
    <div className="mb-[8px] font-semibold uppercase tracking-wider text-[#6B6088] text-[13px]">
      Incoming Call
    </div>
    <div className="mb-[4px] font-display text-[32px] font-medium text-[#F5F3FF]">
      Rahul Sharma
    </div>
    <div className="mb-[32px] font-mono text-[16px] text-[#A78BFA]">02:34</div>

    <div className="relative w-full rounded-[16px] rounded-tl-sm bg-[#1A0530] p-[20px] text-[15px] leading-relaxed text-[#A8A0C0] shadow-md">
      {`"Good afternoon! I'd be happy to book an appointment for you. Dr. Patel is
      available tomorrow at 3 PM. Shall I confirm?"`}
    </div>

    <div className="mt-[40px] flex items-center gap-[10px] rounded-full border border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.1)] px-[20px] py-[8px] text-[14px] font-medium text-[#10B981]">
      <span className="h-[10px] w-[10px] animate-pulse rounded-full bg-[#10B981]" />
      AI Handling
    </div>
  </div>
);

const ChatVisual = () => (
  <div className="mx-auto flex w-full max-w-[420px] flex-col overflow-hidden rounded-[20px] border border-[#1E0A35] bg-[#130224] shadow-[0_20px_60px_rgba(139,92,246,0.1)]">
    <div className="flex items-center gap-[14px] border-b border-[#1E0A35] bg-[#1A0530] p-[20px]">
      <div className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[rgba(139,92,246,0.15)] text-[#8B5CF6]">
        <Bot size={24} />
      </div>
      <div>
        <div className="text-[16px] font-medium text-[#F5F3FF]">Trinetra Support</div>
        <div className="flex items-center gap-[6px] text-[13px] text-[#10B981]">
          <span className="h-[8px] w-[8px] animate-pulse rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          Online actively
        </div>
      </div>
    </div>

    <div className="flex min-h-[300px] flex-col gap-[20px] p-[24px]">
      <div className="max-w-[85%] self-end rounded-[14px] rounded-tr-sm border border-[rgba(139,92,246,0.2)] bg-[rgba(139,92,246,0.15)] px-[16px] py-[12px] text-[15px] text-[#E5E7EB]">
        Do you integrate with my existing CRM out of the box?
      </div>
      <div className="max-w-[85%] self-start rounded-[14px] rounded-tl-sm border border-[#2D1255] bg-[#1E0A35] px-[16px] py-[12px] text-[15px] leading-relaxed text-[#A8A0C0]">
        Yes! We natively integrate with Salesforce, HubSpot, and 50+ other CRMs
        instantly. We also support custom generic webhooks if needed!
      </div>
    </div>

    <div className="border-t border-[#1E0A35] bg-[#10021E] p-[16px]">
      <div className="flex w-full items-center justify-between rounded-full border border-[#2D1255] bg-[#080010] px-[20px] py-[12px] text-[14px] text-[#6B6088]">
        Type a message...
        <Send size={16} className="text-[#A78BFA]" />
      </div>
    </div>
  </div>
);

const SocialVisual = () => (
  <SocialAgentGallery />
);

const WorkflowVisual = () => (
  <div className="relative mx-auto flex w-full max-w-[400px] flex-col overflow-hidden rounded-[20px] border border-[#1E0A35] bg-[#130224] p-[24px] shadow-[0_20px_60px_rgba(139,92,246,0.1)]">
    <div className="mb-[20px] flex items-center justify-between border-b border-[#2D1255] pb-[16px]">
      <div className="flex items-center gap-[10px]">
        <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-[#8B5CF6]/20 text-[#A78BFA]">
          <Workflow size={20} />
        </div>
        <div>
          <div className="text-[15px] font-medium text-[#F5F3FF]">Lead Processing</div>
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
      <div className="relative flex items-center gap-[16px] overflow-hidden rounded-[12px] border border-[#2D1255] bg-[#1A0530] p-[14px] shadow-sm">
        <div className="absolute left-0 top-0 h-full w-[4px] bg-[#8B5CF6]" />
        <Mail size={22} className="ml-[4px] shrink-0 text-[#A78BFA]" />
        <div className="flex-1 truncate">
          <div className="truncate text-[14px] font-medium text-[#F5F3FF]">
            1. Incoming Email
          </div>
          <div className="truncate text-[13px] text-[#6B6088]">Trigger on new lead@...</div>
        </div>
      </div>

      <div className="relative ml-[36px] h-[16px] w-[2px] bg-[#2D1255] opacity-50" />

      <div className="relative flex items-center gap-[16px] overflow-hidden rounded-[12px] border border-[#8B5CF6]/40 bg-[#1A0530] p-[14px] shadow-[0_0_15px_rgba(139,92,246,0.1)]">
        <div className="absolute left-0 top-0 h-full w-[4px] bg-gradient-to-b from-[#8B5CF6] to-[#FBBF24]" />
        <Bot size={22} className="ml-[4px] shrink-0 text-[#FBBF24]" />
        <div className="flex-1 truncate">
          <div className="truncate text-[14px] font-medium text-[#F5F3FF]">
            2. AI Extraction
          </div>
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

      <div className="relative flex items-center gap-[16px] overflow-hidden rounded-[12px] border border-[#2D1255] bg-[#1A0530] p-[14px] shadow-sm">
        <div className="absolute left-0 top-0 h-full w-[4px] bg-[#10B981]" />
        <Database size={22} className="ml-[4px] shrink-0 text-[#10B981]" />
        <div className="flex-1 truncate">
          <div className="truncate text-[14px] font-medium text-[#F5F3FF]">
            3. Add to CRM
          </div>
          <div className="truncate text-[13px] text-[#6B6088]">Insert row into Database</div>
        </div>
      </div>
    </div>
  </div>
);

const products = [
  {
    id: "voice",
    badgeLabel: "Live",
    badgeStyles:
      "text-[#10B981] bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.15)]",
    title: "AI Voice Agent",
    description:
      "Your AI receptionist that answers calls, books appointments, handles FAQs, and transfers to humans when needed. Speaks Hindi and English. Works 24/7/365.",
    features: [
      "Handles 100+ simultaneous calls",
      "Hindi & English with natural voice",
      "Books appointments to Google Calendar",
      "Intelligent escalation to humans",
    ],
    buttonText: "Explore Voice Agent ->",
    buttonLink: "/products/voice-agent",
    toastMessage: null,
    alignment: "left",
    VisualComponent: VoiceVisual,
  },
  {
    id: "chat",
    badgeLabel: "Live",
    badgeStyles:
      "text-[#10B981] bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.15)]",
    title: "AI Chat Agent",
    description:
      "Embed an intelligent chatbot on your website that understands your business, answers questions, captures leads, and never sleeps.",
    features: [
      "Learns from your docs and FAQs",
      "Captures leads automatically",
      "Escalates complex queries",
      "Embeds in 2 minutes",
    ],
    buttonText: "Coming Soon",
    buttonLink: null,
    toastMessage: "Chat Agent demo coming soon!",
    alignment: "right",
    VisualComponent: ChatVisual,
  },
  {
    id: "social",
    badgeLabel: "Beta",
    badgeStyles:
      "text-[#F59E0B] bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.15)]",
    title: "AI Social Media Agent",
    description:
      "Generate, schedule, and post content across Instagram and social platforms. AI creates captions, suggests hashtags, and maintains your brand voice.",
    features: [
      "Auto-generates captions & hashtags",
      "Maintains brand voice consistency",
      "Schedules posts automatically",
      "Performance analytics",
    ],
    buttonText: "Coming Soon",
    buttonLink: null,
    toastMessage: "Social Agent demo coming soon!",
    alignment: "left",
    VisualComponent: SocialVisual,
  },
  {
    id: "workflow",
    badgeLabel: "Coming Soon",
    badgeStyles:
      "text-[#6B6088] bg-[rgba(107,96,136,0.1)] border border-[rgba(107,96,136,0.15)]",
    title: "AI Workflow Agent",
    description:
      "Connect multiple tools together to automate multi-step business processes natively. Data extraction, intelligent routing, and pipeline reporting done autonomously.",
    features: [
      "Connects multiple tools instantly",
      "Automates multi-step processes",
      "Data extraction and reporting",
      "Advanced branching logic",
    ],
    buttonText: "Coming Soon",
    buttonLink: null,
    toastMessage: "Workflow Agent demo coming soon!",
    alignment: "right",
    VisualComponent: WorkflowVisual,
  },
] as const;

export function ProductsShowcase() {
  return (
    <section id="products" className="w-full overflow-hidden bg-[#080010] pb-[60px] pt-[100px]">
      <div className="mx-auto max-w-[1280px] px-[20px] md:px-[80px]">
        <div className="mb-[80px] flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-[20px] inline-block rounded-full border border-[rgba(139,92,246,0.15)] bg-[rgba(139,92,246,0.1)] px-[16px] py-[6px] font-sans text-[13px] font-medium text-[#A78BFA]"
          >
            Our Products
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-[16px] font-display text-[34px] font-bold leading-tight tracking-[-0.02em] text-[#F5F3FF] md:text-[42px]"
          >
            AI Agents That{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, #A78BFA 0%, #FBBF24 100%)",
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
            Not demos. Not concepts. Production-ready AI agents deployed in real
            businesses.
          </motion.p>
        </div>

        <div className="flex flex-col gap-[80px]">
          {products.map((product, idx) => {
            const isReversed = product.alignment === "right";

            return (
              <React.Fragment key={product.id}>
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
                      className={`inline-block rounded-full px-[12px] py-[4px] font-sans text-[12px] font-medium ${product.badgeStyles}`}
                    >
                      {product.badgeLabel}
                    </div>

                    <h3 className="mt-[16px] font-display text-[32px] font-bold leading-tight text-[#F5F3FF]">
                      {product.title}
                    </h3>

                    <p className="mt-[16px] font-sans text-[16px] font-normal leading-[1.7] text-[#A8A0C0]">
                      {product.description}
                    </p>

                    <div className="mt-[24px] flex w-full flex-col gap-[12px]">
                      {product.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-[10px]">
                          <Check size={18} className="mt-[2px] shrink-0 text-[#10B981]" />
                          <span className="font-sans text-[15px] font-normal text-[#A8A0C0]">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {product.buttonLink ? (
                      <Link
                        href={product.buttonLink}
                        className="mt-[28px] inline-block rounded-[10px] border border-[#2D1255] px-[24px] py-[12px] font-sans text-[15px] font-medium text-[#A78BFA] transition-all duration-300 hover:border-[#8B5CF6] hover:bg-[rgba(139,92,246,0.05)]"
                      >
                        {product.buttonText}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toast(product.toastMessage || "Coming Soon!")}
                        aria-disabled={true}
                        className="mt-[28px] inline-flex cursor-not-allowed items-center rounded-[10px] border border-[#2D1255] px-[24px] py-[12px] font-sans text-[15px] font-medium text-[#A78BFA] opacity-60"
                      >
                        {product.buttonText}
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
                    <product.VisualComponent />
                  </motion.div>
                </div>

                {idx < products.length - 1 ? (
                  <div className="mx-auto h-[1px] w-2/5 bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent opacity-30" />
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
