"use client";

import { useMemo, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Info, Plus, X } from "lucide-react";
import Link from "next/link";

import { Layout } from "@/components/layout/Layout";
import { PlanRecord, getConfigString, hasConfiguredValue, useActivePlans, useSiteConfig } from "@/lib/site-content";

type BillingMode = "monthly" | "annual";
type FeatureTone = "default" | "included" | "excluded" | "addon";

interface CardFeature {
  text: string;
  tone: Exclude<FeatureTone, "default">;
}

interface ComparisonValue {
  text: string;
  tone?: FeatureTone;
}

interface ComparisonRow {
  label: string;
  values: ComparisonValue[];
}

interface ComparisonGroup {
  title: string;
  rows: ComparisonRow[];
}

const FAQS = [
  {
    question: "What does the setup fee cover?",
    answer:
      "The one-time setup fee covers initial agent configuration, knowledge base training, custom prompt engineering, testing, deployment, and your onboarding sessions. It's a one-time charge - no recurring setup costs.",
  },
  {
    question: "What happens if I exceed my plan limits?",
    answer:
      "Your service is never cut off. You'll receive alerts at usage thresholds. Any usage beyond your included limits is charged at the overage rate and added to your next invoice. You can upgrade anytime to avoid overages.",
  },
  {
    question: "Can I change plans mid-contract?",
    answer:
      "You can upgrade anytime - the change takes effect immediately and is prorated. Downgrades take effect at the end of your current billing period. Minimum contract terms still apply.",
  },
  {
    question: "What counts as one chat conversation?",
    answer:
      "One conversation is a complete interaction from start to finish, regardless of how many messages are exchanged within it. If a visitor returns after 30 minutes, that counts as a new conversation.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "We don't offer a free trial, but we provide a thorough demo during your onboarding call so you can see exactly how your agent will work before going live.",
  },
  {
    question: "Can I cancel my subscription?",
    answer:
      "Yes, with 30 days notice. After your minimum contract period, your plan continues month-to-month and you can cancel anytime. No penalties or hidden exit fees.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept UPI, bank transfers, and online payment via Razorpay (credit/debit cards, net banking, wallets). All payments are in INR.",
  },
  {
    question: "What's included in the WhatsApp add-on?",
    answer:
      "The WhatsApp Integration add-on gives your AI agent a WhatsApp presence. It can handle customer queries, capture leads, and book appointments through WhatsApp. Includes 500 conversations per month.",
  },
];

const ADD_ONS = [
  { title: "WhatsApp Integration", description: "AI chatbot on WhatsApp, 500 conversations included", price: "Rs 2,499/month" },
  { title: "Additional AI Agent", description: "Add one more agent to your plan", price: "Rs 3,999-Rs 4,999/month" },
  { title: "Additional Language", description: "Add one more language to your agent", price: "Rs 999-Rs 1,499/month" },
  { title: "Custom AI Voice", description: "Unique AI voice trained for your brand", price: "Rs 2,999/month" },
  { title: "Priority Support Upgrade", description: "Upgrade to faster response times", price: "Rs 1,999/month" },
  { title: "White-Label Branding", description: "Your logo and branding on the agent", price: "Rs 4,999/month" },
  { title: "Advanced Analytics", description: "Detailed reports with CSV/PDF download", price: "Rs 1,499/month" },
  { title: "Monthly Strategy Call", description: "30-min monthly call with our AI team", price: "Rs 2,999/month" },
  { title: "Custom Integration", description: "Connect with your existing CRM/tools", price: "Rs 9,999 one-time" },
];

const PLAN_ACCENTS = ["#D7C4F7", "#06B6D4", "#F59E0B"];

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function asBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return false;
}

function formatPaise(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "";
  const rupees = value / 100;
  const whole = Number.isInteger(rupees);
  return `\u20B9${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(rupees)}`;
}

function getFeatureNumber(plan: PlanRecord, key: string) {
  return asNumber(plan.features[key]);
}

function getFeatureString(plan: PlanRecord, key: string) {
  return asString(plan.features[key]);
}

function getFeatureBoolean(plan: PlanRecord, key: string) {
  return asBoolean(plan.features[key]);
}

function getSetupFee(plan: PlanRecord) {
  return getFeatureNumber(plan, "setup_fee");
}

function getMinimumMonths(plan: PlanRecord) {
  return getFeatureNumber(plan, "minimum_contract_months");
}

function getAnnualSavings(plan: PlanRecord) {
  const configured = getFeatureNumber(plan, "annual_savings");
  if (configured !== null) return configured;
  if (plan.priceMonthly === null || plan.priceAnnual === null) return null;
  return (plan.priceMonthly - plan.priceAnnual) * 12;
}

function getAnnualSavingsPercent(plan: PlanRecord) {
  const configured = getFeatureNumber(plan, "annual_savings_percent");
  if (configured !== null) return configured;
  if (plan.priceMonthly === null || plan.priceAnnual === null || plan.priceMonthly <= 0) return null;
  return Math.round(((plan.priceMonthly - plan.priceAnnual) / plan.priceMonthly) * 100);
}

function formatIncludedValue(value: number | null, unit: string) {
  if (value === null || value <= 0) return "";
  return `${value.toLocaleString("en-IN")} ${unit}`;
}

