"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/utils/supabase/client";

export type SiteConfigValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | Record<string, unknown>;

export type SiteConfigMap = Record<string, SiteConfigValue>;

export interface ProductFeatureItem {
  title: string;
  description: string;
}

export interface ProductStepItem {
  title: string;
  description: string;
}

export interface ProductUseCaseItem {
  emoji: string;
  industry: string;
  description: string;
}

export interface ProductFaqItem {
  question: string;
  answer: string;
}

export type ProductStatus = "live" | "beta" | "coming_soon" | "archived";
export type ProductAgentType = "voice" | "chat" | "social" | "workflow" | "exam" | "unknown";

export interface ProductRecord {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  status: ProductStatus;
  agentType: ProductAgentType;
  features: ProductFeatureItem[];
  useCases: ProductUseCaseItem[];
  faq: ProductFaqItem[];
  howItWorks: ProductStepItem[];
  startingPrice: number | null;
  pricePerUnit: number | null;
  metaTitle: string;
  metaDescription: string;
  displayOrder: number;
  isVisible: boolean;
}

export interface PlanRecord {
  name: string;
  slug: string;
  description: string;
  priceMonthly: number | null;
  priceAnnual: number | null;
  maxAgents: number | null;
  includedVoiceMinutes: number | null;
  includedChatConversations: number | null;
  includedSocialPosts: number | null;
  overageVoicePerMinute: number | null;
  overageChatPerConversation: number | null;
  overageSocialPerPost: number | null;
  features: Record<string, unknown>;
  isPopular: boolean;
  badgeText: string;
  displayOrder: number;
}

export interface BlogPostRecord {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  publishedAt: string;
  readingTimeMinutes: number | null;
  category: string;
  coverImageUrl: string;
}

const DEFAULT_SITE_CONFIG: SiteConfigMap = {
  company_name: "Trinetra AI",
};

let siteConfigCache: SiteConfigMap | null = null;
let siteConfigPromise: Promise<SiteConfigMap> | null = null;

let productsCache: ProductRecord[] | null = null;
let productsPromise: Promise<ProductRecord[]> | null = null;

let plansCache: PlanRecord[] | null = null;
let plansPromise: Promise<PlanRecord[]> | null = null;

let blogPostsCache: BlogPostRecord[] | null = null;
let blogPostsPromise: Promise<BlogPostRecord[]> | null = null;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function asNullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }

  return fallback;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(asString).filter(Boolean);
}

function normalizeStatus(value: unknown): ProductStatus {
  return value === "live" || value === "beta" || value === "coming_soon" || value === "archived"
    ? value
    : "coming_soon";
}

function normalizeAgentType(value: unknown): ProductAgentType {
  return value === "voice" ||
    value === "chat" ||
    value === "social" ||
    value === "workflow" ||
    value === "exam"
    ? value
    : "unknown";
}

function normalizeFeatureItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isObject(item)) return null;
      const title = asString(item.title);
      const description = asString(item.description);
      if (!title && !description) return null;
      return {
        title,
        description,
      } satisfies ProductFeatureItem;
    })
    .filter((item): item is ProductFeatureItem => item !== null);
}

function normalizeStepItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isObject(item)) return null;
      const title = asString(item.title);
      const description = asString(item.description);
      if (!title && !description) return null;
      return {
        title,
        description,
      } satisfies ProductStepItem;
    })
    .filter((item): item is ProductStepItem => item !== null);
}

function normalizeUseCaseItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isObject(item)) return null;
      const emoji = asString(item.emoji);
      const industry = asString(item.industry);
      const description = asString(item.description);
      if (!industry && !description) return null;
      return {
        emoji,
        industry,
        description,
      } satisfies ProductUseCaseItem;
    })
    .filter((item): item is ProductUseCaseItem => item !== null);
}

function normalizeFaqItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isObject(item)) return null;
      const question = asString(item.question);
      const answer = asString(item.answer);
      if (!question && !answer) return null;
      return {
        question,
        answer,
      } satisfies ProductFaqItem;
    })
    .filter((item): item is ProductFaqItem => item !== null);
}

function normalizePlanFeatures(value: unknown) {
  return isObject(value) ? value : {};
}

function normalizeSiteConfigValue(value: unknown): SiteConfigValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item : JSON.stringify(item)));
  }

  if (isObject(value)) {
    return value;
  }

  return null;
}

