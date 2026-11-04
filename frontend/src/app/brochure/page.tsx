'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Download, FileText, Printer, Eye, ChevronDown, Check } from 'lucide-react'

export default function BrochurePage() {
  const [viewMode, setViewMode] = useState<'document' | 'gallery'>('document')
  const [pageDropdownOpen, setPageDropdownOpen] = useState(false)

  const pages = [
    { num: 1, title: 'Cover: Platform Overview', pdf: '/brochure_pages/Vaakriti_Brochure_Page_1.pdf', img: '/brochure_pages/page_1.png' },
    { num: 2, title: '01: Architecture & Topology', pdf: '/brochure_pages/Vaakriti_Brochure_Page_2.pdf', img: '/brochure_pages/page_2.png' },
    { num: 3, title: '02: Operations Brain', pdf: '/brochure_pages/Vaakriti_Brochure_Page_3.pdf', img: '/brochure_pages/page_3.png' },
    { num: 4, title: '03: In-Call Commerce & Invoicing', pdf: '/brochure_pages/Vaakriti_Brochure_Page_4.pdf', img: '/brochure_pages/page_4.png' },
    { num: 5, title: '04: Receipt OCR & Escalation', pdf: '/brochure_pages/Vaakriti_Brochure_Page_5.pdf', img: '/brochure_pages/page_5.png' },
    { num: 6, title: '05: Telephony & Latency Specs', pdf: '/brochure_pages/Vaakriti_Brochure_Page_6.pdf', img: '/brochure_pages/page_6.png' },
    { num: 7, title: '06: Security & TRAI Standards', pdf: '/brochure_pages/Vaakriti_Brochure_Page_7.pdf', img: '/brochure_pages/page_7.png' },
    { num: 8, title: '07: 4-Day Rollout & SLA', pdf: '/brochure_pages/Vaakriti_Brochure_Page_8.pdf', img: '/brochure_pages/page_8.png' },
  ]

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Top Action Bar */}
      <header className="sticky top-0 z-50 bg-[#09090b] border-b border-[#27272a] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-tight text-white text-base">VAAKRITI</span>
            <span className="text-xs bg-[#27272a] text-zinc-300 px-2 py-0.5 rounded uppercase font-semibold tracking-wider">
              Service Brochure
            </span>
          </div>
          <div className="hidden md:flex items-center text-xs text-zinc-400 gap-2 border-l border-zinc-800 pl-3">
            <span>8 Pages</span>
            <span>•</span>
            <span>Architectural B&W</span>
            <span>•</span>
            <span>291 KB Vector PDF</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded p-0.5 text-xs">
            <button
              onClick={() => setViewMode('document')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'document' ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Document View
            </button>
            <button
              onClick={() => setViewMode('gallery')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'gallery' ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Page Gallery
            </button>
          </div>

          {/* Download Page by Page Dropdown */}
          <div className="relative">
            <button
              onClick={() => setPageDropdownOpen(!pageDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18181b] hover:bg-[#27272a] text-zinc-200 border border-[#27272a] rounded text-xs font-medium transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Download Single Page</span>
              <ChevronDown className="w-3 h-3 ml-1" />
            </button>

            {pageDropdownOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-[#18181b] border border-[#27272a] rounded shadow-2xl py-1 z-50 text-xs">
                <div className="px-3 py-1.5 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                  Select Page to Download (PDF)
                </div>
                {pages.map((p) => (
                  <a
                    key={p.num}
                    href={p.pdf}
                    download={`Vaakriti_Brochure_Page_${p.num}.pdf`}
                    onClick={() => setPageDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 hover:bg-[#27272a] text-zinc-300 hover:text-white transition-colors"
                  >
                    <span>Page {p.num}: {p.title}</span>
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Download Full PDF */}
          <a
            href="/Vaakriti_Enterprise_Brochure.pdf"
            download="Vaakriti_Enterprise_Brochure.pdf"
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white hover:bg-zinc-200 text-black rounded text-xs font-bold transition-all shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Complete PDF (8 Pages)</span>
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      {viewMode === 'document' ? (
        <main className="flex-1 w-full bg-[#18181b] flex justify-center p-0 md:p-4 overflow-auto">
          <div className="w-full max-w-[220mm] bg-white shadow-2xl">
            <iframe
              src="/brochure.html"
              className="w-full h-[90vh] md:h-[calc(100vh-65px)] border-0"
              title="Vaakriti AI Enterprise Brochure"
            />
          </div>
        </main>
      ) : (
        <main className="flex-1 w-full bg-[#121214] p-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Individual Page Downloads</h1>
                <p className="text-xs text-zinc-400 mt-1">Download each page separately as a single-page PDF or high-resolution image.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {pages.map((p) => (
                <div key={p.num} className="bg-[#18181b] border border-[#27272a] rounded-lg overflow-hidden flex flex-col justify-between">
                  <div className="p-3 border-b border-[#27272a]">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-black border border-zinc-700 rounded text-zinc-300">
                        Page {p.num}
                      </span>
                      <span className="text-[11px] text-zinc-400 truncate max-w-[140px]">{p.title}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0a0a0c] flex items-center justify-center">
                    <img
                      src={p.img}
                      alt={`Page ${p.num}`}
                      className="w-full h-auto max-h-[320px] object-contain rounded border border-zinc-800 shadow"
                    />
                  </div>

                  <div className="p-3 border-t border-[#27272a] bg-[#18181b] flex items-center gap-2">
                    <a
                      href={p.pdf}
                      download={`Vaakriti_Brochure_Page_${p.num}.pdf`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white hover:bg-zinc-200 text-black rounded text-[11px] font-semibold transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>PDF</span>
                    </a>
                    <a
                      href={p.img}
                      download={`Vaakriti_Brochure_Page_${p.num}.png`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[#27272a] hover:bg-zinc-700 text-white rounded text-[11px] font-medium transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>PNG</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
