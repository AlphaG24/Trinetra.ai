"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Twitter, Facebook, Instagram } from "lucide-react";

const footerNavigation = [
  {
    title: "Products",
    links: [
      { name: "AI Voice Agent", href: "/products/voice-agent" },
      { name: "AI Chat Agent", href: "/products/chat-agent" },
      { name: "AI Social Agent", href: "/products/social-agent" },
      { name: "AI Workflow Agent", href: "/products/workflow-agent" },
      { name: "ExamAI", href: "#" }
    ]
  },
  {
    title: "Company",
    links: [
      { name: "About Us", href: "/about" },
      { name: "Careers", href: "#" },
      { name: "Blog", href: "/blog" },
      { name: "Press Kit", href: "#" },
      { name: "Contact", href: "/contact" }
    ]
  },
  {
    title: "Resources",
    links: [
      { name: "Documentation", href: "#" },
      { name: "Help Center", href: "#" },
      { name: "API Reference", href: "#" },
      { name: "Status Page", href: "#" },
      { name: "Changelog", href: "#" }
    ]
  },
  {
    title: "Legal",
    links: [
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms of Service", href: "/terms" },
      { name: "Cookie Policy", href: "#" },
      { name: "Refund Policy", href: "#" }
    ]
  }
];

export function Footer() {
  const pathname = usePathname();

  // Hide entirely on any Dashboard route
  if (pathname?.startsWith("/dashboard")) {
    return null;
  }

  // Minimal footer stripped for Authentication
  if (pathname === "/login") {
    return (
      <footer className="w-full bg-[#0C0118] py-[20px] px-[20px] text-center border-t border-[#1E0A35]">
        <p className="font-sans font-normal text-[13px] text-[#6B6088] m-0">
          © 2025 Trinetra AI • <Link href="/privacy" className="text-[#A78BFA] hover:text-[#F5F3FF] transition-colors">Privacy Policy</Link> • <Link href="/terms" className="text-[#A78BFA] hover:text-[#F5F3FF] transition-colors">Terms</Link>
        </p>
      </footer>
    );
  }

  return (
    <footer className="w-full bg-[#0C0118] border-t border-[#1E0A35] pt-[40px] pb-[24px] px-[20px] md:pt-[64px] md:pb-[32px] md:px-[80px]">
      
      {/* Top Gradient Separator */}
      <div className="w-1/2 mx-auto h-[1px] bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent mb-[64px]" />

      <div className="max-w-[1280px] mx-auto">
        
        {/* Main Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-[40px]">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 flex flex-col items-start">
            <Link href="/" className="group flex items-center hover:opacity-80 transition-opacity duration-300">
              <Image 
                src="/trident.png" 
                alt="Trinetra AI Logo" 
                width={70} 
                height={64} 
                className="h-[64px] w-auto inline-block object-contain" 
                style={{ filter: 'drop-shadow(0 0 12px rgba(139,92,246,0.5))' }} 
              />
            </Link>
            
            <p className="font-sans font-normal text-[14px] text-[#6B6088] mt-[16px] max-w-[250px] leading-relaxed">
              The Divine Vision. See Beyond. Automate Beyond.
            </p>
            
            <div className="flex items-center gap-[16px] mt-[24px]">
              <a href="#" className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-[#6B6088] bg-transparent hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF] transition-colors duration-300">
                <Twitter size={18} />
              </a>
              <a href="#" className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-[#6B6088] bg-transparent hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF] transition-colors duration-300">
                <Facebook size={18} />
              </a>
              <a href="#" className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-[#6B6088] bg-transparent hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF] transition-colors duration-300">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-[#6B6088] bg-transparent hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF] transition-colors duration-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 11.5c0-1.65-1.35-3-3-3-.96 0-1.86.48-2.42 1.24-1.64-1-3.75-1.64-6.07-1.72.08-1.1.4-3.05 1.52-3.7.72-.4 1.73-.24 3 .5C17.2 6.3 18.46 7.5 20 7.5c1.65 0 3-1.35 3-3s-1.35-3-3-3c-1.38 0-2.54.94-2.88 2.22-1.43-.72-2.64-.8-3.6-.25-1.64.94-1.95 3.47-2 4.55-2.33.08-4.45.7-6.1 1.72C4.86 8.98 3.96 8.5 3 8.5c-1.65 0-3 1.35-3 3 0 1.32.84 2.44 2.05 2.84-.03.22-.05.44-.05.66 0 3.86 4.5 7 10 7s10-3.14 10-7c0-.22-.02-.44-.05-.66 1.2-.4 2.05-1.54 2.05-2.84zM2.3 11.5c0-.94.76-1.7 1.7-1.7.6 0 1.15.34 1.45.84-1.25.68-2.22 1.6-2.8 2.66-.23-.55-.35-1.15-.35-1.8zM9.2 18.2c-1.4 0-2.2-.9-2.2-2.2 0-1.4.9-2.2 2.2-2.2s2.2.9 2.2 2.2c0 1.4-.8 2.2-2.2 2.2zm5.6 0c-1.4 0-2.2-.9-2.2-2.2 0-1.4.9-2.2 2.2-2.2s2.2.9 2.2 2.2c0 1.4-.8 2.2-2.2 2.2zm-2.8 4.3c-2.46 0-4.73-.55-6.52-1.55.22-.72.84-1.26 1.6-1.4.25-.04.5-.06.76-.06s.5.02.75.05c1.54 1.1 3.23 1.25 3.42 1.25s1.88-.15 3.42-1.25c.25-.03.5-.05.75-.05s.5.02.76.06c.76.14 1.38.68 1.6 1.4-1.8 1-4.06 1.55-6.52 1.55z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Navigation Columns */}
          {footerNavigation.map((col) => (
            <div key={col.title} className="flex flex-col">
              <h4 className="font-sans font-semibold text-[14px] text-[#A8A0C0] mb-[16px] uppercase tracking-[0.05em]">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-[12px]">
                {col.links.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href}
                      className="font-sans font-normal text-[14px] text-[#6B6088] hover:text-[#A78BFA] transition-colors duration-200"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>

        {/* Bottom Bar */}
        <div className="mt-[48px] pt-[24px] border-t border-[#1E0A35] flex flex-col md:flex-row items-center justify-between gap-[16px]">
          <p className="font-sans font-normal text-[13px] text-[#6B6088] text-center md:text-left">
            © 2025 Trinetra AI. All rights reserved.
          </p>
          <p className="font-sans font-normal text-[13px] text-[#6B6088] flex items-center justify-center md:justify-end gap-[6px]">
            Made with <span className="text-[14px] animate-pulse drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]">🧿</span> in India
          </p>
        </div>

      </div>
    </footer>
  );
}
