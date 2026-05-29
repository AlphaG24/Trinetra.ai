"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import Link from "next/link";

import {
  formatCurrencyFromPaise,
  formatOverageFromPaise,
  getPlanLanguagesLabel,
  PlanRecord,
  useActivePlans,
} from "@/lib/site-content";

const fallbackPlans: PlanRecord[] = [
  {
    name: "Starter",
    slug: "starter",
    description: "For small businesses beginning with AI",
    priceMonthly: 499900,
    priceAnnual: 399900,
    maxAgents: 1,
    includedVoiceMinutes: 150,
    includedChatConversations: 500,
    includedSocialPosts: 30,
    overageVoicePerMinute: 1200,
    overageChatPerConversation: 300,
    overageSocialPerPost: 1800,
    features: {
      roi_dashboard: false,
      priority_support: false,
      custom_voice: false,
      api_access: false,
      languages: ["hi", "en"],
      support_response_hours: 24,
    },
    isPopular: false,
    badgeText: "",
    displayOrder: 1,
  },
  {
    name: "Growth",
    slug: "growth",
    description: "For growing businesses that need more",
    priceMonthly: 1199900,
    priceAnnual: 959900,
    maxAgents: 3,
    includedVoiceMinutes: 400,
    includedChatConversations: 1500,
    includedSocialPosts: 60,
    overageVoicePerMinute: 1000,
    overageChatPerConversation: 200,
    overageSocialPerPost: 1500,
    features: {
      roi_dashboard: true,
      priority_support: true,
      custom_voice: false,
      api_access: false,
      weekly_reports: true,
      custom_personality: true,
      languages: ["hi", "en", "custom_1"],
      support_response_hours: 6,
    },
    isPopular: true,
    badgeText: "MOST POPULAR",
    displayOrder: 2,
  },
  {
    name: "Scale",
    slug: "scale",
    description: "For established businesses and agencies",
    priceMonthly: 2499900,
    priceAnnual: 1999900,
    maxAgents: 7,
    includedVoiceMinutes: 1200,
    includedChatConversations: 5000,
    includedSocialPosts: 120,
    overageVoicePerMinute: 800,
    overageChatPerConversation: 150,
    overageSocialPerPost: 1200,
    features: {
      roi_dashboard: true,
      priority_support: true,
      custom_voice: true,
      api_access: true,
      weekly_reports: true,
      custom_personality: true,
      dedicated_manager: true,
      export_reports: true,
      languages: ["all"],
      support_response_hours: 2,
      uptime_sla: 99.5,
    },
    isPopular: false,
    badgeText: "",
    displayOrder: 3,
  },
];

function pluralizeAgents(count: number | null) {
  if (!count) return "";
  return `Up to ${count} AI Agent${count === 1 ? "" : "s"}`;
}

function buildPlanFeatures(plan: PlanRecord) {
  const features: Array<{ text: string; included: boolean }> = [];

  if (plan.maxAgents) {
    features.push({ text: pluralizeAgents(plan.maxAgents), included: true });
  }

  if (plan.includedVoiceMinutes) {
    features.push({
      text: `${plan.includedVoiceMinutes.toLocaleString("en-IN")} voice minutes`,
      included: true,
    });
  }

  if (plan.includedChatConversations) {
    features.push({
      text: `${plan.includedChatConversations.toLocaleString("en-IN")} chat conversations`,
      included: true,
    });
  }

  if (plan.includedSocialPosts) {
    features.push({
      text: `${plan.includedSocialPosts.toLocaleString("en-IN")} social posts/month`,
      included: true,
    });
  }

  const languagesLabel = getPlanLanguagesLabel(plan.features);
  if (languagesLabel) {
    features.push({ text: languagesLabel, included: true });
  }

  const supportResponseHours =
    typeof plan.features.support_response_hours === "number"
      ? plan.features.support_response_hours
      : null;
  if (supportResponseHours !== null) {
    features.push({
      text: `Support response: ${supportResponseHours} hours`,
      included: true,
    });
  }

  const uptimeSla =
    typeof plan.features.uptime_sla === "number" || typeof plan.features.uptime_sla === "string"
      ? String(plan.features.uptime_sla)
      : "";
  if (uptimeSla) {
    features.push({ text: `SLA: ${uptimeSla}% uptime`, included: true });
  }

  const booleanFeatureLabels: Array<[string, string, boolean]> = [
    ["roi_dashboard", "ROI Dashboard", true],
    ["priority_support", "Priority Support", true],
    ["custom_voice", "Custom AI Voice", true],
    ["api_access", "API Access", true],
    ["weekly_reports", "Weekly Reports", false],
    ["custom_personality", "Custom Agent Personality", false],
    ["dedicated_manager", "Dedicated Account Manager", false],
    ["export_reports", "Exportable Reports", false],
  ];

  for (const [key, label, showWhenFalse] of booleanFeatureLabels) {
    const included = plan.features[key] === true;
    if (!included && !showWhenFalse) {
      continue;
    }

    features.push({ text: label, included });
  }

  return features;
}

