"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  GraduationCap,
  Globe,
  Building2,
  Handshake,
  PhoneCall,
  Mic,
  Bot,
  CreditCard,
  Code2,
  Cpu,
  FileText,
  BookOpen,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import {
  getConfigString,
  useSiteConfig,
  useVisibleProducts,
} from "@/lib/site-content";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { VaakritiWordmark } from "@/components/ui/VaakritiWordmark";

export type MegamenuTab = "products" | "developers" | "resources" | "company";

export interface MegamenuPageItem {
  name: string;
  description: string;
  href: string;
  icon: any;
}

export interface MegamenuCardItem {
  image: string;
  tag: string;
  title: string;
  subtitle: string;
  href: string;
}

export const MEGAMENU_TABS: Record<
  MegamenuTab,
  {
    label: string;
    pages: MegamenuPageItem[];
    cards: MegamenuCardItem[];
  }
> = {
  products: {
    label: "Products",
    pages: [
      {
        name: "Voice Studio Demo",
        description: "Experience conversational voice AI live in your browser",
        href: "/demo",
        icon: Mic,
      },
      {
        name: "Agent Directory",
        description: "Browse pre-configured autonomous inbound & outbound agents",
        href: "/marketplace",
        icon: Bot,
      },
      {
        name: "Pricing & Plans",
        description: "Transparent usage tiers, enterprise SIP trunks & SLA packages",
        href: "/pricing",
        icon: CreditCard,
      },
    ],
    cards: [
      {
        image: "/images/vaakriti_voice_ai.jpg",
        tag: "Autonomous Voice",
        title: "Real-time Multilingual Indian Telephony",
        subtitle: "Experience live voice studio",
        href: "/demo",
      },
      {
        image: "/images/vaakriti_arch.jpg",
        tag: "Enterprise Scale",
        title: "Scalable Sovereign Voice Infrastructure",
        subtitle: "Explore enterprise plans",
        href: "/pricing",
      },
    ],
  },
  developers: {
    label: "Developers",
    pages: [
      {
        name: "Documentation",
        description: "Developer guides, quickstarts, and platform architecture",
        href: "/docs",
        icon: Code2,
      },
      {
        name: "WebRTC Audio SDK",
        description: "Ultra-low latency streaming for web & mobile apps",
        href: "/docs",
        icon: Cpu,
      },
      {
        name: "API & Webhooks",
        description: "Real-time telephony webhooks and event streaming",
        href: "/docs",
        icon: FileText,
      },
    ],
    cards: [
      {
        image: "/images/vaakriti_arch.jpg",
        tag: "Developer SDK",
        title: "Integrate Voice AI in under 10 lines of code",
        subtitle: "View documentation",
        href: "/docs",
      },
      {
        image: "/images/vaakriti_voice_ai.jpg",
        tag: "Low Latency",
        title: "< 450ms Bidirectional Audio Streaming",
        subtitle: "Test in demo studio",
        href: "/demo",
      },
    ],
  },
  resources: {
    label: "Resources",
    pages: [
      {
        name: "Research & Blog",
        description: "Articles on Indic voice AI, latency, and telephony",
        href: "/blog",
        icon: BookOpen,
      },
      {
        name: "Privacy & Security",
        description: "Strict tenant isolation, data governance, and RLS",
        href: "/privacy",
        icon: ShieldCheck,
      },
      {
        name: "Terms of Service",
        description: "Enterprise SLA, platform policies, and guidelines",
        href: "/terms",
        icon: FileText,
      },
    ],
    cards: [
      {
        image: "/images/vaakriti_arch.jpg",
        tag: "Research & Insights",
        title: "Scaling Indian Voice AI Across Regional Dialects",
        subtitle: "Read our technical research",
        href: "/blog",
      },
      {
        image: "/images/vaakriti_voice_ai.jpg",
        tag: "Whitepaper",
        title: "Autonomous Agents vs Traditional Telecom IVR",
        subtitle: "Explore research findings",
        href: "/blog",
      },
    ],
  },
  company: {
    label: "Company",
    pages: [
      {
        name: "About Vaakriti",
        description: "Our mission, vision, and team building India's voice AI",
        href: "/about",
        icon: Building2,
      },
      {
        name: "Partners & Affiliates",
        description: "Agency partner program, reseller revenue, and co-selling",
        href: "/partners",
        icon: Handshake,
      },
      {
        name: "Contact Us",
        description: "Talk to our enterprise voice solutions architecture team",
        href: "/contact",
        icon: PhoneCall,
      },
    ],
    cards: [
      {
        image: "/images/vaakriti_arch.jpg",
        tag: "Announcing Vaakriti",
        title: "Sovereign Multilingual Voice AI for India",
        subtitle: "Learn about our journey",
        href: "/about",
      },
      {
        image: "/images/vaakriti_voice_ai.jpg",
        tag: "Brand Identity",
        title: "A New Identity for Conversational Intelligence",
        subtitle: "Get in touch with us",
        href: "/contact",
      },
    ],
  },
};

