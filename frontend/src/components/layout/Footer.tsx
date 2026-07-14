"use client";

import type { ReactNode } from "react";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Instagram, Linkedin, Twitter } from "lucide-react";
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
    "flex h-[36px] w-[36px] items-center justify-center rounded-full bg-transparent text-[#6B6088] transition-colors duration-300 hover:bg-[rgba(139,92,246,0.1)] hover:text-[#FAF7FF]";

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

  const companyName = getConfigString(siteConfig, "company_name", "Trinetra AI");
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
      <footer className="w-full border-t border-[#1E0A35] bg-[#0C0118] px-[20px] py-[20px] text-center">
        <p className="m-0 font-sans text-[13px] font-normal text-[#6B6088]">
          &copy; 2025 {companyName} |{" "}
          <Link href="/privacy" className="text-[#D7C4F7] transition-colors hover:text-[#FAF7FF]">
            Privacy Policy
          </Link>{" "}
          |{" "}
          <Link href="/terms" className="text-[#D7C4F7] transition-colors hover:text-[#FAF7FF]">
            Terms
          </Link>
        </p>
      </footer>
    );
  }

  return (
    <footer className="w-full border-t border-[#1E0A35] bg-[#0C0118] px-[20px] pb-[24px] pt-[40px] md:px-[80px] md:pb-[32px] md:pt-[64px]">
      <div className="mx-auto mb-[64px] h-[1px] w-1/2 bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent" />

      <div className="mx-auto max-w-[1280px]">
        <div className="grid grid-cols-1 gap-[40px] md:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col items-start lg:col-span-2">
            <Link href="/" className="group flex items-center transition-opacity duration-300 hover:opacity-80">
              <Image
                src="/trident.png"
                alt={`${companyName} Logo`}
                width={70}
                height={64}
                className="inline-block h-[64px] w-auto object-contain"
                style={{ width: "auto", filter: "drop-shadow(0 0 12px rgba(139,92,246,0.5))" }}
              />
            </Link>

            <p className="mt-[16px] max-w-[250px] font-sans text-[14px] font-normal leading-relaxed text-[#6B6088]">
              The Divine Vision. See Beyond. Automate Beyond.
            </p>

            <div className="mt-[24px] flex items-center gap-[16px]">
              {linkedinUrl ? (
                <FooterIconButton href={linkedinUrl} label="LinkedIn">
                  <Linkedin size={18} />
                </FooterIconButton>
              ) : null}
              <FooterIconButton href={instagramUrl} label="Instagram" muted={!instagramUrl}>
                <Instagram size={18} />
              </FooterIconButton>
              <FooterIconButton href={twitterUrl} label="Twitter" muted={!twitterUrl}>
                <Twitter size={18} />
              </FooterIconButton>
              <FooterIconButton href={facebookUrl} label="Facebook" muted={!facebookUrl}>
                <FacebookIcon size={18} />
              </FooterIconButton>
              <FooterIconButton href={redditUrl} label="Reddit" muted={!redditUrl}>
                <RedditIcon size={18} />
              </FooterIconButton>
            </div>
          </div>

          {productLinks.length > 0 ? (
            <div className="flex flex-col">
              <h4 className="mb-[16px] font-sans text-[14px] font-semibold uppercase tracking-[0.05em] text-[#B8B0D1]">
                Products
              </h4>
              <ul className="flex flex-col gap-[12px]">
                {productLinks.map((link) => (
                  <li key={link.name}>
                    {link.isComingSoon ? (
                      <button
                        type="button"
                        onClick={() => toast("Coming Soon! We're working on it.")}
                        className="font-sans text-[14px] font-normal text-[#6B6088] transition-colors duration-200 hover:text-[#D7C4F7]"
                      >
                        {link.name}
                      </button>
                    ) : (
                      <Link
                        href={link.href}
                        className="font-sans text-[14px] font-normal text-[#6B6088] transition-colors duration-200 hover:text-[#D7C4F7]"
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
            <h4 className="mb-[16px] font-sans text-[14px] font-semibold uppercase tracking-[0.05em] text-[#B8B0D1]">
              Company
            </h4>
            <ul className="flex flex-col gap-[12px]">
              {companyLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="font-sans text-[14px] font-normal text-[#6B6088] transition-colors duration-200 hover:text-[#D7C4F7]"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col">
            <h4 className="mb-[16px] font-sans text-[14px] font-semibold uppercase tracking-[0.05em] text-[#B8B0D1]">
              Legal
            </h4>
            <ul className="flex flex-col gap-[12px]">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="font-sans text-[14px] font-normal text-[#6B6088] transition-colors duration-200 hover:text-[#D7C4F7]"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-[48px] flex flex-col items-center justify-between gap-[16px] border-t border-[#1E0A35] pt-[24px] md:flex-row">
          <p className="text-center font-sans text-[13px] font-normal text-[#6B6088] md:text-left">
            &copy; 2026 trinetraedu-ai. All rights reserved.
          </p>
          <p className="flex items-center justify-center gap-[6px] font-sans text-[13px] font-normal text-[#6B6088] md:justify-end">
            Made in India.
          </p>
        </div>
      </div>
    </footer>
  );
}
