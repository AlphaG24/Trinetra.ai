"use client";

import React, { useState, useEffect, useRef } from "react";
import { Palette, X, Check, RotateCcw } from "lucide-react";

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  ruleFormula: string; // 60-30-10 representation
  // 60% Dominant (Canvas / Primary background)
  base60: string;
  base60Name: string;
  // 30% Structure (Banners, text headers, card outlines)
  structure30: string;
  structure30Name: string;
  bannerBg: string;
  // 10% Accent (CTAs, highlight texts, active badges, telemetry)
  accent10: string;
  accent10Name: string;
  accentSecondary: string;
  // Theme Variables
  vars: {
    "--theme-bg": string;
    "--theme-bg-hero": string;
    "--theme-bg-demo": string;
    "--theme-bg-why": string;
    "--theme-bg-banner": string;
    "--theme-bg-eco": string;
    "--theme-bg-map": string;
    "--theme-surface": string;
    "--theme-surface-alt": string;
    "--theme-border": string;
    "--theme-text-primary": string;
    "--theme-text-secondary": string;
    "--theme-demo-text-primary": string;
    "--theme-demo-text-secondary": string;
    "--theme-demo-surface": string;
    "--theme-demo-surface-alt": string;
    "--theme-demo-border": string;
    "--theme-structure-bg": string;
    "--theme-structure-text": string;
    "--theme-accent": string;
    "--theme-accent-hover": string;
    "--theme-accent-subtle": string;
    "--theme-accent-contrast": string;
    "--theme-accent-secondary": string;
    "--theme-map-dot": string;
    "--theme-route-west": string;
    "--theme-route-east": string;
    "--theme-route-south": string;
  };
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: "sovereign-cobalt",
    name: "Sovereign Cobalt & Obsidian Black",
    description: "Rich non-generic Royal Cobalt Blue, Deep Obsidian Black, and Architectural Frost White (60/30/10).",
    ruleFormula: "60% Frost White Canvas • 30% Obsidian Black Full Sections • 10% Sovereign Cobalt & Azure",
    base60: "#F8FAFC",
    base60Name: "Frost White (60%)",
    structure30: "#090D16",
    structure30Name: "Obsidian Carbon (30%)",
    bannerBg: "#05080F",
    accent10: "#2563EB",
    accent10Name: "Sovereign Cobalt (10%)",
    accentSecondary: "#38BDF8",
    vars: {
      "--theme-bg": "#F8FAFC",
      "--theme-bg-hero": "#F8FAFC",
      "--theme-bg-demo": "#090D16",
      "--theme-bg-why": "#FFFFFF",
      "--theme-bg-banner": "#05080F",
      "--theme-bg-eco": "#F1F5F9",
      "--theme-bg-map": "#FFFFFF",
      "--theme-surface": "#FFFFFF",
      "--theme-surface-alt": "#F8FAFC",
      "--theme-border": "#E2E8F0",
      "--theme-text-primary": "#090D16",
      "--theme-text-secondary": "#475569",
      "--theme-demo-text-primary": "#FFFFFF",
      "--theme-demo-text-secondary": "#94A3B8",
      "--theme-demo-surface": "#0F172A",
      "--theme-demo-surface-alt": "#1E293B",
      "--theme-demo-border": "#1E293B",
      "--theme-structure-bg": "#090D16",
      "--theme-structure-text": "#FFFFFF",
      "--theme-accent": "#2563EB",
      "--theme-accent-hover": "#1D4ED8",
      "--theme-accent-subtle": "rgba(37, 99, 235, 0.12)",
      "--theme-accent-contrast": "#FFFFFF",
      "--theme-accent-secondary": "#38BDF8",
      "--theme-map-dot": "#2563EB",
      "--theme-route-west": "#2563EB",
      "--theme-route-east": "#38BDF8",
      "--theme-route-south": "#1D4ED8",
    },
  },
  {
    id: "charcoal-red",
    name: "Charcoal Grey & Signal Red",
    description: "Bold editorial luxury with architectural sections (matching GAZU reference).",
    ruleFormula: "60% Moonlit Silver Canvas • 30% Solid Charcoal Full Sections • 10% Signal Red",
    base60: "#DFE3E8",
    base60Name: "Moonlit Silver (60%)",
    structure30: "#0F1216",
    structure30Name: "Solid Charcoal (30%)",
    bannerBg: "#0A0C0F",
    accent10: "#DC2626",
    accent10Name: "Signal Red (10%)",
    accentSecondary: "#E11D48",
    vars: {
      "--theme-bg": "#DFE3E8",
      "--theme-bg-hero": "#DFE3E8",
      "--theme-bg-demo": "#0F1216",
      "--theme-bg-why": "#D2D7DE",
      "--theme-bg-banner": "#0A0C0F",
      "--theme-bg-eco": "#E8EBEF",
      "--theme-bg-map": "#DFE3E8",
      "--theme-surface": "#FFFFFF",
      "--theme-surface-alt": "#F1F3F5",
      "--theme-border": "#BCC3CD",
      "--theme-text-primary": "#12151A",
      "--theme-text-secondary": "#495057",
      "--theme-demo-text-primary": "#FFFFFF",
      "--theme-demo-text-secondary": "#ADB5BD",
      "--theme-demo-surface": "#181C22",
      "--theme-demo-surface-alt": "#222730",
      "--theme-demo-border": "#2A303C",
      "--theme-structure-bg": "#12151A",
      "--theme-structure-text": "#FFFFFF",
      "--theme-accent": "#DC2626",
      "--theme-accent-hover": "#B91C1C",
      "--theme-accent-subtle": "rgba(220, 38, 38, 0.12)",
      "--theme-accent-contrast": "#FFFFFF",
      "--theme-accent-secondary": "#E11D48",
      "--theme-map-dot": "#495057",
      "--theme-route-west": "#DC2626",
      "--theme-route-east": "#E11D48",
      "--theme-route-south": "#991B1B",
    },
  },
  {
    id: "neutral-theory",
    name: "Neutral Color Theory",
    description: "Quiet luxury in warm stone, architectural obsidian, and deep amber bronze.",
    ruleFormula: "60% Warm Stone Linen Canvas • 30% Espresso Obsidian Sections • 10% Amber Bronze",
    base60: "#ECE6DA",
    base60Name: "Warm Stone Linen (60%)",
    structure30: "#171412",
    structure30Name: "Espresso Obsidian (30%)",
    bannerBg: "#100E0C",
    accent10: "#D97706",
    accent10Name: "Amber Bronze (10%)",
    accentSecondary: "#EA580C",
    vars: {
      "--theme-bg": "#ECE6DA",
      "--theme-bg-hero": "#ECE6DA",
      "--theme-bg-demo": "#171412",
      "--theme-bg-why": "#F3EFE7",
      "--theme-bg-banner": "#100E0C",
      "--theme-bg-eco": "#ECE6DA",
      "--theme-bg-map": "#F5F2EB",
      "--theme-surface": "#FAF8F5",
      "--theme-surface-alt": "#EAE4D7",
      "--theme-border": "#D5CDC0",
      "--theme-text-primary": "#171412",
      "--theme-text-secondary": "#57534E",
      "--theme-demo-text-primary": "#FAF8F5",
      "--theme-demo-text-secondary": "#A8A29E",
      "--theme-demo-surface": "#211E1A",
      "--theme-demo-surface-alt": "#2C2723",
      "--theme-demo-border": "#35302B",
      "--theme-structure-bg": "#171412",
      "--theme-structure-text": "#FAF8F5",
      "--theme-accent": "#D97706",
      "--theme-accent-hover": "#B45309",
      "--theme-accent-subtle": "rgba(217, 119, 6, 0.12)",
      "--theme-accent-contrast": "#FFFFFF",
      "--theme-accent-secondary": "#EA580C",
      "--theme-map-dot": "#78716C",
      "--theme-route-west": "#D97706",
      "--theme-route-east": "#EA580C",
      "--theme-route-south": "#92400E",
    },
  },
  {
    id: "sovereign-emerald",
    name: "Sovereign Emerald (Brand Choice)",
    description: "Telecom trust, verified statutory compliance, and sovereign stability.",
    ruleFormula: "60% Pale Celadon Canvas • 30% Sovereign Forest Pine Sections • 10% Telecom Emerald",
    base60: "#DEEAE3",
    base60Name: "Pale Celadon (60%)",
    structure30: "#051814",
    structure30Name: "Sovereign Forest Pine (30%)",
    bannerBg: "#03100D",
    accent10: "#059669",
    accent10Name: "Telecom Emerald (10%)",
    accentSecondary: "#0D9488",
    vars: {
      "--theme-bg": "#DEEAE3",
      "--theme-bg-hero": "#DEEAE3",
      "--theme-bg-demo": "#051814",
      "--theme-bg-why": "#F0F6F2",
      "--theme-bg-banner": "#03100D",
      "--theme-bg-eco": "#DEEAE3",
      "--theme-bg-map": "#EFF5F1",
      "--theme-surface": "#FFFFFF",
      "--theme-surface-alt": "#E6F0EB",
      "--theme-border": "#B8D1C4",
      "--theme-text-primary": "#051814",
      "--theme-text-secondary": "#2D4B42",
      "--theme-demo-text-primary": "#FFFFFF",
      "--theme-demo-text-secondary": "#92B7AA",
      "--theme-demo-surface": "#0C2620",
      "--theme-demo-surface-alt": "#14382F",
      "--theme-demo-border": "#1A473C",
      "--theme-structure-bg": "#051814",
      "--theme-structure-text": "#FFFFFF",
      "--theme-accent": "#059669",
      "--theme-accent-hover": "#047857",
      "--theme-accent-subtle": "rgba(5, 150, 105, 0.12)",
      "--theme-accent-contrast": "#FFFFFF",
      "--theme-accent-secondary": "#0D9488",
      "--theme-map-dot": "#10B981",
      "--theme-route-west": "#059669",
      "--theme-route-east": "#0D9488",
      "--theme-route-south": "#047857",
    },
  },
  {
    id: "cyber-gold",
    name: "Cyber Obsidian & Electric Gold",
    description: "High-contrast dark editorial luxury with radiant golden highlights.",
    ruleFormula: "60% Cyber Obsidian Canvas • 30% Graphite Carbon Sections • 10% Electric Gold",
    base60: "#0B0D12",
    base60Name: "Cyber Obsidian (60%)",
    structure30: "#131720",
    structure30Name: "Graphite Carbon (30%)",
    bannerBg: "#06080B",
    accent10: "#F59E0B",
    accent10Name: "Electric Gold (10%)",
    accentSecondary: "#FBBF24",
    vars: {
      "--theme-bg": "#0B0D12",
      "--theme-bg-hero": "#0B0D12",
      "--theme-bg-demo": "#131720",
      "--theme-bg-why": "#0E1117",
      "--theme-bg-banner": "#06080B",
      "--theme-bg-eco": "#0B0D12",
      "--theme-bg-map": "#0E1117",
      "--theme-surface": "#131720",
      "--theme-surface-alt": "#1C2230",
      "--theme-border": "#232B3A",
      "--theme-text-primary": "#F8FAFC",
      "--theme-text-secondary": "#94A3B8",
      "--theme-demo-text-primary": "#F8FAFC",
      "--theme-demo-text-secondary": "#94A3B8",
      "--theme-demo-surface": "#1C2230",
      "--theme-demo-surface-alt": "#252D3F",
      "--theme-demo-border": "#2D374D",
      "--theme-structure-bg": "#F8FAFC",
      "--theme-structure-text": "#0B0D12",
      "--theme-accent": "#F59E0B",
      "--theme-accent-hover": "#D97706",
      "--theme-accent-subtle": "rgba(245, 158, 11, 0.15)",
      "--theme-accent-contrast": "#000000",
      "--theme-accent-secondary": "#FBBF24",
      "--theme-map-dot": "#64748B",
      "--theme-route-west": "#F59E0B",
      "--theme-route-east": "#FBBF24",
      "--theme-route-south": "#D97706",
    },
  },
];