type ProductStatus = "live" | "beta" | "coming_soon";

interface ProductNavItem {
  slug: string;
  name: string;
  tagline: string;
  status: ProductStatus;
}

const navLinks = [
  { name: "About", href: "/about" },
  { name: "Blog", href: "/blog" },
];

const fallbackProducts: ProductNavItem[] = [
  {
    slug: "voice-agent",
    name: "AI Voice Agent",
    tagline: "Always-on voice reception and appointment booking.",
    status: "live",
  },
  {
    slug: "workflow-agent",
    name: "AI Workflow Agent",
    tagline: "Cross-tool automations for business operations.",
    status: "coming_soon",
  },
];

function canNavigateToProduct(status: ProductStatus) {
  return status === "live" || status === "beta";
}

function getStatusMeta(status: ProductStatus) {
  switch (status) {
    case "live":
      return {
        label: "Live",
        dotClass: "bg-[#10B981]",
        textClass: "text-[#10B981]",
      };
    case "beta":
      return {
        label: "Beta",
        dotClass: "bg-[#F59E0B]",
        textClass: "text-[#F59E0B]",
      };
    default:
      return {
        label: "Coming Soon",
        dotClass: "bg-[#6B6088]",
        textClass: "text-[#A8A0C0]",
      };
  }
}

