"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Info, Plus, X } from "lucide-react";
import Link from "next/link";

import { Layout } from "@/components/layout/Layout";
import { PlanRecord, getConfigString, hasConfiguredValue, useActivePlans, useSiteConfig } from "@/lib/site-content";
import EnterpriseContactModal from "@/components/enterprise/EnterpriseContactModal";

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
      "The onboarding setup fee is currently waived during our launch phase. Initial agent configuration, voice prompt tuning, testing, and your onboarding sessions are included with your subscription.",
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
      "Yes! You can get started immediately with our Free Trial (1 agent, 10 minutes of web calls, zero credit card required). For full dashboard access including dedicated phone numbers and 50 call minutes, you can activate the ₹99 7-Day Trial.",
  },
  {
    question: "Can I cancel my subscription?",
    answer:
      "Yes, with 30 days notice. After your minimum contract period, your plan continues month-to-month and you can cancel anytime. No penalties or hidden exit fees.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept UPI, bank transfers, and online payment via Razorpay (credit/debit cards, net banking, wallets). All payments are processed securely.",
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

const PLAN_ACCENTS = ["#2563EB", "#0284C7", "#D97706"];

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

function formatPrice(value: number | null, currency: "INR" | "USD" | "EUR" = "INR") {
  if (value === null || !Number.isFinite(value)) return "";
  if (currency === "USD") {
    const dollars = value / 100;
    const whole = Number.isInteger(dollars);
    return `$${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(dollars)}`;
  }
  if (currency === "EUR") {
    const euros = value / 100;
    const whole = Number.isInteger(euros);
    return `€${new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(euros)}`;
  }
  const rupees = value / 100;
  const whole = Number.isInteger(rupees);
  return `₹${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(rupees)}`;
}

function formatPaise(value: number | null, currency: "INR" | "USD" | "EUR" = "INR") {
  return formatPrice(value, currency);
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

function getMonthlyDisplayPrice(plan: PlanRecord, billingMode: BillingMode, currency: "INR" | "USD" | "EUR" = "INR") {
  if (plan.priceMonthly === 0) return "Custom";
  return formatPrice(billingMode === "annual" ? plan.priceAnnual : plan.priceMonthly, currency);
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
  features.push({ text: "Hindi + English Included", tone: "included" });
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

function getFeatureToneIcon(tone: Exclude<FeatureTone, "default">) {
  if (tone === "included") {
    return <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />;
  }
  if (tone === "addon") {
    return <Plus size={16} className="mt-0.5 shrink-0 text-blue-600" />;
  }
  return <X size={16} className="mt-0.5 shrink-0 text-slate-400" />;
}

function getFeatureToneTextClass(tone: Exclude<FeatureTone, "default">) {
  if (tone === "included") return "text-[#1E293B] font-medium";
  if (tone === "addon") return "text-[#2563EB] font-medium";
  return "text-[#94A3B8]";
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
          label: "Voice Minutes / Month",
          values: plans.map((plan) => ({
            text: plan.includedVoiceMinutes === null ? "-" : plan.includedVoiceMinutes.toLocaleString("en-IN"),
          })),
        },
        {
          label: "Chat Conversations / Month",
          values: plans.map((plan) => ({
            text: plan.includedChatConversations === null ? "-" : plan.includedChatConversations.toLocaleString("en-IN"),
          })),
        },
        {
          label: "Social Posts / Month",
          values: plans.map((plan) => ({
            text: plan.includedSocialPosts === null ? "-" : plan.includedSocialPosts.toLocaleString("en-IN"),
          })),
        },
        {
          label: "WhatsApp Integration",
          values: plans.map((plan) => {
            const included = getFeatureBoolean(plan, "whatsapp_included");
            const count = getFeatureNumber(plan, "whatsapp_conversations");
            const addonPrice = getFeatureNumber(plan, "whatsapp_addon_price");
            if (included) {
              return { text: count ? `Included (${count.toLocaleString("en-IN")}/mo)` : "Included", tone: "included" };
            }
            if (addonPrice !== null) {
              return { text: `Add-on (${formatPaise(addonPrice)}/mo)`, tone: "addon" };
            }
            return { text: "Not available", tone: "excluded" };
          }),
        },
      ],
    },
    {
      title: "Languages",
      rows: [
        {
          label: "Hindi Support",
          values: plans.map((plan) => ({
            text: getFeatureBoolean(plan, "hindi") ? "Included" : "Not included",
            tone: getFeatureBoolean(plan, "hindi") ? "included" : "excluded",
          })),
        },
        {
          label: "English Support",
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
      ],
    },
    {
      title: "AI Features & Customization",
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
      ],
    },
    {
      title: "Support & Infrastructure",
      rows: [
        { label: "Support Channel", values: plans.map((plan) => ({ text: getFeatureString(plan, "support_channel") || "-" })) },
        {
          label: "Response Time",
          values: plans.map((plan) => {
            const hours = getFeatureNumber(plan, "support_response_hours");
            return { text: hours !== null ? `${hours} hours` : "-" };
          }),
        },
        { label: "Uptime Target", values: plans.map((plan) => ({ text: getFeatureString(plan, "uptime_target") || "99.9%" })) },
        { label: "Data Encryption", values: plans.map((plan) => ({ text: getFeatureString(plan, "data_encryption") || "AES-256 / In-Transit TLS" })) },
      ],
    },
  ];
}

