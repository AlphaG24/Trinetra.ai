"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Instagram, Linkedin, Twitter, Mail, Globe, MapPin, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

import { FacebookIcon } from "@/components/ui/FacebookIcon";
import { RedditIcon } from "@/components/ui/RedditIcon";
import {
  getConfigString,
  useSiteConfig,
  useVisibleProducts,
} from "@/lib/site-content";

const fallbackProductLinks = [
  { name: "AI Voice Agent", href: "/products/voice-agent", isComingSoon: false },
];

const companyLinks = [
  { name: "About Us", href: "/about" },
  { name: "Blog", href: "/blog" },
  { name: "Contact", href: "/contact" },
  { name: "Grievance", href: "/grievance" },
];

const legalLinks = [
  { name: "Privacy Policy", href: "/privacy" },
  { name: "Terms of Service", href: "/terms" },
  { name: "Cookie Policy", href: "/cookies" },
  { name: "Refund Policy", href: "/refund" },
];

function FooterIconButton({
  href,
  label,
  children,
  muted = false,
}: {
  href: string;
  label: string;
  children: ReactNode;
  muted?: boolean;
}) {
  const baseClass =
    "flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-slate-400 transition-colors duration-300 hover:border-lime-500 hover:text-[#84CC16]";

  if (!href) {
    return (
      <button
        type="button"
        aria-label={label}
        title="Coming Soon"
        onClick={() => toast("Coming Soon! We're working on it.")}
        className={`${baseClass} ${muted ? "opacity-50" : ""}`}
        suppressHydrationWarning={true}
      >
        {children}
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className={`${baseClass} ${muted ? "opacity-50" : ""}`}
    >
      {children}
    </a>
  );
}

export function Footer() {
  const pathname = usePathname();
  const { data: siteConfig } = useSiteConfig();
  const { data: products, error: productsError } = useVisibleProducts();

  if (pathname?.startsWith("/dashboard")) {
    return null;
  }

  const companyName = "Trinetra";
  const linkedinUrl = getConfigString(siteConfig, "social_linkedin");
  const instagramUrl = getConfigString(siteConfig, "social_instagram");
  const twitterUrl = getConfigString(siteConfig, "social_twitter");
  const facebookUrl = getConfigString(siteConfig, "social_facebook");
  const redditUrl = getConfigString(siteConfig, "social_reddit");

  const productLinks = (
    products.length > 0
      ? products.map((product) => ({
          name: product.name,
          href: `/products/${product.slug}`,
          isComingSoon: product.status === "coming_soon",
        }))
      : productsError
        ? fallbackProductLinks
        : []
  ).filter(link => {
    const nameLower = link.name.toLowerCase();
    return !nameLower.includes("chat") && !nameLower.includes("social") && !nameLower.includes("workflow");
  });

  if (pathname === "/login") {
    return (
      <footer className="w-full border-t border-slate-800 bg-[#0C0E14] px-5 py-5 text-center">
        <p className="m-0 font-mono text-[12px] text-slate-500">
          &copy; 2026 {companyName} |{" "}
          <Link href="/privacy" className="text-[#84CC16] hover:underline">
            Privacy Policy
          </Link>{" "}
          |{" "}
          <Link href="/terms" className="text-[#84CC16] hover:underline">
            Terms
          </Link>
        </p>
      </footer>
    );
  }

  return (
    <footer className="w-full overflow-hidden flex flex-col">
      
      {/* ── 1. "LET'S WORK TOGETHER" CTA SECTION (Exact Reference Image Style) ── */}
      <div className="w-full bg-[#F4F5F7] border-t border-slate-200/90 py-20 px-6 sm:px-10 lg:px-16 relative">
        <div className="max-w-[1536px] mx-auto">
          
          {/* Section Sub-header */}
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2.5 h-2.5 rounded-[1px] bg-[#84CC16]" />
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase font-bold text-slate-500">
              LET&apos;S WORK TOGETHER
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end justify-between">
            
            {/* Left Headline & Action */}
            <div className="lg:col-span-7">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-[#0B0F17] tracking-tight leading-[0.98]">
                HAVE A PROJECT
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#65A30D] via-[#84CC16] to-[#A3E635] drop-shadow-[0_0_30px_rgba(132,204,22,0.35)]">
                  IN MIND?
                </span>
              </h2>

              <p className="mt-6 max-w-md text-xs sm:text-[13px] font-mono text-slate-600 leading-relaxed uppercase">
                We are always open to discussing new voice pipelines, enterprise deployments, or regional partner integration.
              </p>

              <div className="mt-8">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-slate-300 text-[#0B0F17] font-mono font-bold text-xs uppercase tracking-wider hover:border-[#84CC16] hover:text-[#84CC16] hover:shadow-[0_0_20px_rgba(132,204,22,0.25)] transition-all"
                >
                  <ArrowUpRight className="w-4 h-4 text-[#84CC16]" />
                  <span>GET IN TOUCH</span>
                </Link>
              </div>
            </div>

            {/* Right Contact Cards (Matching Reference Image) */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-[#84CC16]">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[9px] font-mono uppercase text-slate-400 tracking-wider">EMAIL</div>
                  <a href="mailto:contact@trinetraedu-ai.com" className="text-xs font-mono font-bold text-[#0B0F17] hover:text-[#84CC16]">
                    contact@trinetraedu-ai.com
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-[#84CC16]">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[9px] font-mono uppercase text-slate-400 tracking-wider">WEBSITE</div>
                  <span className="text-xs font-mono font-bold text-[#0B0F17]">
                    trinetraedu-ai.com
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-[#84CC16]">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[9px] font-mono uppercase text-slate-400 tracking-wider">LOCATION</div>
                  <span className="text-xs font-mono font-bold text-[#0B0F17]">
                    Bharat • Global Scale
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* Wireframe Hemisphere Graphic with Lime Glow */}
          <div className="relative w-full h-16 mt-12 overflow-hidden flex items-end justify-center pointer-events-none opacity-40">
            <div className="w-[500px] h-[500px] rounded-full border border-dashed border-[#84CC16]/60 shadow-[0_-15px_40px_rgba(132,204,22,0.3)]" />
          </div>

        </div>
      </div>

      {/* ── 2. SLEEK OBSIDIAN TECHNICAL FOOTER LINKS ── */}
      <div className="w-full bg-[#0C0E14] border-t border-slate-800 text-slate-300 px-6 sm:px-10 lg:px-16 pt-16 pb-10">
        
        {/* Subtle Lime Accent Line */}
        <div className="mx-auto mb-12 h-[1px] w-full max-w-4xl bg-gradient-to-r from-transparent via-[#84CC16]/50 to-transparent" />

        <div className="mx-auto max-w-[1536px]">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
            
            <div className="flex flex-col items-start lg:col-span-2">
              <Link href="/" className="group flex items-center transition-opacity duration-300 hover:opacity-80">
                <Image
                  src="/vaakriti-horizontal-white.svg"
                  alt="Trinetra Logo"
                  width={150}
                  height={36}
                  className="inline-block h-8 w-auto object-contain"
                />
              </Link>

              <p className="mt-4 max-w-sm font-sans text-xs text-slate-400 leading-relaxed">
                Autonomous voice intelligence and self-healing business pipelines for India and the world.
              </p>

              <div className="mt-6 flex items-center gap-3">
                {linkedinUrl ? (
                  <FooterIconButton href={linkedinUrl} label="LinkedIn">
                    <Linkedin size={16} />
                  </FooterIconButton>
                ) : null}
                <FooterIconButton href={instagramUrl} label="Instagram" muted={!instagramUrl}>
                  <Instagram size={16} />
                </FooterIconButton>
                <FooterIconButton href={twitterUrl} label="Twitter" muted={!twitterUrl}>
                  <Twitter size={16} />
                </FooterIconButton>
                <FooterIconButton href={facebookUrl} label="Facebook" muted={!facebookUrl}>
                  <FacebookIcon size={16} />
                </FooterIconButton>
                <FooterIconButton href={redditUrl} label="Reddit" muted={!redditUrl}>
                  <RedditIcon size={16} />
                </FooterIconButton>
              </div>
            </div>

            {productLinks.length > 0 ? (
              <div className="flex flex-col">
                <h4 className="mb-4 font-mono text-xs font-bold uppercase tracking-wider text-white">
                  Products
                </h4>
                <ul className="flex flex-col gap-2.5">
                  {productLinks.map((link) => (
                    <li key={link.name}>
                      {link.isComingSoon ? (
                        <button
                          type="button"
                          onClick={() => toast("Coming Soon! We're working on it.")}
                          className="font-sans text-xs text-slate-400 hover:text-[#84CC16] transition-colors"
                        >
                          {link.name}
                        </button>
                      ) : (
                        <Link
                          href={link.href}
                          className="font-sans text-xs text-slate-400 hover:text-[#84CC16] transition-colors"
                        >
                          {link.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-col">
              <h4 className="mb-4 font-mono text-xs font-bold uppercase tracking-wider text-white">
                Company
              </h4>
              <ul className="flex flex-col gap-2.5">
                {companyLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="font-sans text-xs text-slate-400 hover:text-[#84CC16] transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col">
              <h4 className="mb-4 font-mono text-xs font-bold uppercase tracking-wider text-white">
                Legal &amp; Compliance
              </h4>
              <ul className="flex flex-col gap-2.5">
                {legalLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="font-sans text-xs text-slate-400 hover:text-[#84CC16] transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800/80 pt-6 md:flex-row text-[11px] font-mono text-slate-500">
            <p>
              &copy; 2026 {companyName} AI. All rights reserved.
            </p>
            <p className="flex items-center gap-1.5">
              <span>DESIGNED TO INSPIRE</span>
              <span className="text-[#84CC16]">///</span>
            </p>
          </div>
        </div>
      </div>

    </footer>
  );
}