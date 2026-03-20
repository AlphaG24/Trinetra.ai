"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const navLinks = [
  { name: "Products", href: "/#products" },
  { name: "About", href: "/about" },
  { name: "Blog", href: "/blog" },
  { name: "Pricing", href: "/pricing" },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  /* ── Close mobile menu on route change ── */
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  /* ── Track scroll position ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Lock body scroll when mobile menu is open ── */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const toggleMenu = useCallback(() => setMenuOpen((prev) => !prev), []);

  return (
    <>
      {/* ════════════════════════════════════════════
          NAVBAR
          ════════════════════════════════════════════ */}
      <nav
        className={`navbar ${scrolled ? "navbar--scrolled" : ""}`}
        id="main-navbar"
      >
        <div className="navbar__inner">
          {/* ── Logo ── */}
          <Link href="/" className="group relative z-50 flex items-center gap-2 hover:opacity-80 transition-opacity duration-300">
            <Image
              src="/logo-transparent.png"
              alt="Trinetra Logo"
              width={320}
              height={90}
              className="h-24 w-auto"
              priority
            />
          </Link>

          {/* ── Desktop Nav Links ── */}
          <ul className="navbar__links">
            {navLinks.map((link) => (
              <li key={link.name}>
                <Link href={link.href} className="navbar__link">
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>

          {/* ── Desktop Actions ── */}
          <div className="navbar__actions">
            <Link href="/login" className="navbar__btn-login">
              Login
            </Link>
            <Link href="/contact" className="navbar__btn-deploy">
              Deploy Agent
            </Link>
          </div>

          {/* ── Hamburger (mobile) ── */}
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

      {/* ════════════════════════════════════════════
          MOBILE OVERLAY
          ════════════════════════════════════════════ */}
      <div
        className={`navbar-mobile ${menuOpen ? "navbar-mobile--open" : ""}`}
        id="mobile-menu"
      >
        {/* Close button */}
        <button
          className="navbar-mobile__close"
          onClick={toggleMenu}
          aria-label="Close menu"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Mobile links */}
        <nav className="navbar-mobile__nav">
          {navLinks.map((link, i) => (
            <Link
              key={link.name}
              href={link.href}
              className="navbar-mobile__link"
              style={{ transitionDelay: `${0.1 + i * 0.1}s` }}
              onClick={() => setMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}

          <Link
            href="/contact"
            className="navbar-mobile__deploy"
            style={{ transitionDelay: `${0.1 + navLinks.length * 0.1}s` }}
            onClick={() => setMenuOpen(false)}
          >
            Deploy Agent
          </Link>
        </nav>
      </div>
    </>
  );
}