function getDisplayPrice(plan: PlanRecord, isAnnual: boolean) {
  return isAnnual ? formatCurrencyFromPaise(plan.priceAnnual) : formatCurrencyFromPaise(plan.priceMonthly);
}

function getCrossedPrice(plan: PlanRecord, isAnnual: boolean) {
  if (!isAnnual) {
    return "";
  }

  return formatCurrencyFromPaise(plan.priceMonthly);
}

function getAnnualBillingLine(plan: PlanRecord, isAnnual: boolean) {
  if (!isAnnual || plan.priceAnnual === null) {
    return "";
  }

  const billedYearly = (plan.priceAnnual * 12) / 100;
  return `Billed ₹${Math.round(billedYearly).toLocaleString("en-IN")}/year`;
}

function getSavingsLine(plan: PlanRecord, isAnnual: boolean) {
  if (!isAnnual || plan.priceMonthly === null || plan.priceAnnual === null) {
    return "";
  }

  const savings = ((plan.priceMonthly - plan.priceAnnual) * 12) / 100;
  if (!Number.isFinite(savings) || savings <= 0) {
    return "";
  }

  return `Save ₹${Math.round(savings).toLocaleString("en-IN")}/year`;
}

function getOverageLine(plan: PlanRecord) {
  const voice = formatOverageFromPaise(plan.overageVoicePerMinute);
  const chat = formatOverageFromPaise(plan.overageChatPerConversation);
  const social = formatOverageFromPaise(plan.overageSocialPerPost);

  const parts = [];
  if (voice) parts.push(`${voice}/min`);
  if (chat) parts.push(`${chat}/chat`);
  if (social) parts.push(`${social}/post`);

  return parts.length > 0 ? `Overage: ${parts.join(" • ")}` : "";
}

