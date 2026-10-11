"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, GraduationCap, Globe } from "lucide-react";
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
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            scrolled
              ? "bg-white/85 backdrop-blur-md shadow-xs border-b border-slate-100/70"
              : "bg-transparent border-0 border-none shadow-none"
          }`}
        >
          {/* ── 1. TOP ANNOUNCEMENT TAB (WHITE EMERGING & MIXING WITH GREEN, DISAPPEARS ON SCROLL) ── */}
          <div
            className={`w-full transition-all duration-300 ${
              scrolled
                ? "max-h-0 opacity-0 overflow-hidden py-0 border-0 pointer-events-none"
                : "max-h-16 opacity-100 py-1.5 px-3 border-0 shadow-none"
            }`}
            style={
              !scrolled
                ? {
                    background:
                      "linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0.95) 30%, rgba(236, 253, 245, 0.70) 70%, rgba(167, 243, 208, 0.35) 100%)",
                  }
                : undefined
            }
          >
            <div className="max-w-[1536px] mx-auto flex items-center justify-center gap-1.5 sm:gap-2.5 text-[11px] sm:text-[12px] font-sans text-slate-800">
              <span className="text-emerald-700 text-[10px] hidden sm:inline select-none">✦ ✦ ✦</span>
              <span className="px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider bg-emerald-700/15 text-emerald-900 border border-emerald-700/20">
                {announcement.tag || "Platform"}
              </span>
              <span className="text-slate-800 font-medium truncate max-w-[280px] sm:max-w-none">
                {announcement.text || "How Autonomous Voice Agents handle complex Indian calls"}
              </span>
              {announcement.action_url ? (
                <Link
                  href={announcement.action_url}
                  className="font-semibold text-emerald-900 hover:text-black underline underline-offset-4 decoration-emerald-800/40 hover:decoration-black transition-colors cursor-pointer ml-1"
                >
                  {announcement.action_text || "Experience Live →"}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleAnnouncementClick}
                  className="font-semibold text-emerald-900 hover:text-black underline underline-offset-4 decoration-emerald-800/40 hover:decoration-black transition-colors cursor-pointer ml-1"
                >
                  {announcement.action_text || "Experience Live →"}
                </button>
              )}
              <span className="text-emerald-700 text-[10px] hidden sm:inline select-none">✦ ✦ ✦</span>
            </div>
          </div>

          {/* ── 2. MAIN NAVIGATION BAR ── */}
          <div className="w-full max-w-[1536px] h-[54px] sm:h-[62px] mx-auto px-6 sm:px-10 lg:px-14 flex items-center justify-between">
            {/* Brand Logo on Left */}
            <div className="flex items-center gap-3">
              <Link href="/" className="group select-none flex items-center py-2" aria-label="Vaakriti Home">
                <VaakritiWordmark className="h-[15px] sm:h-[16.5px] md:h-[18px] w-auto text-[#0B0F17] group-hover:text-emerald-700 transition-colors duration-200" />
              </Link>
            </div>

            {/* Clean Navigation Links in Center: Products, Developers, Resources, Company */}
            <nav className="hidden md:flex items-center gap-8 lg:gap-10">
              <Link
                href="/#products"
                className="text-[13.5px] font-medium text-slate-800 hover:text-emerald-700 transition-colors"
              >
                Products
              </Link>
              <Link
                href="/#developers"
                className="text-[13.5px] font-medium text-slate-800 hover:text-emerald-700 transition-colors"
              >
                Developers
              </Link>
              <Link
                href="/#resources"
                className="text-[13.5px] font-medium text-slate-800 hover:text-emerald-700 transition-colors"
              >
                Resources
              </Link>
              <Link
                href="/#company"
                className="text-[13.5px] font-medium text-slate-800 hover:text-emerald-700 transition-colors"
              >
                Company
              </Link>
            </nav>

            {/* Right Action Buttons: Go to Dashboard, Contact Us */}
            <div className="hidden sm:flex items-center gap-3">
              <Link
                href={user ? (role === 'admin' || role === 'super_admin' ? '/admin' : '/dashboard') : '/login'}
                className="inline-flex items-center justify-center px-5 py-2 text-[13px] font-semibold bg-[#111827] text-white hover:bg-black rounded-full shadow-xs transition-all duration-200 cursor-pointer"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-4.5 py-2 text-[13px] font-medium text-[#111827] bg-white/90 hover:bg-white border border-slate-200/90 hover:border-slate-300 rounded-full shadow-2xs transition-all duration-200 cursor-pointer"
              >
                Contact Us
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={toggleMenu}
              className="sm:hidden p-2 text-slate-800 hover:text-emerald-700"
              aria-label="Toggle Navigation Menu"
            >
              <span className="block w-5 h-0.5 bg-current mb-1" />
              <span className="block w-5 h-0.5 bg-current mb-1" />
              <span className="block w-5 h-0.5 bg-current" />
            </button>
          </div>
        </header>

        {/* Mobile menu drawer for landing */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 bg-[#FAF7F2] flex flex-col p-6 sm:hidden">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8DFC8]">
              <VaakritiWordmark className="h-[17px] w-auto text-[#171513]" />
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 text-[#42372E]"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <nav className="flex flex-col gap-4 py-6 text-lg font-medium text-[#332A23]">
              <Link href="/#platform" onClick={() => setMenuOpen(false)}>
                Platform
              </Link>
              <Link href="/#solutions" onClick={() => setMenuOpen(false)}>
                Solutions
              </Link>
              <Link href="/#industries" onClick={() => setMenuOpen(false)}>
                Industries
              </Link>
              <Link href="/#resources" onClick={() => setMenuOpen(false)}>
                Resources
              </Link>
              <Link href="/pricing" onClick={() => setMenuOpen(false)}>
                Pricing
              </Link>
            </nav>
            <div className="mt-auto pt-6 flex flex-col gap-3">
              <Link
                href="/contact"
                onClick={() => setMenuOpen(false)}
                className="w-full block text-center py-2.5 rounded-full border border-[#DFCDBB] bg-white text-[#171513] text-sm font-semibold hover:border-[#171513] transition-colors shadow-sm"
              >
                Contact Us
              </Link>
              <Link
                href={user ? (role === 'admin' || role === 'super_admin' ? '/admin' : '/dashboard') : '/login'}
                onClick={() => setMenuOpen(false)}
                className="w-full block text-center py-2.5 rounded-full bg-[#171513] text-[#FAF7F2] text-sm font-semibold hover:bg-[#332A23] transition-colors shadow-sm"
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
                href="/#products"
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