export function ThemeController() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activePalette, setActivePalette] = useState<string>("sovereign-cobalt");
  const drawerRef = useRef<HTMLDivElement>(null);

  const applyPalette = (p: ColorPalette) => {
    const root = document.documentElement;
    Object.entries(p.vars).forEach(([key, val]) => {
      root.style.setProperty(key, val);
    });
    // Explicitly update body styles to guarantee immediate repaint across the entire page
    document.body.style.backgroundColor = p.vars["--theme-bg"];
    document.body.style.color = p.vars["--theme-text-primary"];

    try {
      localStorage.setItem("vaakriti_color_palette_id", p.id);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("vaakriti_color_palette_id");
      // If no valid saved palette or previous default, apply sovereign-cobalt
      const found = COLOR_PALETTES.find((p) => p.id === saved) || COLOR_PALETTES[0];
      setActivePalette(found.id);
      applyPalette(found);
    } catch {
      applyPalette(COLOR_PALETTES[0]);
    }
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  // Close when clicking outside drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (p: ColorPalette) => {
    setActivePalette(p.id);
    applyPalette(p);
  };

  if (!mounted) return null;

  const selected = COLOR_PALETTES.find((p) => p.id === activePalette) || COLOR_PALETTES[1];

  return (
    <>
      {/* Backdrop to easily click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40 transition-opacity cursor-pointer"
          onClick={() => setIsOpen(false)}
          aria-label="Close palette selector"
        />
      )}

      <div className="fixed bottom-4 sm:bottom-6 left-4 sm:left-6 z-50 select-none font-sans">
        {/* Floating Pill Trigger */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900/95 hover:bg-black text-white text-xs font-semibold shadow-2xl backdrop-blur-md border border-slate-700/80 transition-all hover:scale-105 cursor-pointer"
          >
            <Palette className="w-4 h-4 text-emerald-400" />
            <span>Theme Studio (60:30:10)</span>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selected.accent10 }} />
          </button>
        )}

        {/* Expanded Control Drawer (Contained & Scrollable so header & footer are never pushed offscreen) */}
        {isOpen && (
          <div
            ref={drawerRef}
            className="w-[340px] sm:w-[380px] max-h-[calc(100vh-32px)] sm:max-h-[calc(100vh-48px)] flex flex-col rounded-3xl bg-white/98 backdrop-blur-2xl border border-slate-200 shadow-2xl p-4 sm:p-5 text-slate-900 transition-all overflow-hidden"
          >
            {/* Sticky / Non-scrolling Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Palette className="w-4 h-4 text-slate-800" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Palette Studio
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    60-30-10 Color Theory Selector
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                aria-label="Close theme panel"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Palette Options */}
            <div className="overflow-y-auto pr-1 my-3 space-y-2.5 flex-1 min-h-0">
              {COLOR_PALETTES.map((p) => {
                const isCurrent = p.id === activePalette;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                      isCurrent
                        ? "bg-slate-50/90 border-slate-900 shadow-xs"
                        : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {p.name}
                        </span>
                        {isCurrent && (
                          <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      {/* Color Swatches (60% - 30% - 10%) */}
                      <div className="flex items-center gap-1">
                        {/* 60% */}
                        <span
                          className="w-4 h-4 rounded-md border border-slate-200 shadow-2xs"
                          style={{ backgroundColor: p.base60 }}
                          title={p.base60Name}
                        />
                        {/* 30% */}
                        <span
                          className="w-4 h-4 rounded-md border border-slate-800 shadow-2xs"
                          style={{ backgroundColor: p.structure30 }}
                          title={p.structure30Name}
                        />
                        {/* 10% */}
                        <span
                          className="w-4 h-4 rounded-md border border-white shadow-2xs"
                          style={{ backgroundColor: p.accent10 }}
                          title={p.accent10Name}
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 font-normal leading-snug">
                      {p.description}
                    </p>

                    <div className="text-[10px] font-mono font-medium text-slate-600 bg-slate-100/80 px-2 py-1 rounded-md">
                      {p.ruleFormula}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Non-scrolling Footer with explicit Close button */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono shrink-0">
              <div className="flex items-center gap-2.5">
                <span>Cal Sans + Inter</span>
                <button
                  type="button"
                  onClick={() => handleSelect(COLOR_PALETTES[1])}
                  className="text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Reset to Charcoal & Red"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors flex items-center gap-1"
              >
                Close ✕
              </button>
            </div>

          </div>
        )}
      </div>
    </>
  );
}

export default ThemeController;