async function fetchSiteConfigInternal() {
  const supabase = createClient();
  const { data, error } = await supabase.from("site_config").select("*");

  if (error) {
    throw error;
  }

  const nextConfig: SiteConfigMap = { ...DEFAULT_SITE_CONFIG };

  for (const row of data ?? []) {
    const key =
      asString((row as Record<string, unknown>).key) ||
      asString((row as Record<string, unknown>).config_key) ||
      asString((row as Record<string, unknown>).name);

    if (!key) {
      continue;
    }

    const rawValue =
      (row as Record<string, unknown>).value ??
      (row as Record<string, unknown>).config_value ??
      (row as Record<string, unknown>).content;

    nextConfig[key] = normalizeSiteConfigValue(rawValue);
  }

  return nextConfig;
}

async function fetchProductsInternal() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_visible", true)
    .order("display_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((item) => {
      const slug = asString(item.slug);
      const name = asString(item.name);

      if (!slug || !name) {
        return null;
      }

      return {
        slug,
        name,
        tagline: asString(item.tagline),
        description: asString(item.description),
        status: normalizeStatus(item.status),
        agentType: normalizeAgentType(item.agent_type),
        features: normalizeFeatureItems(item.features),
        useCases: normalizeUseCaseItems(item.use_cases),
        faq: normalizeFaqItems(item.faq),
        howItWorks: normalizeStepItems(item.how_it_works),
        startingPrice: asNullableNumber(item.starting_price),
        pricePerUnit: asNullableNumber(item.price_per_unit),
        metaTitle: asString(item.meta_title),
        metaDescription: asString(item.meta_description),
        displayOrder: asNullableNumber(item.display_order) ?? 0,
        isVisible: asBoolean(item.is_visible, true),
      } satisfies ProductRecord;
    })
    .filter((item): item is ProductRecord => item !== null)
    .filter((item) => item.status !== "archived");
}

async function fetchPlansInternal() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .eq("is_archived", false)
    .order("display_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((item) => {
      const name = asString(item.name);
      const slug = asString(item.slug);

      if (!name || !slug) {
        return null;
      }

      return {
        name,
        slug,
        description: asString(item.description),
        priceMonthly: asNullableNumber(item.price_monthly),
        priceAnnual: asNullableNumber(item.price_annual),
        maxAgents: asNullableNumber(item.max_agents),
        includedVoiceMinutes: asNullableNumber(item.included_voice_minutes),
        includedChatConversations: asNullableNumber(item.included_chat_conversations),
        includedSocialPosts: asNullableNumber(item.included_social_posts),
        overageVoicePerMinute: asNullableNumber(item.overage_voice_per_minute),
        overageChatPerConversation: asNullableNumber(item.overage_chat_per_conversation),
        overageSocialPerPost: asNullableNumber(item.overage_social_per_post),
        features: normalizePlanFeatures(item.features),
        isPopular: asBoolean(item.is_popular),
        badgeText: asString(item.badge_text),
        displayOrder: asNullableNumber(item.display_order) ?? 0,
      } satisfies PlanRecord;
    })
    .filter((item): item is PlanRecord => item !== null);
}

async function fetchBlogPostsInternal() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((item) => {
      const slug = asString(item.slug);
      const title = asString(item.title);
      const content = asString(item.content);

      if (!slug || !title) {
        return null;
      }

      return {
        slug,
        title,
        excerpt: asString(item.excerpt),
        content,
        publishedAt: asString(item.published_at),
        readingTimeMinutes: asNullableNumber(item.reading_time_minutes),
        category: asString(item.category),
        coverImageUrl: asString(item.cover_image_url),
      } satisfies BlogPostRecord;
    })
    .filter((item): item is BlogPostRecord => item !== null);
}

export async function loadSiteConfig() {
  if (siteConfigCache) {
    return siteConfigCache;
  }

  if (!siteConfigPromise) {
    siteConfigPromise = fetchSiteConfigInternal()
      .then((config) => {
        siteConfigCache = config;
        return config;
      })
      .finally(() => {
        siteConfigPromise = null;
      });
  }

  return siteConfigPromise;
}

export async function loadVisibleProducts() {
  if (productsCache) {
    return productsCache;
  }

  if (!productsPromise) {
    productsPromise = fetchProductsInternal()
      .then((products) => {
        productsCache = products;
        return products;
      })
      .finally(() => {
        productsPromise = null;
      });
  }

  return productsPromise;
}

export async function loadActivePlans() {
  if (plansCache) {
    return plansCache;
  }

  if (!plansPromise) {
    plansPromise = fetchPlansInternal()
      .then((plans) => {
        plansCache = plans;
        return plans;
      })
      .finally(() => {
        plansPromise = null;
      });
  }

  return plansPromise;
}