function getMonthlyDisplayPrice(plan: PlanRecord, billingMode: BillingMode) {
  if (plan.priceMonthly === 0) return "Custom";
  return formatPaise(billingMode === "annual" ? plan.priceAnnual : plan.priceMonthly);
}

function getCardFeatures(plan: PlanRecord) {
  const features: CardFeature[] = [];
  const agentTypes = getFeatureString(plan, "agent_types");
  const regionalLanguages = getFeatureBoolean(plan, "regional_languages");
  const regionalLanguagesCount = getFeatureNumber(plan, "regional_languages_count");
  const whatsappIncluded = getFeatureBoolean(plan, "whatsapp_included");
  const whatsappIncludedCount = getFeatureNumber(plan, "whatsapp_conversations");
  const whatsappAddon = getFeatureNumber(plan, "whatsapp_addon_price");
  const roiDashboard = getFeatureBoolean(plan, "roi_dashboard");
  const roiDashboardDetail = getFeatureString(plan, "roi_dashboard_detail");
  const customPersonality = getFeatureBoolean(plan, "custom_personality");
  const customPersonalityDetail = getFeatureString(plan, "custom_personality_detail");
  const customVoice = getFeatureBoolean(plan, "custom_voice");
  const customVoiceDetail = getFeatureString(plan, "custom_voice_detail");
  const knowledgeBase = getFeatureString(plan, "knowledge_base");
  const supportChannel = getFeatureString(plan, "support_channel");
  const supportResponse = getFeatureNumber(plan, "support_response_hours");
  const setupTimeline = getFeatureString(plan, "setup_timeline");

  if (plan.maxAgents !== null) {
    features.push({ text: `${plan.maxAgents} AI Agent${plan.maxAgents === 1 ? "" : "s"}${agentTypes ? ` (${agentTypes})` : ""}`, tone: "included" });
  }
  if (plan.includedVoiceMinutes !== null) {
    features.push({ text: `${plan.includedVoiceMinutes.toLocaleString("en-IN")} voice minutes/month`, tone: "included" });
  }
  if (plan.includedChatConversations !== null) {
    features.push({ text: `${plan.includedChatConversations.toLocaleString("en-IN")} chat conversations/month`, tone: "included" });
  }
  if (plan.includedSocialPosts !== null) {
    features.push({ text: `${plan.includedSocialPosts.toLocaleString("en-IN")} social posts/month`, tone: "included" });
  }
  if (whatsappIncluded) {
    features.push({ text: whatsappIncludedCount !== null ? `WhatsApp: ${whatsappIncludedCount.toLocaleString("en-IN")}/month included` : "WhatsApp included", tone: "included" });
  } else if (whatsappAddon !== null) {
    features.push({ text: `WhatsApp: Add-on (${formatPaise(whatsappAddon)}/mo)`, tone: "addon" });
  }
  features.push({ text: "Hindi + English", tone: "included" });
  if (regionalLanguages && regionalLanguagesCount !== null) {
    features.push({ text: `+ ${regionalLanguagesCount} regional language${regionalLanguagesCount === 1 ? "" : "s"}`, tone: "included" });
  }
  features.push({ text: roiDashboard ? roiDashboardDetail || "ROI Dashboard" : "ROI Dashboard", tone: roiDashboard ? "included" : "excluded" });
  features.push({ text: customPersonality ? customPersonalityDetail || "Custom Personality" : "Custom Personality", tone: customPersonality ? "included" : "excluded" });
  features.push({ text: customVoice ? customVoiceDetail || "Custom Voice" : "Custom Voice", tone: customVoice ? "included" : "excluded" });
  if (knowledgeBase) features.push({ text: knowledgeBase, tone: "included" });
  if (supportChannel || supportResponse !== null) {
    features.push({ text: `${supportChannel || "Support"}${supportResponse !== null ? ` (${supportResponse}hr response)` : ""}`, tone: "included" });
  }
  if (setupTimeline) features.push({ text: setupTimeline, tone: "included" });

  return features;
}

function getCommitmentSummary(plan: PlanRecord, billingMode: BillingMode) {
  const setupFee = getSetupFee(plan);
  const minimumMonths = getMinimumMonths(plan);
  const annualSavings = getAnnualSavings(plan);

  if (billingMode === "monthly") {
    const subtotal = minimumMonths !== null && plan.priceMonthly !== null ? minimumMonths * plan.priceMonthly : null;
    const total = subtotal !== null && setupFee !== null ? subtotal + setupFee : subtotal ?? setupFee;
    return {
      line1: minimumMonths !== null && plan.priceMonthly !== null ? `${minimumMonths} months x ${formatPaise(plan.priceMonthly)} = ${formatPaise(subtotal)}` : "",
      line2: setupFee !== null ? `+ Setup: ${formatPaise(setupFee)}` : "",
      total: total !== null ? formatPaise(total) : "",
      savings: "",
    };
  }

  const annualBase = plan.priceAnnual !== null ? plan.priceAnnual * 12 : null;
  const total = annualBase !== null && setupFee !== null ? annualBase + setupFee : annualBase ?? setupFee;
  return {
    line1: annualBase !== null ? `Annual: ${formatPaise(annualBase)}` : "",
    line2: setupFee !== null ? `+ Setup: ${formatPaise(setupFee)}` : "",
    total: total !== null ? formatPaise(total) : "",
    savings: annualSavings !== null ? `You save: ${formatPaise(annualSavings)}` : "",
  };
}

