"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Instagram, Linkedin, Twitter } from "lucide-react";

import { RedditIcon } from "@/components/ui/RedditIcon";

const footerNavigation = [
  {
    title: "Products",
    links: [
      { name: "AI Voice Agent", href: "/products/voice-agent" },
      { name: "AI Chat Agent", href: "/products/chat-agent" },
      { name: "AI Social Agent", href: "/products/social-agent" },
      { name: "AI Workflow Agent", href: "/products/workflow-agent" },
      { name: "ExamAI", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About Us", href: "/about" },
      { name: "Careers", href: "#" },
      { name: "Blog", href: "/blog" },
      { name: "Press Kit", href: "#" },
      { name: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Documentation", href: "#" },
      { name: "Help Center", href: "#" },
      { name: "API Reference", href: "#" },
      { name: "Status Page", href: "#" },
      { name: "Changelog", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms of Service", href: "/terms" },
      { name: "Cookie Policy", href: "#" },
      { name: "Refund Policy", href: "#" },
    ],
  },
];

export function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith("/dashboard")) {
    return null;
  }

  if (pathname === "/login") {
    return (
      <footer className="w-full border-t border-[#1E0A35] bg-[#0C0118] px-[20px] py-[20px] text-center">
        <p className="m-0 font-sans text-[13px] font-normal text-[#6B6088]">
          &copy; 2025 Trinetra AI |{" "}
          <Link href="/privacy" className="text-[#A78BFA] transition-colors hover:text-[#F5F3FF]">
            Privacy Policy
          </Link>{" "}
          |{" "}
          <Link href="/terms" className="text-[#A78BFA] transition-colors hover:text-[#F5F3FF]">
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
        <div className="grid grid-cols-1 gap-[40px] md:grid-cols-2 lg:grid-cols-6">
          <div className="flex flex-col items-start lg:col-span-2">
            <Link href="/" className="group flex items-center transition-opacity duration-300 hover:opacity-80">
              <Image
                src="/trident.png"
                alt="Trinetra AI Logo"
                width={70}
                height={64}
                className="inline-block h-[64px] w-auto object-contain"
                style={{ filter: "drop-shadow(0 0 12px rgba(139,92,246,0.5))" }}
              />
            </Link>

            <p className="mt-[16px] max-w-[250px] font-sans text-[14px] font-normal leading-relaxed text-[#6B6088]">
              The Divine Vision. See Beyond. Automate Beyond.
            </p>

            <div className="mt-[24px] flex items-center gap-[16px]">
              <a
                href="https://www.linkedin.com/in/trinetraedu-ai-7402143b8"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-transparent text-[#6B6088] transition-colors duration-300 hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF]"
              >
                <Linkedin size={18} />
              </a>
              <a
                href="https://www.instagram.com/trinetraedu.ai?igsh=MTB6cW12NHZ3YjNnaw=="
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                title="Coming Soon"
                className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-transparent text-[#6B6088] opacity-50 transition-colors duration-300 hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF]"
              >
                <Instagram size={18} />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                title="Coming Soon"
                className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-transparent text-[#6B6088] opacity-50 transition-colors duration-300 hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF]"
              >
                <Twitter size={18} />
              </a>
              <a
                href="https://www.reddit.com/u/trinetragroup/s/NMefhDCrYv"
                target="_blank"
                rel="noreferrer"
                aria-label="Reddit"
                className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-transparent text-[#6B6088] transition-colors duration-300 hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF]"
              >
                <RedditIcon size={18} />
              </a>
            </div>
          </div>

          {footerNavigation.map((col) => (
            <div key={col.title} className="flex flex-col">
              <h4 className="mb-[16px] font-sans text-[14px] font-semibold uppercase tracking-[0.05em] text-[#A8A0C0]">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-[12px]">
                {col.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="font-sans text-[14px] font-normal text-[#6B6088] transition-colors duration-200 hover:text-[#A78BFA]"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-[48px] flex flex-col items-center justify-between gap-[16px] border-t border-[#1E0A35] pt-[24px] md:flex-row">
          <p className="text-center font-sans text-[13px] font-normal text-[#6B6088] md:text-left">
            &copy; 2025 Trinetra AI. All rights reserved.
          </p>
          <p className="flex items-center justify-center gap-[6px] font-sans text-[13px] font-normal text-[#6B6088] md:justify-end">
            Made in India.
          </p>
        </div>
      </div>
    </footer>
  );
}