function renderComparisonCell(value: ComparisonValue) {
  const tone = value.tone ?? "default";

  if (tone === "default") {
    return <span className="text-[#1E293B]">{value.text}</span>;
  }

  if (tone === "included") {
    return (
      <span className="inline-flex items-center justify-center gap-1.5 text-emerald-700 font-medium">
        <Check size={15} className="shrink-0 text-emerald-600" />
        <span>{value.text}</span>
      </span>
    );
  }

  if (tone === "addon") {
    return (
      <span className="inline-flex items-center justify-center gap-1.5 text-blue-700 font-medium">
        <Plus size={15} className="shrink-0 text-blue-600" />
        <span>{value.text}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center gap-1.5 text-slate-400">
      <X size={15} className="shrink-0 text-slate-300" />
      <span>{value.text}</span>
    </span>
  );
}

function PricingCard({
  plan,
  index,
  billingMode,
  currencyMode = "INR",
  publicConfig,
  onOpenEnterprise,
}: {
  plan: PlanRecord;
  index: number;
  billingMode: BillingMode;
  currencyMode?: "INR" | "USD" | "EUR";
  publicConfig?: any;
  onOpenEnterprise?: () => void;
}) {
  const isPopular = plan.isPopular;
  const cardFeatures = getCardFeatures(plan);
  const setupFee = currencyMode !== "INR" ? null : getSetupFee(plan);
  const savings = getAnnualSavings(plan);
  const displayPrice = getMonthlyDisplayPrice(plan, billingMode, currencyMode);
  const monthlyPrice = formatPrice(plan.priceMonthly, currencyMode);
  const overageLine = currencyMode === "USD"
    ? `${publicConfig?.overage_per_minute_usd_cents ? `$${(parseInt(publicConfig.overage_per_minute_usd_cents, 10) / 100).toFixed(2)}` : "$0.12"}/min`
    : currencyMode === "EUR"
    ? `${publicConfig?.overage_per_minute_eur_cents ? `€${(parseInt(publicConfig.overage_per_minute_eur_cents, 10) / 100).toFixed(2)}` : "€0.11"}/min`
    : [
        plan.overageVoicePerMinute !== null ? `${formatPrice(plan.overageVoicePerMinute, currencyMode)}/min` : "",
        plan.overageChatPerConversation !== null ? `${formatPrice(plan.overageChatPerConversation, currencyMode)}/chat` : "",
      ]
        .filter(Boolean)
        .join(" • ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className={`relative flex h-full flex-col rounded-2xl border bg-white p-7 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
        isPopular
          ? "border-[#2563EB] shadow-[0_12px_36px_rgba(37,99,235,0.12)] ring-1 ring-[#2563EB]/20"
          : "border-[#E2E8F0]"
      }`}
    >
      {isPopular ? (
        <div className="absolute left-1/2 top-[-13px] -translate-x-1/2 rounded-full bg-[#2563EB] px-3.5 py-1 text-center font-sans text-[10.5px] font-bold uppercase tracking-wider text-white shadow-xs">
          {plan.badgeText || "MOST POPULAR"}
        </div>
      ) : null}

      <div className="flex h-full flex-col">
        <h3 className="font-sans text-[22px] font-bold text-[#0F172A]">{plan.name}</h3>

        <div className="mt-5 min-h-[110px]">
          {billingMode === "annual" && monthlyPrice ? (
            <div className="mb-1 font-sans text-[14px] text-[#94A3B8] line-through">{monthlyPrice}</div>
          ) : null}

          <div className="relative min-h-[54px] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${plan.slug}-${billingMode}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <div className="font-sans text-[42px] font-black leading-none tracking-tight text-[#0F172A]">
                  {displayPrice}
                </div>
                <div className="mt-1.5 font-sans text-[12.5px] text-[#64748B]">
                  {billingMode === "monthly" ? "/month" : "/month (billed annually)"}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {billingMode === "annual" && savings ? (
            <div className="mt-4 inline-flex rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 font-sans text-[11.5px] font-semibold text-emerald-700">
              Save {formatPrice(savings, currencyMode)}/year
            </div>
          ) : null}
        </div>

        {setupFee ? (
          <div className="mt-2 font-sans text-[12.5px] text-[#64748B]">
            One-time setup: {formatPrice(setupFee, currencyMode)}
          </div>
        ) : null}

        {plan.description ? (
          <p className="mt-3.5 min-h-[40px] font-sans text-[13.5px] leading-relaxed text-[#475569]">
            {plan.description}
          </p>
        ) : null}

        <div className="my-5 h-px w-full bg-[#E2E8F0]" />

        <div className="flex flex-1 flex-col gap-3">
          {cardFeatures.map((feature) => (
            <div key={`${plan.slug}-${feature.text}`} className="flex items-start gap-2.5">
              {getFeatureToneIcon(feature.tone)}
              <span className={`font-sans text-[13.5px] leading-snug ${getFeatureToneTextClass(feature.tone)}`}>
                {feature.text}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6">
          {index === 2 || plan.slug === "scale" ? (
            <button
              type="button"
              onClick={onOpenEnterprise}
              className="block w-full rounded-xl px-4 py-3 text-center font-sans text-[14px] font-semibold transition-all duration-200 border border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#2563EB] hover:text-[#2563EB] cursor-pointer shadow-2xs"
            >
              Contact Enterprise →
            </button>
          ) : (
            <Link
              href="/dashboard/billing"
              className={`block w-full rounded-xl px-4 py-3 text-center font-sans text-[14px] font-semibold transition-all duration-200 ${
                isPopular
                  ? "bg-[#2563EB] text-white shadow-xs hover:bg-[#1D4ED8]"
                  : "border border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#2563EB] hover:text-[#2563EB] shadow-2xs"
              }`}
            >
              Get Started →
            </Link>
          )}

          {overageLine ? (
            <div className="mt-3 text-center font-sans text-[11.5px] leading-relaxed text-[#64748B]">
              Overage: {overageLine}
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export default function PricingPage() {
  const { data: dbPlans, loading } = useActivePlans();
  const [publicConfig, setPublicConfig] = useState<any>(null);
  const [currencyMode, setCurrencyMode] = useState<"INR" | "USD" | "EUR">("INR");

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.startsWith("Europe/")) {
        setCurrencyMode("EUR");
      } else if (tz && !tz.includes("Calcutta") && !tz.includes("Kolkata") && !tz.includes("Asia/Colombo")) {
        setCurrencyMode("USD");
      }
    } catch {
      // fallback to INR
    }
  }, []);

  useEffect(() => {
    fetch("/api/public/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.configs) {
          setPublicConfig(data.configs);
        }
      })
      .catch((err) => console.error("Error loading config:", err));
  }, []);

  const plans = useMemo(() => {
    if (!publicConfig && !dbPlans.length) return dbPlans;

    return dbPlans.map((plan) => {
      const p = { ...plan };
      if (currencyMode === "USD") {
        if (p.slug === "starter") {
          p.priceMonthly = parseInt(publicConfig?.starter_price_usd_cents || "8900", 10);
          p.priceAnnual = Math.round(p.priceMonthly * 0.8);
          p.includedVoiceMinutes = parseInt(publicConfig?.starter_minutes || "500", 10);
        } else if (p.slug === "growth") {
          p.name = "Professional";
          p.priceMonthly = parseInt(publicConfig?.professional_price_usd_cents || "24900", 10);
          p.priceAnnual = Math.round(p.priceMonthly * 0.8);
          p.includedVoiceMinutes = parseInt(publicConfig?.professional_minutes || "2000", 10);
        } else if (p.slug === "scale") {
          p.name = "Enterprise";
          p.priceMonthly = parseInt(publicConfig?.enterprise_price_usd_cents || "59900", 10);
          p.priceAnnual = Math.round(p.priceMonthly * 0.8);
          p.includedVoiceMinutes = parseInt(publicConfig?.enterprise_minutes || "10000", 10);
          p.description = "Global tailored limits, international numbers, and dedicated SLA.";
        }
      } else if (currencyMode === "EUR") {
        if (p.slug === "starter") {
          p.priceMonthly = parseInt(publicConfig?.starter_price_eur_cents || "7900", 10);
          p.priceAnnual = Math.round(p.priceMonthly * 0.8);
          p.includedVoiceMinutes = parseInt(publicConfig?.starter_minutes || "500", 10);
        } else if (p.slug === "growth") {
          p.name = "Professional";
          p.priceMonthly = parseInt(publicConfig?.professional_price_eur_cents || "21900", 10);
          p.priceAnnual = Math.round(p.priceMonthly * 0.8);
          p.includedVoiceMinutes = parseInt(publicConfig?.professional_minutes || "2000", 10);
        } else if (p.slug === "scale") {
          p.name = "Enterprise";
          p.priceMonthly = parseInt(publicConfig?.enterprise_price_eur_cents || "49900", 10);
          p.priceAnnual = Math.round(p.priceMonthly * 0.8);
          p.includedVoiceMinutes = parseInt(publicConfig?.enterprise_minutes || "10000", 10);
          p.description = "European GDPR-compliant limits, EU virtual numbers, and dedicated SLA.";
        }
      } else {
        if (p.slug === "starter") {
          p.priceMonthly = parseInt(publicConfig?.starter_price_paisa || "499900", 10);
          p.priceAnnual = Math.round(p.priceMonthly * 0.8);
          p.includedVoiceMinutes = parseInt(publicConfig?.starter_minutes || "500", 10);
        } else if (p.slug === "growth") {
          p.name = "Professional";
          p.priceMonthly = parseInt(publicConfig?.professional_price_paisa || "1499900", 10);
          p.priceAnnual = Math.round(p.priceMonthly * 0.8);
          p.includedVoiceMinutes = parseInt(publicConfig?.professional_minutes || "2000", 10);
        } else if (p.slug === "scale") {
          p.name = "Enterprise";
          p.priceMonthly = parseInt(publicConfig?.enterprise_price_paisa || "0", 10);
          p.priceAnnual = 0;
          p.includedVoiceMinutes = parseInt(publicConfig?.enterprise_minutes || "10000", 10);
          p.description = "Tailored limits, custom integrations, and dedicated SLA for large enterprises.";
        }
      }
      if (currencyMode === "INR" && publicConfig?.overage_per_minute_paisa) {
        p.overageVoicePerMinute = parseInt(publicConfig.overage_per_minute_paisa, 10);
      }
      return p;
    });
  }, [dbPlans, publicConfig, currencyMode]);

  const { data: siteConfig } = useSiteConfig();
  const [billingMode, setBillingMode] = useState<BillingMode>("monthly");
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false);

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
    <Layout theme="vaakriti">
      <div className="min-h-screen bg-[#FAFAFA] text-[#0F172A] pt-24 sm:pt-28">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden px-5 pb-12 pt-8 text-center">
          <div className="relative z-10 mx-auto max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[#2563EB]/25 bg-[#2563EB]/10 px-4 py-1.5 font-sans text-[12.5px] font-semibold text-[#2563EB]">
              <span>✦</span> Transparent Pricing
            </div>
            <h1 className="font-sans text-[36px] md:text-[48px] font-extrabold tracking-tight text-[#0F172A]">
              Simple Plans. Real Results.
            </h1>
            <p className="mx-auto mt-4 max-w-xl font-sans text-[16px] leading-relaxed text-[#475569]">
              Live pricing configured directly from our enterprise console. Scale voice automation seamlessly.
            </p>

            {/* Currency Selector */}
            <div className="mt-7 flex justify-center">
              <div className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-white p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCurrencyMode("INR")}
                  className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    currencyMode === "INR"
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <span>🇮🇳</span> India (INR ₹)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrencyMode("USD")}
                  className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    currencyMode === "USD"
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <span>🌐</span> Global (USD $)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrencyMode("EUR")}
                  className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    currencyMode === "EUR"
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <span>🇪🇺</span> Europe (EUR €)
                </button>
              </div>
            </div>

            {/* Monthly / Annual Toggle */}
            <div className="mt-5 flex justify-center">
              <div className="relative flex h-[42px] w-full max-w-[280px] items-center rounded-full border border-[#E2E8F0] bg-white p-1 shadow-2xs">
                <motion.div
                  className="absolute bottom-1 top-1 rounded-full bg-[#2563EB]"
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
                  className={`relative z-10 flex w-1/2 items-center justify-center font-sans text-[13.5px] font-semibold transition-colors cursor-pointer ${
                    billingMode === "monthly" ? "text-white" : "text-[#64748B]"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingMode("annual")}
                  className={`relative z-10 flex w-1/2 items-center justify-center gap-1.5 font-sans text-[13.5px] font-semibold transition-colors cursor-pointer ${
                    billingMode === "annual" ? "text-white" : "text-[#64748B]"
                  }`}
                >
                  Annual
                  <span className="rounded-full bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-700">
                    {maxSavingsPercent > 0 ? `-${maxSavingsPercent}%` : "Save"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="px-5 pb-24">
            <div className="mx-auto max-w-5xl rounded-2xl border border-[#E2E8F0] bg-white px-6 py-12 text-center font-sans text-sm text-[#64748B] shadow-xs">
              Loading pricing plans...
            </div>
          </section>
        ) : plans.length === 0 ? (
          <section className="px-5 pb-24">
            <div className="mx-auto max-w-5xl rounded-2xl border border-[#E2E8F0] bg-white px-6 py-12 text-center font-sans text-sm text-[#64748B] shadow-xs">
              Pricing coming soon.
            </div>
          </section>
        ) : (
          <>
            {/* PRICING CARDS */}
            <section className="px-5 pb-16">
              <div className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
                {plans.map((plan, index) => (
                  <PricingCard
                    key={plan.slug}
                    plan={plan}
                    index={index}
                    billingMode={billingMode}
                    currencyMode={currencyMode}
                    publicConfig={publicConfig}
                    onOpenEnterprise={() => setIsEnterpriseModalOpen(true)}
                  />
                ))}
              </div>
            </section>

            {/* COMPARISON TABLE */}
            <section className="px-5 pb-16">
              <div className="mx-auto max-w-6xl">
                <div className="text-center">
                  <h2 className="font-sans text-[28px] font-bold text-[#0F172A]">
                    Detailed Feature Comparison
                  </h2>
                  <p className="mx-auto mt-2.5 max-w-md font-sans text-[14.5px] text-[#64748B]">
                    Everything included in each plan, side by side.
                  </p>
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setComparisonOpen((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-full border border-[#CBD5E1] bg-white px-5 py-2 font-sans text-[13.5px] font-semibold text-[#0F172A] shadow-2xs hover:border-[#2563EB] hover:text-[#2563EB] transition-colors cursor-pointer"
                  >
                    {comparisonOpen ? "Hide Comparison" : "View Full Comparison"}
                    <ChevronDown size={15} className={`transition-transform ${comparisonOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {comparisonOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-6 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[880px] border-collapse">
                            <thead className="sticky top-0 z-10 bg-[#F8FAFC]">
                              <tr className="border-b border-[#E2E8F0]">
                                <th className="px-4 py-3.5 text-left font-sans text-[12px] uppercase tracking-wider text-[#64748B]">
                                  Feature
                                </th>
                                {plans.map((plan, index) => (
                                  <th
                                    key={`${plan.slug}-head`}
                                    className="px-4 py-3.5 text-center font-sans text-[13.5px] font-bold text-[#0F172A]"
                                  >
                                    <div className="inline-flex items-center gap-2">
                                      <span
                                        className="h-2 w-2 rounded-full"
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
                                <tr className="bg-[#F1F5F9]/60">
                                  <td
                                    colSpan={plans.length + 1}
                                    className="px-4 py-2.5 text-left font-sans text-[11px] font-bold uppercase tracking-wider text-[#2563EB]"
                                  >
                                    {group.title}
                                  </td>
                                </tr>
                                {group.rows.map((row, rowIndex) => (
                                  <tr
                                    key={`${group.title}-${row.label}`}
                                    className={rowIndex % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}
                                  >
                                    <td className="border-t border-[#E2E8F0] px-4 py-3 font-sans text-[13.5px] text-[#334155]">
                                      {row.label}
                                    </td>
                                    {row.values.map((value, valueIndex) => (
                                      <td
                                        key={`${group.title}-${row.label}-${valueIndex}`}
                                        className="border-t border-[#E2E8F0] px-4 py-3 text-center font-sans text-[13.5px]"
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
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* ADD-ONS SECTION */}
            <section className="px-5 pb-16">
              <div className="mx-auto max-w-6xl">
                <div className="text-center">
                  <h2 className="font-sans text-[28px] font-bold text-[#0F172A]">Add-Ons</h2>
                  <p className="mx-auto mt-2 max-w-lg font-sans text-[14.5px] text-[#64748B]">
                    Available for any plan. Add modular capabilities when you need them.
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {ADD_ONS.map((addon) => (
                    <div
                      key={addon.title}
                      className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs hover:border-[#2563EB]/40 transition-colors"
                    >
                      <div className="font-sans text-[16px] font-bold text-[#0F172A]">{addon.title}</div>
                      <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-[#64748B]">{addon.description}</p>
                      <div className="mt-4 font-sans text-[14px] font-bold text-[#2563EB]">{addon.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* FAQ SECTION */}
            <section className="border-t border-[#E2E8F0] bg-white px-5 py-20">
              <div className="mx-auto max-w-3xl">
                <div className="text-center">
                  <h2 className="font-sans text-[30px] font-bold text-[#0F172A]">
                    Frequently Asked Questions
                  </h2>
                </div>

                <div className="mt-8 rounded-2xl border border-[#E2E8F0] bg-[#FAFAFA] px-6">
                  {FAQS.map((faq, index) => {
                    const isOpen = openFaq === index;

                    return (
                      <div
                        key={faq.question}
                        className={`border-b border-[#E2E8F0] py-4.5 ${
                          index === FAQS.length - 1 ? "border-b-0" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaq((current) => (current === index ? null : index))}
                          className="flex w-full items-center justify-between gap-4 text-left cursor-pointer"
                        >
                          <span className="font-sans text-[15px] font-semibold text-[#0F172A]">{faq.question}</span>
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#CBD5E1] text-[#64748B] text-sm font-semibold transition-transform duration-200 ${
                              isOpen ? "rotate-45" : ""
                            }`}
                          >
                            +
                          </span>
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <p className="pt-3 font-sans text-[13.5px] leading-relaxed text-[#475569]">
                                {faq.answer}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* NOT SURE CALLOUT BANNER */}
            <section className="px-5 pb-24 pt-12 text-center bg-[#FAFAFA]">
              <div className="mx-auto max-w-3xl rounded-3xl border border-[#E2E8F0] bg-white px-6 py-10 shadow-xs">
                <h2 className="font-sans text-[28px] font-bold text-[#0F172A]">Not Sure Which Plan Fits?</h2>
                <p className="mx-auto mt-3 max-w-lg font-sans text-[14.5px] leading-relaxed text-[#475569]">
                  Talk to our enterprise voice specialists. We&apos;ll help calculate your call volumes and ROI.
                </p>

                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center rounded-full bg-[#2563EB] px-6 py-3 font-sans text-[14px] font-semibold text-white shadow-xs transition-all duration-200 hover:bg-[#1D4ED8]"
                  >
                    Talk to Us →
                  </Link>
                  {hasConfiguredValue(companyPhone) ? (
                    <a
                      href={`tel:${companyPhone.replace(/\s+/g, "")}`}
                      className="inline-flex items-center justify-center rounded-full border border-[#CBD5E1] bg-white px-6 py-3 font-sans text-[14px] font-semibold text-[#0F172A] transition-all duration-200 hover:border-[#2563EB] hover:text-[#2563EB] shadow-2xs"
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

      <EnterpriseContactModal
        isOpen={isEnterpriseModalOpen}
        onClose={() => setIsEnterpriseModalOpen(false)}
      />
    </Layout>
  );
}