function getFeatureToneIcon(tone: Exclude<FeatureTone, "default">) {
  if (tone === "included") {
    return <Check size={16} className="mt-[2px] shrink-0 text-[#10B981]" />;
  }

  if (tone === "addon") {
    return <Plus size={16} className="mt-[2px] shrink-0 text-[#FBBF24]" />;
  }

  return <X size={16} className="mt-[2px] shrink-0 text-[#6B6088]" />;
}

function getFeatureToneTextClass(tone: Exclude<FeatureTone, "default">) {
  if (tone === "included") return "text-[#FAF7FF]";
  if (tone === "addon") return "text-[#E9D5FF]";
  return "text-[#8D86A8]";
}

function buildComparisonGroups(plans: PlanRecord[]): ComparisonGroup[] {
  return [
    {
      title: "Agents & Limits",
      rows: [
        {
          label: "AI Agents Included",
          values: plans.map((plan) => ({
            text: plan.maxAgents === null ? "-" : plan.maxAgents === 1 ? "1 Agent" : `Up to ${plan.maxAgents}`,
          })),
        },
        {
          label: "Agent Types",
          values: plans.map((plan) => ({ text: getFeatureString(plan, "agent_types") || "-" })),
        },
        {
          label: "Voice Minutes",
          values: plans.map((plan) => ({ text: formatIncludedValue(plan.includedVoiceMinutes, "month") || "-" })),
        },
        {
          label: "Chat Conversations",
          values: plans.map((plan) => ({ text: formatIncludedValue(plan.includedChatConversations, "month") || "-" })),
        },
        {
          label: "Social Media Posts",
          values: plans.map((plan) => ({ text: formatIncludedValue(plan.includedSocialPosts, "month") || "-" })),
        },
        {
          label: "WhatsApp",
          values: plans.map((plan) => {
            const included = getFeatureBoolean(plan, "whatsapp_included");
            const conversations = getFeatureNumber(plan, "whatsapp_conversations");
            const addonPrice = getFeatureNumber(plan, "whatsapp_addon_price");
            const overage = getFeatureNumber(plan, "whatsapp_overage");

            if (included) {
              const detail = conversations !== null ? `${conversations.toLocaleString("en-IN")}/month included` : "Included";
              return { text: overage !== null ? `${detail} (${formatPaise(overage)}/conv overage)` : detail, tone: "included" };
            }

            if (addonPrice !== null) {
              return { text: `Add-on ${formatPaise(addonPrice)}/mo`, tone: "addon" };
            }

            return { text: "Not included", tone: "excluded" };
          }),
        },
      ],
    },
    {
      title: "Languages",
      rows: [
        {
          label: "Hindi",
          values: plans.map((plan) => ({
            text: getFeatureBoolean(plan, "hindi") ? "Included" : "Not included",
            tone: getFeatureBoolean(plan, "hindi") ? "included" : "excluded",
          })),
        },
        {
          label: "English",
          values: plans.map((plan) => ({
            text: getFeatureBoolean(plan, "english") ? "Included" : "Not included",
            tone: getFeatureBoolean(plan, "english") ? "included" : "excluded",
          })),
        },
        {
          label: "Regional Languages",
          values: plans.map((plan) => {
            const included = getFeatureBoolean(plan, "regional_languages");
            const count = getFeatureNumber(plan, "regional_languages_count");
            return { text: included ? `+${count ?? 0}` : "Not included", tone: included ? "included" : "excluded" };
          }),
        },
        {
          label: "Additional Languages",
          values: plans.map((plan) => {
            const price =
              getFeatureNumber(plan, "additional_language_price_monthly") ??
              getFeatureNumber(plan, "additional_language_price");
            return { text: price !== null ? `${formatPaise(price)}/mo per language` : "Not available", tone: price !== null ? "addon" : "excluded" };
          }),
        },
      ],
    },
    {
      title: "Analytics & Reporting",
      rows: [
        { label: "Basic Analytics", values: plans.map((plan) => ({ text: getFeatureString(plan, "analytics_detail") || "Included" })) },
        {
          label: "ROI Dashboard",
          values: plans.map((plan) => {
            const included = getFeatureBoolean(plan, "roi_dashboard");
            return { text: included ? getFeatureString(plan, "roi_dashboard_detail") || "Included" : "Not included", tone: included ? "included" : "excluded" };
          }),
        },
        { label: "Report Frequency", values: plans.map((plan) => ({ text: getFeatureString(plan, "report_frequency") || "-" })) },
        {
          label: "Data Export",
          values: plans.map((plan) => {
            const included = getFeatureBoolean(plan, "data_export");
            return { text: included ? "Included" : "Not included", tone: included ? "included" : "excluded" };
          }),
        },
        {
          label: "API Access",
          values: plans.map((plan) => {
            const included = getFeatureBoolean(plan, "api_access");
            return { text: included ? getFeatureString(plan, "api_access_detail") || "Included" : "Not included", tone: included ? "included" : "excluded" };
          }),
        },
        {
          label: "Monthly Review Call",
          values: plans.map((plan) => {
            const included = getFeatureBoolean(plan, "monthly_review_call");
            return { text: included ? getFeatureString(plan, "monthly_review_detail") || "Included" : "Not included", tone: included ? "included" : "excluded" };
          }),
        },
      ],
    },
    {
      title: "AI Features",
      rows: [
        {
          label: "Custom Personality",
          values: plans.map((plan) => {
            const included = getFeatureBoolean(plan, "custom_personality");
            return { text: included ? getFeatureString(plan, "custom_personality_detail") || "Included" : "Not included", tone: included ? "included" : "excluded" };
          }),
        },
        {
          label: "Custom Voice",
          values: plans.map((plan) => {
            const included = getFeatureBoolean(plan, "custom_voice");
            return { text: included ? getFeatureString(plan, "custom_voice_detail") || "Included" : "Not included", tone: included ? "included" : "excluded" };
          }),
        },
        { label: "Knowledge Base", values: plans.map((plan) => ({ text: getFeatureString(plan, "knowledge_base") || "-" })) },
        { label: "Human Handoff", values: plans.map((plan) => ({ text: getFeatureString(plan, "human_handoff") || "-" })) },
        { label: "Appointment Booking", values: plans.map((plan) => ({ text: getFeatureString(plan, "appointment_booking") || "-" })) },
        { label: "After-Hours Handling", values: plans.map((plan) => ({ text: getFeatureString(plan, "after_hours") || "-" })) },
      ],
    },
    {
      title: "Support",
      rows: [
        { label: "Support Channel", values: plans.map((plan) => ({ text: getFeatureString(plan, "support_channel") || "-" })) },
        {
          label: "Response Time",
          values: plans.map((plan) => {
            const hours = getFeatureNumber(plan, "support_response_hours");
            return { text: hours !== null ? `${hours} hours` : "-" };
          }),
        },
        { label: "Support Hours", values: plans.map((plan) => ({ text: getFeatureString(plan, "support_hours") || "-" })) },
        { label: "Onboarding Sessions", values: plans.map((plan) => ({ text: getFeatureString(plan, "onboarding_sessions") || "-" })) },
        {
          label: "Dedicated Slack",
          values: plans.map((plan) => {
            const included = getFeatureBoolean(plan, "dedicated_slack");
            return { text: included ? "Included" : "Not included", tone: included ? "included" : "excluded" };
          }),
        },
        {
          label: "Account Manager",
          values: plans.map((plan) => {
            const included = getFeatureBoolean(plan, "account_manager");
            return { text: included ? getFeatureString(plan, "account_manager_detail") || "Included" : "Not included", tone: included ? "included" : "excluded" };
          }),
        },
      ],
    },
    {
      title: "Setup & Deployment",
      rows: [
        { label: "Setup Timeline", values: plans.map((plan) => ({ text: getFeatureString(plan, "setup_timeline") || "-" })) },
        { label: "Setup Includes", values: plans.map((plan) => ({ text: getFeatureString(plan, "setup_includes") || "-" })) },
        {
          label: "Testing",
          values: plans.map((plan) => {
            const interactions = getFeatureNumber(plan, "testing_interactions");
            const detail = getFeatureString(plan, "testing_detail");
            if (interactions !== null && detail) return { text: `${interactions} interactions (${detail})` };
            if (interactions !== null) return { text: `${interactions} interactions` };
            return { text: detail || "-" };
          }),
        },
        { label: "Documentation", values: plans.map((plan) => ({ text: getFeatureString(plan, "documentation") || "-" })) },
      ],
    },
    {
      title: "Infrastructure",
      rows: [
        { label: "Uptime Target", values: plans.map((plan) => ({ text: getFeatureString(plan, "uptime_target") || "-" })) },
        { label: "Data Encryption", values: plans.map((plan) => ({ text: getFeatureString(plan, "data_encryption") || "-" })) },
        { label: "Data Backup", values: plans.map((plan) => ({ text: getFeatureString(plan, "data_backup") || "-" })) },
        {
          label: "Call Recording",
          values: plans.map((plan) => {
            const included = getFeatureBoolean(plan, "call_recording");
            return { text: included ? getFeatureString(plan, "call_recording_detail") || "Included" : "Not included", tone: included ? "included" : "excluded" };
          }),
        },
      ],
    },
  ];
}