export function Navbar() {
  const { user, role } = useAuth();
  const { data: siteConfig } = useSiteConfig();
  const { data: productsData, loading: productsLoading, error: productsError } = useVisibleProducts();
  const [menuOpen, setMenuOpen] = useState(false);
  const [productsExpanded, setProductsExpanded] = useState(false);
  const [productsMenuOpen, setProductsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [announcement, setAnnouncement] = useState({
    enabled: false,
    tag: "PLATFORM",
    text: "How Autonomous Voice Agents handle complex Indian calls",
    action_text: "Experience Live",
    action_url: "",
  });
  const [activeTab, setActiveTab] = useState<MegamenuTab | null>(null);
  const megamenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnterTab = (tab: MegamenuTab) => {
    if (megamenuTimerRef.current) {
      clearTimeout(megamenuTimerRef.current);
      megamenuTimerRef.current = null;
    }
    setActiveTab(tab);
  };

  const handleMouseEnterPopover = () => {
    if (megamenuTimerRef.current) {
      clearTimeout(megamenuTimerRef.current);
      megamenuTimerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (megamenuTimerRef.current) {
      clearTimeout(megamenuTimerRef.current);
    }
    megamenuTimerRef.current = setTimeout(() => {
      setActiveTab(null);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (megamenuTimerRef.current) {
        clearTimeout(megamenuTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    fetch("/api/public/announcement")
      .then((res) => res.json())
      .then((json) => {
        if (json?.data) {
          setAnnouncement(json.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleAnnouncementClick = () => {
    if (announcement.action_url) return;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-hero-callback-modal"));
    }
  };
  const companyName = "Trinetra";
  const products: ProductNavItem[] =
    productsData.length > 0
      ? productsData.map((product) => ({
          slug: product.slug,
          name: product.name,
          tagline: product.tagline || product.description,
          status:
            product.status === "live" || product.status === "beta" || product.status === "coming_soon"
              ? product.status
              : "coming_soon",
        }))
      : productsError
        ? fallbackProducts
        : [];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const toggleMenu = useCallback(() => setMenuOpen((prev) => !prev), []);

  const openProductsMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    setProductsMenuOpen(true);
  };

  const closeProductsMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = setTimeout(() => {
      setProductsMenuOpen(false);
    }, 140);
  };

  const handleComingSoonClick = () => {
    toast("Coming Soon! We're working on it.");
    setMenuOpen(false);
    setProductsExpanded(false);
    setProductsMenuOpen(false);
  };

  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    return (
      <>
        <header
          onMouseLeave={handleMouseLeave}
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            scrolled || activeTab
              ? "backdrop-blur-md shadow-xs border-b bg-white/95 border-[#E2E8F0]"
              : "bg-transparent border-0 border-none shadow-none"
          }`}
        >
          {/* ── 1. TOP ANNOUNCEMENT TAB ── */}
          <div
            suppressHydrationWarning
            className={`w-full transition-all duration-300 ${
              scrolled
                ? "max-h-0 opacity-0 overflow-hidden py-0 border-0 pointer-events-none"
                : "max-h-16 opacity-100 py-1.5 px-3 border-b shadow-none bg-[#F1F5F9]/90 border-[#E2E8F0]"
            }`}
          >
            <div className="max-w-[1536px] mx-auto flex items-center justify-center gap-1.5 sm:gap-2.5 text-[11px] sm:text-[12px] font-sans">
              <span className="text-[10px] hidden sm:inline select-none text-[#2563EB]">✦ ✦ ✦</span>
              <span
                className="px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider border font-sans bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/25"
              >
                {announcement.tag || "Platform"}
              </span>
              <span
                className="font-medium truncate max-w-[280px] sm:max-w-none font-sans text-[#334155]"
              >
                {announcement.text || "How Autonomous Voice Agents handle complex Indian calls"}
              </span>
              {announcement.action_url ? (
                <Link
                  href={announcement.action_url}
                  className="font-semibold underline underline-offset-4 transition-colors cursor-pointer ml-1 font-sans text-[#2563EB] hover:text-[#1D4ED8]"
                >
                  {announcement.action_text || "Experience Live →"}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleAnnouncementClick}
                  className="font-semibold underline underline-offset-4 transition-colors cursor-pointer ml-1 font-sans text-[#2563EB] hover:text-[#1D4ED8]"
                >
                  {announcement.action_text || "Experience Live →"}
                </button>
              )}
              <span className="text-[10px] hidden sm:inline select-none text-[#2563EB]">✦ ✦ ✦</span>
            </div>
          </div>

          {/* ── 2. MAIN NAVIGATION BAR ── */}
          <div className="w-full max-w-[1536px] h-[54px] sm:h-[62px] mx-auto px-6 sm:px-10 lg:px-14 flex items-center justify-between">
            {/* Brand Logo on Left */}
            <div className="flex items-center gap-3">
              <Link href="/" className="group select-none flex items-center py-2" aria-label="Vaakriti Home">
                <div className="text-[#0F172A] hover:text-[#2563EB] transition-colors">
                  <VaakritiWordmark className="h-[15px] sm:h-[16.5px] md:h-[18px] w-auto transition-colors duration-200" />
                </div>
              </Link>
            </div>

            {/* Navigation Tabs (Hovering opens Sarvam-style Megamenu with real pages) */}
            <nav className="hidden md:flex items-center gap-7 lg:gap-9">
              {(["products", "developers", "resources", "company"] as const).map((tabKey) => {
                const tab = MEGAMENU_TABS[tabKey];
                const isActive = activeTab === tabKey;
                return (
                  <button
                    key={tabKey}
                    type="button"
                    onMouseEnter={() => handleMouseEnterTab(tabKey)}
                    onClick={() => setActiveTab(activeTab === tabKey ? null : tabKey)}
                    className={`text-[13.5px] font-medium transition-colors font-sans py-2.5 flex items-center gap-1 cursor-pointer select-none ${
                      isActive ? "text-[#2563EB] font-semibold" : "text-[#1E293B] hover:text-[#2563EB]"
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Action Buttons: Go to Dashboard, Contact Us */}
            <div className="hidden sm:flex items-center gap-3">
              <Link
                href={user ? (role === 'admin' || role === 'super_admin' ? '/admin' : '/dashboard') : '/login'}
                className="inline-flex items-center justify-center px-5 py-2 text-[13px] font-semibold rounded-full shadow-xs transition-all duration-200 cursor-pointer font-sans bg-[#0F172A] text-white hover:bg-[#1E293B]"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-4.5 py-2 text-[13px] font-semibold rounded-full shadow-2xs transition-all duration-200 cursor-pointer font-sans bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
              >
                Contact Us
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={toggleMenu}
              className="sm:hidden p-2 text-[#0F172A] hover:text-[#2563EB]"
              aria-label="Toggle Navigation Menu"
            >
              <span className="block w-5 h-0.5 bg-current mb-1" />
              <span className="block w-5 h-0.5 bg-current mb-1" />
              <span className="block w-5 h-0.5 bg-current" />
            </button>
          </div>

          {/* ── 3. SARVAM-STYLE HOVER MEGAMENU POPOVER MODAL ── */}
          <AnimatePresence>
            {activeTab && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                onMouseEnter={handleMouseEnterPopover}
                onMouseLeave={handleMouseLeave}
                className="w-full bg-white/98 backdrop-blur-2xl border-t border-b border-[#E2E8F0] shadow-[0_24px_60px_rgba(15,23,42,0.08)] py-8 z-40 select-none"
              >
                <div className="max-w-[1340px] mx-auto px-6 sm:px-10 lg:px-14 grid grid-cols-12 gap-8 items-stretch">
                  
                  {/* Left Column: Real Website Pages with Crisp Icons (Sarvam-inspired) */}
                  <div className="col-span-12 lg:col-span-5 flex flex-col justify-center space-y-2 border-r-0 lg:border-r border-[#E2E8F0] pr-0 lg:pr-8">
                    {MEGAMENU_TABS[activeTab].pages.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setActiveTab(null)}
                          className="group flex items-start gap-3.5 p-3 rounded-2xl hover:bg-[#F8FAFC] transition-all duration-200"
                        >
                          <div className="w-9 h-9 rounded-xl bg-[#F1F5F9] group-hover:bg-[#2563EB]/10 border border-[#E2E8F0] group-hover:border-[#2563EB]/25 flex items-center justify-center text-[#475569] group-hover:text-[#2563EB] transition-colors shrink-0 mt-0.5">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors flex items-center gap-1 font-sans">
                              {item.name}
                              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#2563EB]" />
                            </div>
                            <p className="text-[12px] text-[#64748B] font-sans leading-relaxed mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Right Column: Visual Announcement Cards (Fills blank space with generated imagery) */}
                  <div className="col-span-12 lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {MEGAMENU_TABS[activeTab].cards.map((card) => (
                      <Link
                        key={card.title}
                        href={card.href}
                        onClick={() => setActiveTab(null)}
                        className="group block relative rounded-2xl overflow-hidden border border-[#E2E8F0] bg-white hover:border-[#2563EB]/40 hover:shadow-lg transition-all duration-300"
                      >
                        <div className="relative w-full h-[140px] sm:h-[155px] overflow-hidden bg-slate-100">
                          <Image
                            src={card.image}
                            alt={card.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 768px) 100vw, 360px"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                          <div className="absolute top-3 left-3">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-md text-[#0F172A] shadow-xs">
                              {card.tag}
                            </span>
                          </div>
                          <div className="absolute bottom-3 left-3 right-3 text-white">
                            <h4 className="text-[13.5px] font-bold font-sans drop-shadow-sm leading-snug">
                              {card.title}
                            </h4>
                          </div>
                        </div>
                        
                        <div className="p-3.5 flex items-center justify-between text-[12px] font-medium text-[#334155] group-hover:text-[#2563EB] transition-colors bg-[#FAFAFA]">
                          <span className="truncate">{card.subtitle}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 shrink-0 ml-1 text-[#64748B] group-hover:text-[#2563EB] transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Mobile menu drawer with actual pages */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 bg-[#F4F7FC] flex flex-col p-6 sm:hidden overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <VaakritiWordmark className="h-[17px] w-auto text-[#080D18]" />
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 text-[#080D18]"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <nav className="flex flex-col gap-3 py-6 text-sm font-medium text-[#080D18]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] px-2 pt-1">Products</div>
              <Link href="/demo" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-xl hover:bg-white text-base">
                Voice Studio Demo
              </Link>
              <Link href="/marketplace" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-xl hover:bg-white text-base">
                Agent Directory
              </Link>
              <Link href="/pricing" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-xl hover:bg-white text-base">
                Pricing & Plans
              </Link>

              <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] px-2 pt-3">Developers & Resources</div>
              <Link href="/docs" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-xl hover:bg-white text-base">
                Documentation
              </Link>
              <Link href="/blog" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-xl hover:bg-white text-base">
                Blog & Research
              </Link>

              <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] px-2 pt-3">Company</div>
              <Link href="/about" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-xl hover:bg-white text-base">
                About Vaakriti
              </Link>
              <Link href="/partners" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-xl hover:bg-white text-base">
                Partners
              </Link>
              <Link href="/contact" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-xl hover:bg-white text-base">
                Contact Us
              </Link>
            </nav>
            <div className="mt-auto pt-6 flex flex-col gap-3">
              <Link
                href="/contact"
                onClick={() => setMenuOpen(false)}
                className="w-full block text-center py-2.5 rounded-full border border-[#CBD5E1] bg-white text-[#080D18] text-sm font-semibold hover:border-[#315CFF] hover:text-[#315CFF] transition-colors shadow-xs"
              >
                Contact Us
              </Link>
              <Link
                href={user ? (role === 'admin' || role === 'super_admin' ? '/admin' : '/dashboard') : '/login'}
                onClick={() => setMenuOpen(false)}
                className="w-full block text-center py-2.5 rounded-full bg-[#080D18] text-[#F4F7FC] text-sm font-semibold hover:bg-[#18243A] transition-colors shadow-xs"
              >
                {user ? "Dashboard" : "Login"}
              </Link>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <nav className={`navbar ${scrolled ? "navbar--scrolled" : ""}`} id="main-navbar">
        <div className="navbar__inner">
          <Link
            href="/"
            className="group relative z-50 flex items-center transition-opacity duration-300 hover:opacity-80 translate-y-[1px]"
            aria-label="Vaakriti Home"
          >
            <VaakritiWordmark className="h-[17px] w-auto text-[#FAF7F2]" />
          </Link>

          <ul className="navbar__links">
            <li
              className="relative"
              onMouseEnter={openProductsMenu}
              onMouseLeave={closeProductsMenu}
            >
              <Link
                href="/marketplace"
                className="navbar__link inline-flex items-center gap-[8px]"
                aria-expanded={productsMenuOpen}
                aria-haspopup="menu"
              >
                Products
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${
                    productsMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </Link>

              <div
                className={`absolute left-1/2 top-full z-[1100] mt-[16px] w-[320px] -translate-x-1/2 rounded-[18px] border border-[#1E0A35] bg-[rgba(12,1,24,0.96)] p-[8px] shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-200 ${
                  productsMenuOpen
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-[8px] opacity-0"
                }`}
              >
                {productsLoading ? (
                  <div className="px-[14px] py-[16px] font-sans text-[14px] text-[#6B6088]">
                    Loading products...
                  </div>
                ) : products.length === 0 ? (
                  <div className="px-[14px] py-[16px] font-sans text-[14px] text-[#6B6088]">
                    No products available right now.
                  </div>
                ) : (
                  <div className="flex flex-col gap-[4px]">
                    {products.map((product) => {
                      const statusMeta = getStatusMeta(product.status);
                      const content = (
                        <>
                          <div className="flex items-center justify-between gap-[12px]">
                            <span className="font-sans text-[15px] font-semibold text-[#F5F3FF]">
                              {product.name}
                            </span>
                            <span
                              className={`inline-flex items-center gap-[6px] text-[12px] ${statusMeta.textClass}`}
                            >
                              <span
                                className={`h-[6px] w-[6px] rounded-full ${statusMeta.dotClass}`}
                              />
                              {statusMeta.label}
                            </span>
                          </div>
                          <p className="mt-[6px] font-sans text-[13px] leading-[1.5] text-[#6B6088]">
                            {product.tagline || "AI product"}
                          </p>
                        </>
                      );

                      if (!canNavigateToProduct(product.status)) {
                        return (
                          <button
                            key={product.slug}
                            type="button"
                            onClick={handleComingSoonClick}
                            className="w-full rounded-[14px] px-[14px] py-[12px] text-left transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                          >
                            {content}
                          </button>
                        );
                      }

                      return (
                        <Link
                          key={product.slug}
                          href={`/products/${product.slug}`}
                          className="rounded-[14px] px-[14px] py-[12px] transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                        >
                          {content}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </li>

            {navLinks.map((link) => (
              <li key={link.name}>
                <Link href={link.href} className="navbar__link">
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>

          <div className="navbar__actions">
            <a
              href="https://shiksha.trinetraedu-ai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative hidden lg:inline-flex items-center justify-center font-sans text-[14px] font-bold bg-[#0C0118] text-white rounded-full px-6 py-2 shadow-[0_0_25px_rgba(139,92,246,0.15)] transition-all duration-200 ease-out hover:-translate-y-[2px] hover:shadow-[0_0_40px_rgba(139,92,246,0.35)]"
            >
              <div className="absolute inset-0 rounded-full border border-[rgba(139,92,246,0.25)] transition-colors duration-200 ease-out group-hover:border-[#A78BFA]" />
              <span className="relative z-10">Trinetra Shiksha</span>
            </a>
            <Link
              href={user ? (role === 'admin' || role === 'super_admin' ? '/admin' : '/dashboard') : '/login'}
              className="navbar__btn-deploy"
            >
              {user ? 'Dashboard' : 'Login'}
            </Link>
          </div>

          <button
            className={`navbar__hamburger ${menuOpen ? "navbar__hamburger--open" : ""}`}
            onClick={toggleMenu}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span className="navbar__hamburger-line" />
            <span className="navbar__hamburger-line" />
            <span className="navbar__hamburger-line" />
          </button>
        </div>
      </nav>

      <div className={`navbar-mobile ${menuOpen ? "navbar-mobile--open" : ""}`} id="mobile-menu">
        <button className="navbar-mobile__close" onClick={toggleMenu} aria-label="Close menu">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <nav className="navbar-mobile__nav w-full max-w-[360px] px-[20px]">
          <div className="flex w-full flex-col items-center">
            <div className="flex w-full items-center justify-center gap-[10px]">
              <Link
                href="/#products"
                className="navbar-mobile__link"
                style={{ transitionDelay: "0.1s" }}
                onClick={() => setMenuOpen(false)}
              >
                Products
              </Link>
              <button
                type="button"
                onClick={() => setProductsExpanded((prev) => !prev)}
                className={`rounded-full border border-[#2D1255] p-[8px] text-[#A78BFA] transition-all duration-300 ${
                  menuOpen ? "translate-y-0 opacity-100" : "translate-y-[16px] opacity-0"
                }`}
                style={{ transitionDelay: "0.1s" }}
                aria-label={productsExpanded ? "Collapse product list" : "Expand product list"}
                aria-expanded={productsExpanded}
              >
                <ChevronDown
                  size={18}
                  className={`transition-transform duration-200 ${
                    productsExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            <div
              className={`w-full overflow-hidden transition-all duration-300 ${
                productsExpanded ? "mt-[18px] max-h-[420px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="flex flex-col gap-[10px] border-l border-[#2D1255] pl-[18px]">
                {productsLoading ? (
                  <p className="font-sans text-[14px] text-[#6B6088]">Loading products...</p>
                ) : products.length === 0 ? (
                  <p className="font-sans text-[14px] text-[#6B6088]">No products available right now.</p>
                ) : (
                  products.map((product) => {
                    const statusMeta = getStatusMeta(product.status);

                    if (!canNavigateToProduct(product.status)) {
                      return (
                        <button
                          key={product.slug}
                          type="button"
                          onClick={handleComingSoonClick}
                          className="rounded-[12px] border border-[#1E0A35] bg-[#130224] px-[14px] py-[12px] text-left"
                        >
                          <div className="flex items-center gap-[8px] font-sans text-[15px] font-medium text-[#F5F3FF]">
                            <span className={`h-[7px] w-[7px] rounded-full ${statusMeta.dotClass}`} />
                            {product.name}
                          </div>
                          <p className="mt-[6px] font-sans text-[13px] leading-[1.5] text-[#6B6088]">
                            {product.tagline || statusMeta.label}
                          </p>
                        </button>
                      );
                    }

                    return (
                      <Link
                        key={product.slug}
                        href={`/products/${product.slug}`}
                        className="rounded-[12px] border border-[#1E0A35] bg-[#130224] px-[14px] py-[12px] text-left"
                        onClick={() => setMenuOpen(false)}
                      >
                        <div className="flex items-center gap-[8px] font-sans text-[15px] font-medium text-[#F5F3FF]">
                          <span className={`h-[7px] w-[7px] rounded-full ${statusMeta.dotClass}`} />
                          {product.name}
                        </div>
                        <p className="mt-[6px] font-sans text-[13px] leading-[1.5] text-[#6B6088]">
                          {product.tagline || statusMeta.label}
                        </p>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {navLinks.map((link, i) => (
            <Link
              key={link.name}
              href={link.href}
              className="navbar-mobile__link"
              style={{ transitionDelay: `${0.2 + i * 0.1}s` }}
              onClick={() => setMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}

          <a
            href="https://shiksha.trinetraedu-ai.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center justify-center font-sans text-[16px] font-bold w-[calc(100%-40px)] text-center my-[10px] bg-[#0C0118] text-white rounded-full px-6 py-2 shadow-[0_0_25px_rgba(139,92,246,0.15)] transition-all duration-200 ease-out hover:-translate-y-[2px] hover:shadow-[0_0_40px_rgba(139,92,246,0.35)]"
            onClick={() => setMenuOpen(false)}
          >
            <div className="absolute inset-0 rounded-full border border-[rgba(139,92,246,0.25)] transition-colors duration-200 ease-out group-hover:border-[#A78BFA]" />
            <span className="relative z-10">Trinetra Shiksha</span>
          </a>

          <Link
            href={user ? (role === 'admin' || role === 'super_admin' ? '/admin' : '/dashboard') : '/login'}
            className="navbar-mobile__deploy"
            style={{ transitionDelay: `${0.3 + navLinks.length * 0.1}s` }}
            onClick={() => setMenuOpen(false)}
          >
            {user ? 'Dashboard' : 'Login'}
          </Link>
        </nav>
      </div>
    </>
  );
}
