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
  const isStarter = plan.slug === "starter";
  const isScale = plan.slug === "scale" || plan.slug === "enterprise";

  if (isStarter) {
    features.push({
      text: `${plan.maxAgents || 1} AI Voice Agent`,
      tone: "included",
    });
    features.push({
      text: `${(plan.includedVoiceMinutes || 500).toLocaleString("en-IN")} voice minutes/month`,
      tone: "included",
    });
    features.push({
      text: "Hindi + English Included",
      tone: "included",
    });
    features.push({
      text: "Live Call Analytics & Transcripts",
      tone: "included",
    });
    features.push({
      text: "Calendar & Webhook Automation",
      tone: "included",
    });
    features.push({
      text: "Email Support (24hr response)",
      tone: "included",
    });
  } else if (isScale) {
    features.push({
      text: `${plan.maxAgents || 4}+ AI Voice Agents (Custom)`,
      tone: "included",
    });
    features.push({
      text: `${(plan.includedVoiceMinutes || 10000).toLocaleString("en-IN")}+ voice minutes/month`,
      tone: "included",
    });
    features.push({
      text: "All Regional & Global Languages",
      tone: "included",
    });
    features.push({
      text: "Dedicated Telephony SIP Trunk & SLA",
      tone: "included",
    });
    features.push({
      text: "Custom Knowledge Base & Voice Clones",
      tone: "included",
    });
    features.push({
      text: "Dedicated Account Manager & 24/7 Support",
      tone: "included",
    });
  } else {
    // Professional / Growth
    features.push({
      text: `${plan.maxAgents || 2} Concurrent AI Voice Agents`,
      tone: "included",
    });
    features.push({
      text: `${(plan.includedVoiceMinutes || 2000).toLocaleString("en-IN")} voice minutes/month`,
      tone: "included",
    });
    features.push({
      text: "Hindi, English + Regional Languages",
      tone: "included",
    });
    features.push({
      text: "Real-Time Dashboard & CRM Sync",
      tone: "included",
    });
    features.push({
      text: "Custom Voice & Brand Prompt Tuning",
      tone: "included",
    });
    features.push({
      text: "Priority Support (8hr response)",
      tone: "included",
    });
  }

  return features;
}

function getFeatureToneIcon(tone: Exclude<FeatureTone, "default">) {
  if (tone === "included") {
    return <Check size={15} className="mt-0.5 shrink-0 text-emerald-600" />;
  }
  if (tone === "addon") {
    return <Plus size={15} className="mt-0.5 shrink-0 text-blue-600" />;
  }
  return <X size={15} className="mt-0.5 shrink-0 text-slate-400" />;
}