function renderComparisonCell(value: ComparisonValue) {
  const tone = value.tone ?? "default";

  if (tone === "default") {
    return <span className="text-[#FAF7FF]">{value.text}</span>;
  }

  if (tone === "included") {
    return (
      <span className="inline-flex items-center justify-center gap-[8px] text-[#D1FAE5]">
        <Check size={15} className="shrink-0 text-[#10B981]" />
        <span>{value.text}</span>
      </span>
    );
  }

  if (tone === "addon") {
    return (
      <span className="inline-flex items-center justify-center gap-[8px] text-[#FDE68A]">
        <Plus size={15} className="shrink-0 text-[#FBBF24]" />
        <span>{value.text}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center gap-[8px] text-[#9CA3AF]">
      <X size={15} className="shrink-0 text-[#6B6088]" />
      <span>{value.text}</span>
    </span>
  );
}

function PricingCard({
  plan,
  index,
  billingMode,
}: {
  plan: PlanRecord;
  index: number;
  billingMode: BillingMode;
}) {
  const isPopular = plan.isPopular;
  const cardFeatures = getCardFeatures(plan);
  const setupFee = getSetupFee(plan);
  const minimumMonths = getMinimumMonths(plan);
  const savings = getAnnualSavings(plan);
  const displayPrice = getMonthlyDisplayPrice(plan, billingMode);
  const monthlyPrice = formatPaise(plan.priceMonthly);
  const overageLine = [
    plan.overageVoicePerMinute !== null ? `${formatPaise(plan.overageVoicePerMinute)}/min` : "",
    plan.overageChatPerConversation !== null ? `${formatPaise(plan.overageChatPerConversation)}/chat` : "",
    plan.overageSocialPerPost !== null ? `${formatPaise(plan.overageSocialPerPost)}/post` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className="relative flex h-full flex-col rounded-[20px] border border-[#1E0A35] bg-[#130224] p-[28px] shadow-[0_18px_48px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-[4px] hover:border-[#3A1C68]"
      style={isPopular ? { borderColor: "#6D28D9", boxShadow: "0 20px 60px rgba(109,40,217,0.22)" } : undefined}
    >
      {isPopular ? (
        <div className="absolute left-1/2 top-[-14px] -translate-x-1/2 rounded-full bg-[linear-gradient(135deg,#8B5CF6,#6D28D9)] px-[14px] py-[5px] text-center font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-white shadow-[0_10px_30px_rgba(109,40,217,0.35)]">
          {plan.badgeText || "MOST POPULAR"}
        </div>
      ) : null}

      <div className="flex h-full flex-col">
        <h3 className="font-display text-[24px] font-semibold text-[#FAF7FF]">{plan.name}</h3>

        <div className="mt-[20px] min-h-[128px]">
          {billingMode === "annual" && monthlyPrice ? (
            <div className="mb-[4px] font-sans text-[15px] text-[#6B6088] line-through">{monthlyPrice}</div>
          ) : null}

          <div className="relative min-h-[58px] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${plan.slug}-${billingMode}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <div className="font-display text-[46px] font-bold leading-none tracking-[-0.03em] text-[#FAF7FF]">
                  {displayPrice}
                </div>
                <div className="mt-[8px] font-sans text-[13px] text-[#8D86A8]">
                  {billingMode === "monthly" ? "/month" : "/month (billed annually)"}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {billingMode === "annual" && savings ? (
            <div className="mt-[18px] inline-flex rounded-full bg-[rgba(16,185,129,0.12)] px-[10px] py-[4px] font-sans text-[12px] font-medium text-[#34D399]">
              Save {formatPaise(savings)}/year
            </div>
          ) : null}
        </div>

        {setupFee ? <div className="mt-[8px] font-sans text-[13px] text-[#8D86A8]">One-time setup: {formatPaise(setupFee)}</div> : null}
        {plan.description ? <p className="mt-[14px] min-h-[42px] font-sans text-[14px] leading-[1.6] text-[#B8B0D1]">{plan.description}</p> : null}

        <div className="my-[20px] h-px w-full bg-[#1E0A35]" />

        <div className="flex flex-1 flex-col gap-[12px]">
          {cardFeatures.map((feature) => (
            <div key={`${plan.slug}-${feature.text}`} className="flex items-start gap-[10px]">
              {getFeatureToneIcon(feature.tone)}
              <span className={`font-sans text-[14px] leading-[1.5] ${getFeatureToneTextClass(feature.tone)}`}>{feature.text}</span>
            </div>
          ))}
        </div>

        <div className="mt-[24px]">
          <Link
            href={`/contact?plan=${plan.slug}`}
            className={`block w-full rounded-[12px] px-[18px] py-[14px] text-center font-sans text-[15px] font-medium transition-all duration-300 ${
              isPopular
                ? "bg-[#8B5CF6] text-white shadow-[0_0_24px_rgba(139,92,246,0.28)] hover:bg-[#7C3AED]"
                : "border border-[#2D1255] bg-transparent text-[#E9D5FF] hover:border-[#8B5CF6] hover:bg-[rgba(139,92,246,0.08)]"
            }`}
          >
            {index === 2 ? "Talk to Us ->" : "Get Started ->"}
          </Link>

          {overageLine ? <div className="mt-[12px] text-center font-sans text-[12px] leading-[1.5] text-[#6B6088]">Overage: {overageLine}</div> : null}
        </div>
      </div>
    </motion.div>
  );
}

import { useEffect } from 'react';

export default function PricingPage() {
  const { data: dbPlans, loading } = useActivePlans();
  const [publicConfig, setPublicConfig] = useState<any>(null);

  useEffect(() => {
    fetch('/api/public/config')
      .then(res => res.json())
      .then(data => {
        if (data.configs) {
          setPublicConfig(data.configs)
        }
      })
      .catch(err => console.error("Error loading config:", err))
  }, []);

  const plans = useMemo(() => {
    if (!publicConfig) return dbPlans;

    return dbPlans.map(plan => {
      const p = { ...plan };
      if (p.slug === 'starter') {
        p.priceMonthly = parseInt(publicConfig.starter_price_paisa || '499900', 10);
        p.priceAnnual = Math.round(p.priceMonthly * 0.8);
        p.includedVoiceMinutes = parseInt(publicConfig.starter_minutes || '500', 10);
      } else if (p.slug === 'growth') {
        p.name = 'Professional';
        p.priceMonthly = parseInt(publicConfig.professional_price_paisa || '1499900', 10);
        p.priceAnnual = Math.round(p.priceMonthly * 0.8);
        p.includedVoiceMinutes = parseInt(publicConfig.professional_minutes || '2000', 10);
      } else if (p.slug === 'scale') {
        p.name = 'Enterprise';
        p.priceMonthly = parseInt(publicConfig.enterprise_price_paisa || '0', 10);
        p.priceAnnual = 0;
        p.includedVoiceMinutes = parseInt(publicConfig.enterprise_minutes || '10000', 10);
        p.description = 'Tailored limits, custom integrations, and dedicated SLA for large enterprises.';
      }
      return p;
    });
  }, [dbPlans, publicConfig]);

  const { data: siteConfig } = useSiteConfig();
  const [billingMode, setBillingMode] = useState<BillingMode>("monthly");
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const companyPhone = getConfigString(siteConfig, "company_phone_1");

  const maxSavingsPercent = useMemo(
    () =>
      plans.reduce((highest, plan) => {
        const value = getAnnualSavingsPercent(plan);
        return value !== null && value > highest ? value : highest;
      }, 0),
    [plans]
  );

  const comparisonGroups = useMemo(() => buildComparisonGroups(plans), [plans]);

  return (
    <Layout>
      <div className="min-h-screen bg-[#080010]">
        <section className="relative overflow-hidden px-[20px] pb-[54px] pt-[140px] text-center">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 640px 420px at top center, rgba(139,92,246,0.12) 0%, transparent 65%)",
            }}
          />

          <div className="relative z-10 mx-auto max-w-[760px]">
            <div className="mb-[24px] inline-flex rounded-full border border-[rgba(139,92,246,0.15)] bg-[rgba(139,92,246,0.1)] px-[16px] py-[6px] font-sans text-[13px] font-medium text-[#D7C4F7]">
              {"\u2726"} Pricing
            </div>
            <h1 className="font-display text-[38px] font-bold tracking-[-0.02em] text-[#FAF7FF] md:text-[52px]">
              Simple Plans. Real Results.
            </h1>
            <p className="mx-auto mt-[18px] max-w-[500px] font-sans text-[16px] leading-[1.7] text-[#B8B0D1]">
              Choose the plan that fits your business. Scale anytime.
            </p>

            <div className="mt-[32px] flex justify-center">
              <div className="relative flex h-[44px] w-full max-w-[280px] items-center rounded-full border border-[#1E0A35] bg-[#130224] p-[4px] shadow-[0_0_20px_rgba(139,92,246,0.05)]">
                <motion.div
                  className="absolute bottom-[4px] top-[4px] rounded-full bg-[#8B5CF6]"
                  initial={false}
                  animate={{
                    left: billingMode === "monthly" ? 4 : "calc(50% + 2px)",
                    width: "calc(50% - 6px)",
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
                <button
                  type="button"
                  onClick={() => setBillingMode("monthly")}
                  className={`relative z-10 flex w-1/2 items-center justify-center font-sans text-[14px] font-semibold transition-colors ${
                    billingMode === "monthly" ? "text-white" : "text-[#8D86A8]"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingMode("annual")}
                  className={`relative z-10 flex w-1/2 items-center justify-center gap-[6px] font-sans text-[14px] font-semibold transition-colors ${
                    billingMode === "annual" ? "text-white" : "text-[#8D86A8]"
                  }`}
                >
                  Annual
                  <span className="rounded-full bg-[rgba(16,185,129,0.12)] px-[7px] py-[2px] text-[10px] font-semibold text-[#34D399]">
                    {maxSavingsPercent > 0 ? `Save up to ${maxSavingsPercent}%` : "Save annually"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="px-[20px] pb-[100px]">
            <div className="mx-auto max-w-[1180px] rounded-[20px] border border-[#1E0A35] bg-[#130224] px-[24px] py-[48px] text-center font-sans text-[16px] text-[#B8B0D1]">
              Loading pricing...
            </div>
          </section>
        ) : plans.length === 0 ? (
          <section className="px-[20px] pb-[100px]">
            <div className="mx-auto max-w-[1180px] rounded-[20px] border border-[#1E0A35] bg-[#130224] px-[24px] py-[48px] text-center font-sans text-[16px] text-[#B8B0D1]">
              Pricing coming soon.
            </div>
          </section>
        ) : (
          <>
            <section className="px-[20px] pb-[54px]">
              <div className="mx-auto grid max-w-[1180px] grid-cols-1 items-stretch gap-[24px] lg:grid-cols-3">
                {plans.map((plan, index) => (
                  <PricingCard key={plan.slug} plan={plan} index={index} billingMode={billingMode} />
                ))}
              </div>
            </section>


            <section className="px-[20px] pb-[60px]">
              <div className="mx-auto max-w-[1180px]">
                <div className="text-center">
                  <h2 className="font-display text-[30px] font-semibold text-[#FAF7FF]">
                    Detailed Feature Comparison
                  </h2>
                  <p className="mx-auto mt-[12px] max-w-[560px] font-sans text-[15px] leading-[1.7] text-[#B8B0D1]">
                    Everything included in each plan, side by side.
                  </p>
                </div>

                <div className="mt-[24px] flex justify-center">
                  <button
                    type="button"
                    onClick={() => setComparisonOpen((current) => !current)}
                    className="inline-flex items-center gap-[10px] rounded-full border border-[#2D1255] bg-[#130224] px-[18px] py-[10px] font-sans text-[14px] font-medium text-[#E9D5FF] transition-colors hover:border-[#8B5CF6] hover:text-white"
                  >
                    {comparisonOpen ? "Hide Comparison" : "View Full Comparison"}
                    <ChevronDown size={16} className={`transition-transform ${comparisonOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {comparisonOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-[24px] overflow-hidden rounded-[24px] border border-[#1E0A35] bg-[#130224]">
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[920px] border-collapse">
                            <thead className="sticky top-0 z-10 bg-[#1E0A35]">
                              <tr className="border-b border-[#1E0A35]">
                                <th className="px-[16px] py-[16px] text-left font-sans text-[13px] uppercase tracking-[0.08em] text-[#8D86A8]">
                                  Feature
                                </th>
                                {plans.map((plan, index) => (
                                  <th
                                    key={`${plan.slug}-head`}
                                    className="px-[16px] py-[16px] text-center font-sans text-[14px] font-semibold text-[#FAF7FF]"
                                  >
                                    <div className="inline-flex items-center gap-[8px]">
                                      <span
                                        className="h-[8px] w-[8px] rounded-full"
                                        style={{ backgroundColor: PLAN_ACCENTS[index % PLAN_ACCENTS.length] }}
                                      />
                                      {plan.name}
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            {comparisonGroups.map((group) => (
                              <tbody key={group.title}>
                                <tr className="bg-[rgba(255,255,255,0.02)]">
                                  <td
                                    colSpan={plans.length + 1}
                                    className="px-[16px] py-[12px] text-left font-sans text-[12px] font-semibold uppercase tracking-[0.12em] text-[#D7C4F7]"
                                  >
                                    {group.title}
                                  </td>
                                </tr>
                                {group.rows.map((row, rowIndex) => (
                                  <tr key={`${group.title}-${row.label}`} className={rowIndex % 2 === 0 ? "bg-transparent" : "bg-[rgba(255,255,255,0.015)]"}>
                                    <td className="border-t border-[rgba(255,255,255,0.04)] px-[16px] py-[14px] font-sans text-[14px] text-[#B8B0D1]">
                                      {row.label}
                                    </td>
                                    {row.values.map((value, valueIndex) => (
                                      <td
                                        key={`${group.title}-${row.label}-${valueIndex}`}
                                        className="border-t border-[rgba(255,255,255,0.04)] px-[16px] py-[14px] text-center font-sans text-[14px] leading-[1.6]"
                                      >
                                        {renderComparisonCell(value)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            ))}
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </section>

            <section className="px-[20px] pb-[60px]">
              <div className="mx-auto max-w-[1180px]">
                <div className="text-center">
                  <h2 className="font-display text-[30px] font-semibold text-[#FAF7FF]">Overage Charges</h2>
                  <p className="mx-auto mt-[12px] max-w-[420px] font-sans text-[15px] leading-[1.7] text-[#B8B0D1]">
                    When you exceed your plan limits
                  </p>
                </div>

                <div className="mt-[24px] overflow-hidden rounded-[24px] border border-[#1E0A35] bg-[#130224]">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] border-collapse">
                      <thead className="bg-[#1E0A35]">
                        <tr className="border-b border-[#1E0A35]">
                          <th className="px-[16px] py-[16px] text-left font-sans text-[13px] uppercase tracking-[0.08em] text-[#8D86A8]">
                            Type
                          </th>
                          {plans.map((plan) => (
                            <th
                              key={`${plan.slug}-overage`}
                              className="px-[16px] py-[16px] text-center font-sans text-[14px] font-semibold text-[#FAF7FF]"
                            >
                              {plan.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {
                            label: "Extra Voice Minutes",
                            values: plans.map((plan) => (formatPaise(plan.overageVoicePerMinute) ? `${formatPaise(plan.overageVoicePerMinute)}/min` : "-")),
                          },
                          {
                            label: "Extra Chat Conversations",
                            values: plans.map((plan) =>
                              formatPaise(plan.overageChatPerConversation) ? `${formatPaise(plan.overageChatPerConversation)}/conv` : "-"
                            ),
                          },
                          {
                            label: "Extra Social Posts",
                            values: plans.map((plan) =>
                              formatPaise(plan.overageSocialPerPost) ? `${formatPaise(plan.overageSocialPerPost)}/post` : "-"
                            ),
                          },
                          {
                            label: "Extra WhatsApp",
                            values: plans.map((plan) => {
                              const included = getFeatureBoolean(plan, "whatsapp_included");
                              const overage = getFeatureNumber(plan, "whatsapp_overage");
                              return included && overage !== null ? `${formatPaise(overage)}/conv` : "N/A";
                            }),
                          },
                          {
                            label: "Additional AI Agent",
                            values: plans.map((plan) => {
                              const price = getFeatureNumber(plan, "additional_agent_price");
                              return price !== null ? `${formatPaise(price)}/mo` : "N/A";
                            }),
                          },
                        ].map((row, index) => (
                          <tr key={row.label} className={index % 2 === 0 ? "bg-transparent" : "bg-[rgba(255,255,255,0.015)]"}>
                            <td className="border-t border-[rgba(255,255,255,0.04)] px-[16px] py-[14px] font-sans text-[14px] text-[#B8B0D1]">
                              {row.label}
                            </td>
                            {row.values.map((value, valueIndex) => (
                              <td
                                key={`${row.label}-${valueIndex}`}
                                className="border-t border-[rgba(255,255,255,0.04)] px-[16px] py-[14px] text-center font-sans text-[14px] text-[#FAF7FF]"
                              >
                                {value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-[20px] rounded-[20px] border border-[rgba(139,92,246,0.15)] bg-[rgba(139,92,246,0.06)] p-[20px]">
                  <div className="flex items-start gap-[12px]">
                    <Info size={18} className="mt-[2px] shrink-0 text-[#D7C4F7]" />
                    <div>
                      <div className="font-sans text-[14px] font-semibold text-[#FAF7FF]">How overages work:</div>
                      <div className="mt-[10px] space-y-[6px] font-sans text-[14px] leading-[1.6] text-[#B8B0D1]">
                        <div>1. You receive alerts at usage thresholds</div>
                        <div>2. Service continues beyond limits (never cut off)</div>
                        <div>3. Overage charges added to next month&apos;s invoice</div>
                        <div>4. Upgrade anytime to avoid overages</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="px-[20px] pb-[60px]">
              <div className="mx-auto max-w-[1180px]">
                <div className="text-center">
                  <h2 className="font-display text-[30px] font-semibold text-[#FAF7FF]">Add-Ons</h2>
                  <p className="mx-auto mt-[12px] max-w-[520px] font-sans text-[15px] leading-[1.7] text-[#B8B0D1]">
                    Available for any plan. Add when you need them.
                  </p>
                </div>

                <div className="mt-[24px] grid grid-cols-1 gap-[16px] md:grid-cols-2 xl:grid-cols-3">
                  {ADD_ONS.map((addon) => (
                    <div key={addon.title} className="rounded-[20px] border border-[#1E0A35] bg-[#130224] p-[20px]">
                      <div className="font-display text-[18px] font-semibold text-[#FAF7FF]">{addon.title}</div>
                      <p className="mt-[10px] font-sans text-[13px] leading-[1.7] text-[#B8B0D1]">{addon.description}</p>
                      <div className="mt-[16px] font-sans text-[15px] font-semibold text-[#FBBF24]">{addon.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="border-t border-[#1E0A35] bg-[#0C0118] px-[20px] py-[100px]">
              <div className="mx-auto max-w-[820px]">
                <div className="text-center">
                  <h2 className="font-display text-[32px] font-semibold text-[#FAF7FF]">
                    Frequently Asked Questions
                  </h2>
                </div>

                <div className="mt-[34px] rounded-[24px] border border-[#1E0A35] bg-[#130224] px-[22px]">
                  {FAQS.map((faq, index) => {
                    const isOpen = openFaq === index;

                    return (
                      <div
                        key={faq.question}
                        className={`border-b border-[rgba(255,255,255,0.05)] py-[18px] ${index === FAQS.length - 1 ? "border-b-0" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaq((current) => (current === index ? null : index))}
                          className="flex w-full items-center justify-between gap-[20px] text-left"
                        >
                          <span className="font-sans text-[16px] font-semibold text-[#FAF7FF]">{faq.question}</span>
                          <span
                            className={`inline-flex h-[24px] w-[24px] items-center justify-center rounded-full border border-[#2D1255] text-[#D7C4F7] transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
                          >
                            +
                          </span>
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen ? (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.24, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <p className="pt-[12px] font-sans text-[15px] leading-[1.7] text-[#B8B0D1]">{faq.answer}</p>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="px-[20px] pb-[110px] pt-[90px] text-center">
              <div className="mx-auto max-w-[760px] rounded-[28px] border border-[#1E0A35] bg-[linear-gradient(180deg,rgba(19,2,36,0.95),rgba(12,1,24,0.98))] px-[24px] py-[42px] shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                <h2 className="font-display text-[34px] font-semibold text-[#FAF7FF]">Not Sure Which Plan Fits?</h2>
                <p className="mx-auto mt-[14px] max-w-[520px] font-sans text-[16px] leading-[1.7] text-[#B8B0D1]">
                  Talk to our team. We&apos;ll help you choose the right plan for your business.
                </p>

                <div className="mt-[28px] flex flex-col justify-center gap-[14px] sm:flex-row">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center rounded-full bg-[#F59E0B] px-[28px] py-[15px] font-sans text-[15px] font-semibold text-[#080010] transition-all duration-300 hover:-translate-y-[2px] hover:bg-[#D97706]"
                  >
                    Talk to Us {"->"}
                  </Link>
                  {hasConfiguredValue(companyPhone) ? (
                    <a
                      href={`tel:${companyPhone.replace(/\s+/g, "")}`}
                      className="inline-flex items-center justify-center rounded-full border border-[#2D1255] bg-transparent px-[28px] py-[15px] font-sans text-[15px] font-medium text-[#E9D5FF] transition-all duration-300 hover:border-[#8B5CF6] hover:bg-[rgba(139,92,246,0.08)]"
                    >
                      {`Call Now: ${companyPhone}`}
                    </a>
                  ) : null}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