export async function loadPublishedBlogPosts() {
  if (blogPostsCache) {
    return blogPostsCache;
  }

  if (!blogPostsPromise) {
    blogPostsPromise = fetchBlogPostsInternal()
      .then((posts) => {
        blogPostsCache = posts;
        return posts;
      })
      .finally(() => {
        blogPostsPromise = null;
      });
  }

  return blogPostsPromise;
}

export async function loadVisibleProductBySlug(slug: string) {
  const products = await loadVisibleProducts();
  return products.find((product) => product.slug === slug) ?? null;
}

export async function loadPublishedBlogPostBySlug(slug: string) {
  const posts = await loadPublishedBlogPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

function useCachedResource<T>(
  load: () => Promise<T>,
  initialValue: T,
  isLoadedInitially = false
): { data: T; loading: boolean; error: Error | null } {
  const [data, setData] = useState(initialValue);
  const [loading, setLoading] = useState(!isLoadedInitially);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    void load()
      .then((result) => {
        if (!active) {
          return;
        }

        setData(result);
        setError(null);
      })
      .catch((nextError) => {
        if (!active) {
          return;
        }

        console.error("Failed to load cached resource", nextError);
        setError(nextError instanceof Error ? nextError : new Error("Unknown error"));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [load]);

  return { data, loading, error };
}

export function useSiteConfig() {
  return useCachedResource(loadSiteConfig, siteConfigCache ?? DEFAULT_SITE_CONFIG, siteConfigCache !== null);
}

export function useVisibleProducts() {
  return useCachedResource(loadVisibleProducts, productsCache ?? ([] as ProductRecord[]), productsCache !== null);
}

export function useActivePlans() {
  return useCachedResource(loadActivePlans, plansCache ?? ([] as PlanRecord[]), plansCache !== null);
}

export function usePublishedBlogPosts() {
  return useCachedResource(
    loadPublishedBlogPosts,
    blogPostsCache ?? ([] as BlogPostRecord[]),
    blogPostsCache !== null
  );
}

export function useVisibleProduct(slug: string) {
  const load = useCallback(() => loadVisibleProductBySlug(slug), [slug]);
  const cachedProduct = productsCache?.find((product) => product.slug === slug) ?? null;
  return useCachedResource(load, cachedProduct, cachedProduct !== null);
}

export function usePublishedBlogPost(slug: string) {
  const load = useCallback(() => loadPublishedBlogPostBySlug(slug), [slug]);
  const cachedPost = blogPostsCache?.find((post) => post.slug === slug) ?? null;
  return useCachedResource(load, cachedPost, cachedPost !== null);
}

export function getConfigString(config: SiteConfigMap, key: string, fallback = "") {
  const value = config[key];
  const stringValue = asString(value);
  return stringValue || fallback;
}

export function getConfigBoolean(config: SiteConfigMap, key: string, fallback = false) {
  return asBoolean(config[key], fallback);
}

export function hasConfiguredValue(value: unknown) {
  const normalized = asString(value);
  return normalized !== "" && normalized !== "REPLACE_WITH_YOUR_PHONE";
}

export function formatCurrencyFromPaise(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "";
  }

  return `₹${Math.round(value / 100).toLocaleString("en-IN")}`;
}

export function formatOverageFromPaise(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "";
  }

  const rupees = value / 100;
  const formatted =
    Number.isInteger(rupees) ? rupees.toLocaleString("en-IN") : rupees.toFixed(2);
  return `₹${formatted}`;
}

export function getPlanLanguagesLabel(features: Record<string, unknown>) {
  const languages = asStringArray(features.languages);

  if (languages.length === 0) {
    return "";
  }

  if (languages.includes("all")) {
    return "All languages supported";
  }

  const includesHindi = languages.includes("hi");
  const includesEnglish = languages.includes("en");
  const extraCount = languages.filter((language) => language !== "hi" && language !== "en").length;

  if (includesHindi && includesEnglish && extraCount > 0) {
    return `Hindi + English + ${extraCount} more`;
  }

  if (includesHindi && includesEnglish) {
    return "Hindi + English";
  }

  return languages.join(", ");
}

export function getBlogExcerpt(post: BlogPostRecord) {
  if (post.excerpt) {
    return post.excerpt;
  }

  if (!post.content) {
    return "";
  }

  const stripped = post.content.replace(/\s+/g, " ").trim();
  if (stripped.length <= 150) {
    return stripped;
  }

  return `${stripped.slice(0, 150).trimEnd()}...`;
}