export function PricingCards({ isAnnual }: { isAnnual: boolean }) {
  const { data, error } = useActivePlans();
  const plans = data.length > 0 ? data : error ? fallbackPlans : [];

  if (plans.length === 0) {
    return (
      <section className="w-full max-w-[1400px] mx-auto px-[20px] pb-[80px]">
        <div className="rounded-[20px] border border-[#1E0A35] bg-[#130224] px-[24px] py-[48px] text-center font-sans text-[16px] text-[#A8A0C0]">
          Pricing information coming soon.
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-[1400px] mx-auto px-[20px] pb-[80px]">
      <div className={`grid grid-cols-1 gap-[24px] ${plans.length >= 3 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2"}`}>
        {plans.map((plan, index) => {
          const displayPrice = getDisplayPrice(plan, isAnnual);
          const crossedPrice = getCrossedPrice(plan, isAnnual);
          const billedLine = getAnnualBillingLine(plan, isAnnual);
          const savingsLine = getSavingsLine(plan, isAnnual);
          const overageLine = getOverageLine(plan);
          const featureList = buildPlanFeatures(plan);
          const isLastPlan = index === plans.length - 1;
          const badge = plan.isPopular ? plan.badgeText || "MOST POPULAR" : plan.badgeText;

          return (
            <motion.div
              key={plan.slug}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 * (index + 1) }}
              className={`relative flex flex-col rounded-[20px] py-[40px] px-[32px] transition-all duration-300 ${
                plan.isPopular
                  ? "scale-100 border border-[#8B5CF6] bg-gradient-to-b from-[rgba(139,92,246,0.05)] to-[#130224] shadow-[0_0_50px_rgba(139,92,246,0.15)] xl:-translate-y-[8px]"
                  : "border border-[#1E0A35] bg-[#130224] hover:border-[#8B5CF6]/40"
              }`}
            >
              {badge ? (
                <div
                  className={`absolute left-1/2 top-[-14px] -translate-x-1/2 whitespace-nowrap rounded-[100px] px-[14px] py-[4px] font-sans text-[11px] uppercase tracking-[0.05em] ${
                    plan.isPopular
                      ? "border border-[#8B5CF6]/30 bg-[rgba(139,92,246,0.15)] font-semibold text-[#A78BFA] backdrop-blur-sm"
                      : "border border-[#2D1255] bg-[#130224] font-medium text-[#A8A0C0]"
                  }`}
                >
                  {badge}
                </div>
              ) : null}

              {plan.isPopular ? (
                <div className="absolute left-0 top-0 h-[2px] w-full rounded-t-[20px] bg-gradient-to-r from-[#FBBF24] via-[#8B5CF6] to-[#06B6D4]" />
              ) : null}

              <h3 className="mb-[8px] font-display text-[20px] font-semibold text-[#F5F3FF]">{plan.name}</h3>
              <p className="mb-[24px] min-h-[42px] font-sans text-[14px] font-normal text-[#A8A0C0]">
                {plan.description}
              </p>

              <div className="flex min-h-[140px] flex-col">
                {crossedPrice ? (
                  <div className="mb-[-4px] font-sans text-[16px] font-medium text-[#6B6088] line-through">
                    {crossedPrice}
                  </div>
                ) : null}
                <div className="relative h-[48px] overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${plan.slug}-${isAnnual ? "annual" : "monthly"}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 flex items-baseline gap-[4px]"
                    >
                      <span className="font-display text-[44px] font-bold leading-none text-[#F5F3FF]">
                        {displayPrice || ""}
                      </span>
                      {displayPrice ? (
                        <span className="font-sans text-[14px] font-normal text-[#6B6088]">/month</span>
                      ) : null}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="mt-[8px] h-[48px] font-sans text-[13px] font-normal text-[#6B6088]">
                  {billedLine ? <div>{billedLine}</div> : null}
                  {savingsLine ? <div>{savingsLine}</div> : null}
                </div>
              </div>

              <div className={`mb-[32px] h-[1px] w-full ${plan.isPopular ? "bg-[#2D1255]" : "bg-[#1E0A35]"}`} />

              <div className="mb-[40px] flex flex-grow flex-col gap-[14px]">
                {featureList.map((feature) => (
                  <div key={`${plan.slug}-${feature.text}`} className="flex items-start gap-[12px]">
                    {feature.included ? (
                      <Check size={18} className="mt-[2px] shrink-0 text-[#10B981]" />
                    ) : (
                      <X size={18} className="mt-[2px] shrink-0 text-[#6B6088]" />
                    )}
                    <span
                      className={`font-sans text-[14px] font-normal leading-tight ${
                        feature.included ? "text-[#F5F3FF]" : "text-[#6B6088]"
                      }`}
                    >
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <Link
                  href={`/contact?plan=${plan.slug}`}
                  className={`block w-full rounded-[10px] py-[14px] text-center font-sans text-[15px] transition-all duration-300 ${
                    plan.isPopular
                      ? "bg-[#8B5CF6] font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:bg-[#7C3AED]"
                      : "border border-[#8B5CF6] font-medium text-[#A78BFA] hover:bg-[#8B5CF6] hover:text-white"
                  }`}
                >
                  {isLastPlan ? "Talk to Us ->" : "Claim This Plan ->"}
                </Link>
                {overageLine ? (
                  <div className="mt-[12px] text-center font-sans text-[12px] text-[#6B6088]">
                    {overageLine}
                  </div>
                ) : null}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
