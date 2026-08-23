"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, GraduationCap } from "lucide-react";
import { toast } from "sonner";

import {
  getConfigString,
  useSiteConfig,
  useVisibleProducts,
} from "@/lib/site-content";

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
  const { data: siteConfig } = useSiteConfig();
  const { data: productsData, loading: productsLoading, error: productsError } = useVisibleProducts();
  const [menuOpen, setMenuOpen] = useState(false);
  const [productsExpanded, setProductsExpanded] = useState(false);
  const [productsMenuOpen, setProductsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const companyName = getConfigString(siteConfig, "company_name", "Trinetra");
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

  return (
    <>
      <nav className={`navbar ${scrolled ? "navbar--scrolled" : ""}`} id="main-navbar">
        <div className="navbar__inner">
          <Link
            href="/"
            className="group relative z-50 flex items-center gap-2 transition-opacity duration-300 hover:opacity-80"
          >
            <Image
              src="/logo-transparent.png"
              alt={companyName}
              width={320}
              height={90}
              className="h-14 w-auto object-contain"
              priority
            />
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
            <Link href="/login" className="navbar__btn-deploy">
              Login
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
            href="/login"
            className="navbar-mobile__deploy"
            style={{ transitionDelay: `${0.3 + navLinks.length * 0.1}s` }}
            onClick={() => setMenuOpen(false)}
          >
            Login
          </Link>
        </nav>
      </div>
    </>
  );
}
