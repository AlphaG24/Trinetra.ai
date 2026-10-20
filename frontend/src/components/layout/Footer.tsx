"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Instagram, Linkedin, Twitter } from "lucide-react";
import { toast } from "sonner";

import { FacebookIcon } from "@/components/ui/FacebookIcon";
import { RedditIcon } from "@/components/ui/RedditIcon";
import { VaakritiWordmark } from "@/components/ui/VaakritiWordmark";
import {
  getConfigString,
  useSiteConfig,
} from "@/lib/site-content";

const platformLinks = [
  { name: "Pricing", href: "/pricing" },
  { name: "Marketplace", href: "/marketplace" },
  { name: "Partners", href: "/partners" },
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
    "flex h-9 w-9 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 transition-all duration-300 hover:border-blue-500 hover:text-blue-600 hover:shadow-xs";

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

  if (pathname?.startsWith("/dashboard")) {
    return null;
  }

  const linkedinUrl = getConfigString(siteConfig, "social_linkedin");
  const instagramUrl = getConfigString(siteConfig, "social_instagram");
  const twitterUrl = getConfigString(siteConfig, "social_twitter");
  const facebookUrl = getConfigString(siteConfig, "social_facebook");
  const redditUrl = getConfigString(siteConfig, "social_reddit");

  if (pathname === "/login") {
    return (
      <footer className="w-full border-t border-slate-200 bg-[#FAFAFA] px-5 py-5 text-center">
        <p className="m-0 font-mono text-[12px] text-slate-500">
          &copy; 2026 Vaakriti AI |{" "}
          <Link href="/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
          </Link>{" "}
          |{" "}
          <Link href="/terms" className="text-blue-600 hover:underline">
            Terms
          </Link>
        </p>
      </footer>
    );
  }

  return (
    <footer className="w-full overflow-hidden flex flex-col bg-[#FAFAFA] border-t border-slate-200/90 text-slate-700 font-sans">

      {/* Main Footer Container */}
      <div className="w-full px-6 sm:px-10 lg:px-16 pt-12 sm:pt-14 pb-8 sm:pb-10">
        <div className="mx-auto max-w-[1440px]">

          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">

            {/* Col 1 & 2: Brand Text Logo, Tagline & Social Icons */}
            <div className="flex flex-col items-start lg:col-span-2 space-y-4">
              <Link
                href="/"
                className="group flex items-center transition-opacity duration-300 hover:opacity-85"
                aria-label="Vaakriti Home"
              >
                <VaakritiWordmark className="h-4 sm:h-6 w-auto text-slate-900" />
              </Link>

              <p className="text-xs sm:text-[13px] text-slate-500 max-w-sm leading-relaxed">
                Autonomous voice intelligence platform for enterprises. Delivering sub-500ms conversational AI pipelines with zero hallucinations.
              </p>

              <div className="flex items-center gap-2.5 pt-1">
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

            {/* Col 3: Platform (Pricing, Marketplace, Partners CTA) */}
            <div className="flex flex-col">
              <h4 className="mb-4 font-mono text-xs font-bold uppercase tracking-wider text-slate-900">
                Platform
              </h4>
              <ul className="flex flex-col gap-3">
                {platformLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="inline-flex items-center font-sans text-xs sm:text-[13px] text-slate-600 hover:text-blue-600 font-medium transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4: Company */}
            <div className="flex flex-col">
              <h4 className="mb-4 font-mono text-xs font-bold uppercase tracking-wider text-slate-900">
                Company
              </h4>
              <ul className="flex flex-col gap-3">
                {companyLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="font-sans text-xs sm:text-[13px] text-slate-600 hover:text-blue-600 font-medium transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 5: Legal & Compliance */}
            <div className="flex flex-col">
              <h4 className="mb-4 font-mono text-xs font-bold uppercase tracking-wider text-slate-900">
                Legal &amp; Compliance
              </h4>
              <ul className="flex flex-col gap-3">
                {legalLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="font-sans text-xs sm:text-[13px] text-slate-600 hover:text-blue-600 font-medium transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Bottom Bar: Copyright & Operational Status */}
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 md:flex-row text-xs font-mono text-slate-500">
            <p>
              &copy; 2026 Vaakriti AI. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-600 font-medium">All Telephony Systems Operational</span>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}

export default Footer;