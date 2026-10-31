"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ArrowUpRight, Mic, Bot, CreditCard, MessageSquare } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import {
  getConfigString,
  useSiteConfig,
  useVisibleProducts,
} from "@/lib/site-content";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { VaakritiWordmark } from "@/components/ui/VaakritiWordmark";

type ProductStatus = "live" | "beta" | "coming_soon";

interface ProductNavItem {
  slug: string;
  name: string;
  tagline: string;
  status: ProductStatus;
}

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
        dotClass: "bg-emerald-500",
        textClass: "text-emerald-600",
        bgClass: "bg-emerald-50 border-emerald-200/60",
      };
    case "beta":
      return {
        label: "Beta",
        dotClass: "bg-amber-500",
        textClass: "text-amber-600",
        bgClass: "bg-amber-50 border-amber-200/60",
      };
    default:
      return {
        label: "Coming Soon",
        dotClass: "bg-slate-400",
        textClass: "text-slate-500",
        bgClass: "bg-slate-100 border-slate-200",
      };
  }
}

export function Navbar() {
  const { user, role } = useAuth();
  const { data: siteConfig } = useSiteConfig();
  const { data: productsData, loading: productsLoading, error: productsError } = useVisibleProducts();
  const [menuOpen, setMenuOpen] = useState(false);
  const [productsDropdownOpen, setProductsDropdownOpen] = useState(false);
  const [mobileProductsExpanded, setMobileProductsExpanded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [latestBlog, setLatestBlog] = useState<{
    title: string;
    image: string;
    slug: string;
  } | null>(null);
  const [announcement, setAnnouncement] = useState({
    enabled: false,
    tag: "PLATFORM",
    text: "How Autonomous Voice Agents handle complex Indian calls",
    action_text: "Experience Live",
    action_url: "",
  });

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnterProducts = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setProductsDropdownOpen(true);
  };

  const handleMouseLeaveProducts = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setProductsDropdownOpen(false);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
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

    // Dynamically fetch latest published blog post image and title for the popup modal
    fetch("/api/blog?limit=1")
      .then((res) => res.json())
      .then((data) => {
        if (data?.posts && data.posts.length > 0) {
          const post = data.posts[0];
          setLatestBlog({
            title: post.title,
            image: post.cover_image_url || "/images/vaakriti_blog.jpg",
            slug: post.slug,
          });
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
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const toggleMenu = useCallback(() => setMenuOpen((prev) => !prev), []);

  const handleComingSoonClick = () => {
    toast("Coming Soon! We're working on it.");
    setMenuOpen(false);
    setProductsDropdownOpen(false);
  };

  const pathname = usePathname();
  const isLanding = pathname === "/";

  // Visual cards inside popup modal: About Us & Blogs (with live blog image)
  const dropdownCards = [
    {
      image: "/images/vaakriti_arch.jpg",
      tag: "About Us",
      title: "Vision Beyond the Surface",
      subtitle: "Learn about Vaakriti & our voice journey",
      href: "/about",
    },
    {
      image: latestBlog?.image || "/images/vaakriti_blog.jpg",
      tag: latestBlog ? "Latest Post" : "Blogs & Research",
      title: latestBlog?.title || "Scaling Multilingual Voice AI",
      subtitle: "Read latest engineering insights",
      href: latestBlog?.slug ? `/blog/${latestBlog.slug}` : "/blog",
    },
  ];

  const dashboardHref = user
    ? role === "admin" || role === "super_admin"
      ? "/admin"
      : "/dashboard"
    : "/login";

  return (
    <>
      <header
        onMouseLeave={handleMouseLeaveProducts}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || productsDropdownOpen || !isLanding
            ? "backdrop-blur-md shadow-xs border-b bg-white/95 border-[#E2E8F0]"
            : "bg-transparent border-0 border-none shadow-none"
        }`}
      >
        {/* ── 1. TOP ANNOUNCEMENT TAB (on landing or when active) ── */}
        {isLanding && (
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
              <span className="px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider border font-sans bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/25">
                {announcement.tag || "Platform"}
              </span>
              <span className="font-medium truncate max-w-[280px] sm:max-w-none font-sans text-[#334155]">
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
        )}

        {/* ── 2. MAIN NAVIGATION BAR (Hover opens popup modal, strictly NO buttons except Go to Dashboard) ── */}
        <div 
          onMouseEnter={handleMouseEnterProducts}
          className="w-full max-w-[1536px] h-[54px] sm:h-[62px] mx-auto px-6 sm:px-10 lg:px-14 flex items-center justify-between"
        >
          {/* Brand Logo on Left (Clean Vaakriti Wordmark) */}
          <div className="flex items-center gap-3">
            <Link href="/" className="group select-none flex items-center py-1.5" aria-label="Vaakriti Home">
              <div className="flex flex-col items-start text-[#0F172A] hover:text-[#2563EB] transition-colors">
                <VaakritiWordmark className="h-[15px] sm:h-[16.5px] md:h-[18px] w-auto transition-colors duration-200" />
              </div>
            </Link>
          </div>

          {/* Right Action Button: Dashboard ONLY (Strictly no other buttons in topbar) */}
          <div className="flex items-center gap-3">
            <Link
              href={dashboardHref}
              className="inline-flex items-center justify-center px-5 py-2 text-[13px] font-semibold rounded-full shadow-xs transition-all duration-200 cursor-pointer font-sans bg-[#0F172A] text-white hover:bg-[#1E293B]"
            >
              {user ? "Dashboard" : "Go to Dashboard"}
            </Link>

            {/* Mobile Hamburger (Only visible on small phones) */}
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
        </div>

        {/* ── 3. PRODUCTS MEGAMENU POPOVER (3 Headings on left + About Us & Blogs on right) ── */}
        <AnimatePresence>
          {productsDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              onMouseEnter={handleMouseEnterProducts}
              onMouseLeave={handleMouseLeaveProducts}
              className="w-full bg-white/98 backdrop-blur-2xl border-t border-b border-[#E2E8F0] shadow-[0_24px_60px_rgba(15,23,42,0.08)] py-7 z-40 select-none"
            >
              <div className="max-w-[1340px] mx-auto px-6 sm:px-10 lg:px-14 grid grid-cols-12 gap-8 items-stretch">
                {/* Left Column: 3 Core Headings (Products, Pricing, Contact Us) */}
                <div className="col-span-12 lg:col-span-6 flex flex-col justify-center space-y-4 border-r-0 lg:border-r border-[#E2E8F0] pr-0 lg:pr-8">
                  {/* Heading 1: Available Products */}
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2 font-sans flex items-center justify-between">
                      <span>Products</span>
                      <span className="text-[10px] text-[#2563EB] font-semibold">Live Systems</span>
                    </div>

                    {productsLoading ? (
                      <div className="py-3 text-sm text-[#64748B] font-sans">Loading products...</div>
                    ) : products.length === 0 ? (
                      <div className="py-3 text-sm text-[#64748B] font-sans">No products available right now.</div>
                    ) : (
                      <div className="space-y-1.5">
                        {products.map((product) => {
                          const statusMeta = getStatusMeta(product.status);
                          const isNavigable = canNavigateToProduct(product.status);

                          const innerContent = (
                            <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#F8FAFC] border border-transparent hover:border-[#E2E8F0] transition-all duration-200 w-full text-left">
                              <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] group-hover:bg-[#2563EB]/10 border border-[#E2E8F0] group-hover:border-[#2563EB]/25 flex items-center justify-center text-[#475569] group-hover:text-[#2563EB] transition-colors shrink-0 mt-0.5">
                                {product.slug.includes("voice") ? <Mic className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[13.5px] font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors font-sans">
                                    {product.name}
                                  </span>
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.bgClass} ${statusMeta.textClass}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                                    {statusMeta.label}
                                  </span>
                                </div>
                                <p className="text-[11.5px] text-[#64748B] font-sans leading-relaxed truncate mt-0.5">
                                  {product.tagline}
                                </p>
                              </div>
                            </div>
                          );

                          if (!isNavigable) {
                            return (
                              <button
                                key={product.slug}
                                type="button"
                                onClick={handleComingSoonClick}
                                className="group block w-full text-left cursor-pointer"
                              >
                                {innerContent}
                              </button>
                            );
                          }

                          return (
                            <Link
                              key={product.slug}
                              href={product.slug === "voice-agent" ? "/demo" : `/products/${product.slug}`}
                              onClick={() => setProductsDropdownOpen(false)}
                              className="group block w-full cursor-pointer"
                            >
                              {innerContent}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="h-px w-full bg-[#E2E8F0]/80 my-1" />

                  {/* Headings 2 & 3: Pricing & Contact Us */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Heading 2: Pricing */}
                    <Link
                      href="/pricing"
                      onClick={() => setProductsDropdownOpen(false)}
                      className="group flex items-start gap-3 p-3 rounded-xl hover:bg-[#F8FAFC] border border-[#E2E8F0]/70 hover:border-[#2563EB]/30 transition-all duration-200"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#2563EB] shrink-0 mt-0.5">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[13.5px] font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors font-sans">
                            Pricing
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#2563EB] transition-colors" />
                        </div>
                        <p className="text-[11px] text-[#64748B] font-sans leading-relaxed mt-0.5">
                          Transparent tiers & enterprise plans
                        </p>
                      </div>
                    </Link>

                    {/* Heading 3: Contact Us */}
                    <Link
                      href="/contact"
                      onClick={() => setProductsDropdownOpen(false)}
                      className="group flex items-start gap-3 p-3 rounded-xl hover:bg-[#F8FAFC] border border-[#E2E8F0]/70 hover:border-[#2563EB]/30 transition-all duration-200"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[13.5px] font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors font-sans">
                            Contact Us
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#2563EB] transition-colors" />
                        </div>
                        <p className="text-[11px] text-[#64748B] font-sans leading-relaxed mt-0.5">
                          Talk to voice architecture specialists
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Right Column: Visual Announcement Cards: About Us & Blogs (with latest blog dynamic image) */}
                <div className="col-span-12 lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  {dropdownCards.map((card) => (
                    <Link
                      key={card.title}
                      href={card.href}
                      onClick={() => setProductsDropdownOpen(false)}
                      className="group block relative rounded-2xl overflow-hidden border border-[#E2E8F0] bg-white hover:border-[#2563EB]/40 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="relative w-full h-[140px] sm:h-[155px] overflow-hidden bg-slate-100">
                        <Image
                          src={card.image}
                          alt={card.title}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 100vw, 360px"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-md text-[#0F172A] shadow-xs">
                            {card.tag}
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <h4 className="text-[13.5px] font-bold font-sans drop-shadow-sm leading-snug line-clamp-2">
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

      {/* ── 4. MOBILE MENU DRAWER ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col p-6 sm:hidden overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
            <VaakritiWordmark className="h-[17px] w-auto text-[#0F172A]" />
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 text-[#0F172A] text-lg font-bold"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <nav className="flex flex-col gap-3 py-6 text-sm font-medium text-[#0F172A]">
            {/* Products Accordion */}
            <div>
              <button
                type="button"
                onClick={() => setMobileProductsExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white text-base font-semibold text-[#0F172A]"
              >
                <span>Products</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#64748B] transition-transform ${
                    mobileProductsExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {mobileProductsExpanded && (
                <div className="mt-1 pl-4 flex flex-col gap-2 border-l-2 border-[#E2E8F0] ml-3">
                  {products.map((p) => (
                    <div key={p.slug} className="py-1">
                      {canNavigateToProduct(p.status) ? (
                        <Link
                          href={p.slug === "voice-agent" ? "/demo" : `/products/${p.slug}`}
                          onClick={() => setMenuOpen(false)}
                          className="block text-sm font-medium text-[#2563EB]"
                        >
                          {p.name}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={handleComingSoonClick}
                          className="text-sm text-[#64748B] text-left"
                        >
                          {p.name} (Coming Soon)
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/pricing"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-white text-base font-semibold text-[#0F172A]"
            >
              Pricing
            </Link>

            <Link
              href="/about"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-white text-base font-semibold text-[#0F172A]"
            >
              About Us
            </Link>

            <Link
              href="/blog"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-white text-base font-semibold text-[#0F172A]"
            >
              Blogs & Research
            </Link>

            <Link
              href="/contact"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-white text-base font-semibold text-[#0F172A]"
            >
              Contact Us
            </Link>
          </nav>

          <div className="mt-auto pt-6 flex flex-col gap-3">
            <Link
              href={dashboardHref}
              onClick={() => setMenuOpen(false)}
              className="w-full block text-center py-3 rounded-full bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#1E293B] transition-colors shadow-xs"
            >
              {user ? "Dashboard" : "Go to Dashboard"}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