function getFeatureToneTextClass(tone: Exclude<FeatureTone, "default">) {
  if (tone === "included") return "text-[#1E293B] font-medium";
  if (tone === "addon") return "text-[#2563EB] font-medium";
  return "text-[#94A3B8]";
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className={`relative flex h-full flex-col rounded-2xl border bg-white p-5 sm:p-6 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
        isPopular
          ? "border-[#2563EB] shadow-[0_8px_24px_rgba(37,99,235,0.1)] ring-1 ring-[#2563EB]/25"
          : "border-[#E2E8F0]"
      }`}
    >
      {isPopular ? (
        <div className="absolute left-1/2 top-[-11px] -translate-x-1/2 rounded-full bg-[#2563EB] px-3 py-0.5 text-center font-sans text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
          {plan.badgeText || "MOST POPULAR"}
        </div>
      ) : null}

      <div className="flex h-full flex-col">
        <h3 className="font-sans text-[20px] font-bold text-[#0F172A]">{plan.name}</h3>

        <div className="mt-3 min-h-[64px]">
          {billingMode === "annual" && monthlyPrice ? (
            <div className="mb-0.5 font-sans text-xs text-[#94A3B8] line-through">{monthlyPrice}</div>
          ) : null}

          <div className="relative min-h-[42px] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${plan.slug}-${billingMode}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0"
              >
                <div className="font-sans text-[34px] sm:text-[38px] font-black leading-none tracking-tight text-[#0F172A]">
                  {displayPrice}
                </div>
                <div className="mt-1 font-sans text-[11.5px] text-[#64748B]">
                  {billingMode === "monthly" ? "/month" : "/month (billed annually)"}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {billingMode === "annual" && savings ? (
            <div className="mt-2 inline-flex rounded-full bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 font-sans text-[10.5px] font-semibold text-emerald-700">
              Save {formatPrice(savings, currencyMode)}/year
            </div>
          ) : null}
        </div>

        {plan.description ? (
          <p className="mt-2 min-h-[32px] font-sans text-xs leading-relaxed text-[#475569]">
            {plan.description}
          </p>
        ) : null}

        <div className="my-3.5 h-px w-full bg-[#E2E8F0]" />

        <div className="flex flex-1 flex-col gap-2">
          {cardFeatures.map((feature) => (
            <div key={`${plan.slug}-${feature.text}`} className="flex items-start gap-2">
              {getFeatureToneIcon(feature.tone)}
              <span className={`font-sans text-xs sm:text-[13px] leading-snug ${getFeatureToneTextClass(feature.tone)}`}>
                {feature.text}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-1">
          {index === 2 || plan.slug === "scale" ? (
            <button
              type="button"
              onClick={onOpenEnterprise}
              className="block w-full rounded-xl py-2.5 px-4 text-center font-sans text-xs sm:text-sm font-semibold transition-all duration-200 border border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#2563EB] hover:text-[#2563EB] cursor-pointer shadow-2xs"
            >
              Contact Enterprise →
            </button>
          ) : (
            <Link
              href="/dashboard/billing"
              className={`block w-full rounded-xl py-2.5 px-4 text-center font-sans text-xs sm:text-sm font-semibold transition-all duration-200 ${
                isPopular
                  ? "bg-[#2563EB] text-white shadow-xs hover:bg-[#1D4ED8]"
                  : "border border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#2563EB] hover:text-[#2563EB] shadow-2xs"
              }`}
            >
              Get Started →
            </Link>
          )}

          {overageLine ? (
            <div className="mt-2 text-center font-sans text-[11px] leading-relaxed text-[#64748B]">
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
    if (!dbPlans.length) return [];

    return dbPlans.map((plan) => {
      const p = { ...plan };
      if (currencyMode === "USD") {
        if (p.slug === "starter") {
          p.priceMonthly = publicConfig?.starter_price_usd_cents ? parseInt(publicConfig.starter_price_usd_cents, 10) : null;
          p.priceAnnual = p.priceMonthly !== null ? Math.round(p.priceMonthly * 0.8) : null;
          if (publicConfig?.starter_minutes) p.includedVoiceMinutes = parseInt(publicConfig.starter_minutes, 10);
        } else if (p.slug === "growth" || p.slug === "professional") {
          p.name = "Professional";
          p.priceMonthly = publicConfig?.professional_price_usd_cents ? parseInt(publicConfig.professional_price_usd_cents, 10) : null;
          p.priceAnnual = p.priceMonthly !== null ? Math.round(p.priceMonthly * 0.8) : null;
          if (publicConfig?.professional_minutes) p.includedVoiceMinutes = parseInt(publicConfig.professional_minutes, 10);
        } else if (p.slug === "scale" || p.slug === "enterprise") {
          p.name = "Enterprise";
          p.priceMonthly = publicConfig?.enterprise_price_usd_cents ? parseInt(publicConfig.enterprise_price_usd_cents, 10) : 0;
          p.priceAnnual = 0;
          if (publicConfig?.enterprise_minutes) p.includedVoiceMinutes = parseInt(publicConfig.enterprise_minutes, 10);
          p.description = "Global tailored limits, international numbers, and dedicated SLA.";
        }
      } else if (currencyMode === "EUR") {
        if (p.slug === "starter") {
          p.priceMonthly = publicConfig?.starter_price_eur_cents ? parseInt(publicConfig.starter_price_eur_cents, 10) : null;
          p.priceAnnual = p.priceMonthly !== null ? Math.round(p.priceMonthly * 0.8) : null;
          if (publicConfig?.starter_minutes) p.includedVoiceMinutes = parseInt(publicConfig.starter_minutes, 10);
        } else if (p.slug === "growth" || p.slug === "professional") {
          p.name = "Professional";
          p.priceMonthly = publicConfig?.professional_price_eur_cents ? parseInt(publicConfig.professional_price_eur_cents, 10) : null;
          p.priceAnnual = p.priceMonthly !== null ? Math.round(p.priceMonthly * 0.8) : null;
          if (publicConfig?.professional_minutes) p.includedVoiceMinutes = parseInt(publicConfig.professional_minutes, 10);
        } else if (p.slug === "scale" || p.slug === "enterprise") {
          p.name = "Enterprise";
          p.priceMonthly = publicConfig?.enterprise_price_eur_cents ? parseInt(publicConfig.enterprise_price_eur_cents, 10) : 0;
          p.priceAnnual = 0;
          if (publicConfig?.enterprise_minutes) p.includedVoiceMinutes = parseInt(publicConfig.enterprise_minutes, 10);
          p.description = "European GDPR-compliant limits, EU virtual numbers, and dedicated SLA.";
        }
      } else {
        // INR: strictly from admin pricing setup (system config or database plans table)
        if (p.slug === "starter") {
          p.priceMonthly = publicConfig?.starter_price_paisa
            ? parseInt(publicConfig.starter_price_paisa, 10)
            : (plan.priceMonthly ?? null);
          p.priceAnnual = p.priceMonthly !== null ? (plan.priceAnnual ?? Math.round(p.priceMonthly * 0.8)) : null;
          if (publicConfig?.starter_minutes) p.includedVoiceMinutes = parseInt(publicConfig.starter_minutes, 10);
          if (publicConfig?.max_agents_starter) p.maxAgents = parseInt(publicConfig.max_agents_starter, 10);
        } else if (p.slug === "growth" || p.slug === "professional") {
          p.name = "Professional";
          p.priceMonthly = publicConfig?.professional_price_paisa
            ? parseInt(publicConfig.professional_price_paisa, 10)
            : (plan.priceMonthly ?? null);
          p.priceAnnual = p.priceMonthly !== null ? (plan.priceAnnual ?? Math.round(p.priceMonthly * 0.8)) : null;
          if (publicConfig?.professional_minutes) p.includedVoiceMinutes = parseInt(publicConfig.professional_minutes, 10);
          if (publicConfig?.max_agents_professional) p.maxAgents = parseInt(publicConfig.max_agents_professional, 10);
        } else if (p.slug === "scale" || p.slug === "enterprise") {
          p.name = "Enterprise";
          p.priceMonthly = publicConfig?.enterprise_price_paisa !== undefined && publicConfig.enterprise_price_paisa !== ""
            ? parseInt(publicConfig.enterprise_price_paisa, 10)
            : (plan.priceMonthly ?? 0);
          p.priceAnnual = 0;
          if (publicConfig?.enterprise_minutes) p.includedVoiceMinutes = parseInt(publicConfig.enterprise_minutes, 10);
          p.description = plan.description || "Tailored limits, custom integrations, and dedicated SLA for large enterprises.";
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

  return (
    <Layout theme="vaakriti">
      <div className="min-h-screen bg-[#FAFAFA] text-[#0F172A] pt-20 sm:pt-24">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden px-4 pb-4 pt-3 text-center">
          <div className="relative z-10 mx-auto max-w-3xl">
            <h1 className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A]">
              Simple Plans. Real Results.
            </h1>
            <p className="mx-auto mt-1.5 max-w-xl font-sans text-xs sm:text-sm text-[#475569]">
              Live pricing configured directly from our enterprise console. Scale voice automation seamlessly.
            </p>

            {/* Unified Controls: Monthly/Annual + Currency Selector in ONE row */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4">
              {/* Monthly / Annual Toggle */}
              <div className="relative flex h-[38px] w-[230px] items-center rounded-full border border-[#E2E8F0] bg-white p-1 shadow-2xs">
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
                  className={`relative z-10 flex w-1/2 items-center justify-center font-sans text-xs font-bold transition-colors cursor-pointer ${
                    billingMode === "monthly" ? "text-white" : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingMode("annual")}
                  className={`relative z-10 flex w-1/2 items-center justify-center gap-1 font-sans text-xs font-bold transition-colors cursor-pointer ${
                    billingMode === "annual" ? "text-white" : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  Annual
                  <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-extrabold ${billingMode === "annual" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"}`}>
                    -20%
                  </span>
                </button>
              </div>

              {/* Currency Selector */}
              <div className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-white p-1 shadow-2xs h-[38px]">
                <button
                  type="button"
                  onClick={() => setCurrencyMode("INR")}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    currencyMode === "INR"
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <span>🇮🇳</span> INR (₹)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrencyMode("USD")}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    currencyMode === "USD"
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <span>🌐</span> USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrencyMode("EUR")}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    currencyMode === "EUR"
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <span>🇪🇺</span> EUR (€)
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
            <section className="px-4 sm:px-6 pb-12">
              <div className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-4 sm:gap-5 lg:grid-cols-3">
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
