import React from "react";
import { Globe } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   CIRCULAR VECTOR COUNTRY FLAGS (Matching reference screenshot exactly)
   ═══════════════════════════════════════════════════════════════════════ */

export function IndiaCircularFlag({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`shrink-0 rounded-full shadow-2xs ${className}`} xmlns="http://www.w3.org/2000/svg">
      <clipPath id="circle-clip-in">
        <circle cx="16" cy="16" r="16" />
      </clipPath>
      <g clipPath="url(#circle-clip-in)">
        {/* Saffron Top */}
        <rect x="0" y="0" width="32" height="10.66" fill="#FF9933" />
        {/* White Middle */}
        <rect x="0" y="10.66" width="32" height="10.66" fill="#FFFFFF" />
        {/* Green Bottom */}
        <rect x="0" y="21.33" width="32" height="10.67" fill="#138808" />
        {/* Ashoka Chakra (Navy Blue Wheel) */}
        <circle cx="16" cy="16" r="3.2" fill="none" stroke="#000080" strokeWidth="0.75" />
        <circle cx="16" cy="16" r="0.7" fill="#000080" />
        <path d="M 16 13 L 16 19 M 13 16 L 19 16 M 13.9 13.9 L 18.1 18.1 M 13.9 18.1 L 18.1 13.9" stroke="#000080" strokeWidth="0.5" />
      </g>
    </svg>
  );
}

export function USACircularFlag({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`shrink-0 rounded-full shadow-2xs ${className}`} xmlns="http://www.w3.org/2000/svg">
      <clipPath id="circle-clip-us">
        <circle cx="16" cy="16" r="16" />
      </clipPath>
      <g clipPath="url(#circle-clip-us)">
        <rect x="0" y="0" width="32" height="32" fill="#B22234" />
        <rect x="0" y="2.5" width="32" height="2.5" fill="#FFFFFF" />
        <rect x="0" y="7.5" width="32" height="2.5" fill="#FFFFFF" />
        <rect x="0" y="12.5" width="32" height="2.5" fill="#FFFFFF" />
        <rect x="0" y="17.5" width="32" height="2.5" fill="#FFFFFF" />
        <rect x="0" y="22.5" width="32" height="2.5" fill="#FFFFFF" />
        <rect x="0" y="27.5" width="32" height="2.5" fill="#FFFFFF" />
        <rect x="0" y="0" width="14" height="15" fill="#3C3B6E" />
        <g fill="#FFFFFF" fontSize="4" textAnchor="middle">
          <text x="3.5" y="5">★</text>
          <text x="7" y="5">★</text>
          <text x="10.5" y="5">★</text>
          <text x="5.2" y="9">★</text>
          <text x="8.8" y="9">★</text>
          <text x="3.5" y="13">★</text>
          <text x="7" y="13">★</text>
          <text x="10.5" y="13">★</text>
        </g>
      </g>
    </svg>
  );
}

export function UKCircularFlag({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`shrink-0 rounded-full shadow-2xs ${className}`} xmlns="http://www.w3.org/2000/svg">
      <clipPath id="circle-clip-uk">
        <circle cx="16" cy="16" r="16" />
      </clipPath>
      <g clipPath="url(#circle-clip-uk)">
        <rect x="0" y="0" width="32" height="32" fill="#012169" />
        <path d="M 0 0 L 32 32 M 32 0 L 0 32" stroke="#FFFFFF" strokeWidth="5.5" strokeLinecap="square" />
        <path d="M 0 0 L 32 32 M 32 0 L 0 32" stroke="#C8102E" strokeWidth="2.5" strokeLinecap="square" />
        <path d="M 16 0 L 16 32 M 0 16 L 32 16" stroke="#FFFFFF" strokeWidth="7.5" />
        <path d="M 16 0 L 16 32 M 0 16 L 32 16" stroke="#C8102E" strokeWidth="4.5" />
      </g>
    </svg>
  );
}

export function UAECircularFlag({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`shrink-0 rounded-full shadow-2xs ${className}`} xmlns="http://www.w3.org/2000/svg">
      <clipPath id="circle-clip-ae">
        <circle cx="16" cy="16" r="16" />
      </clipPath>
      <g clipPath="url(#circle-clip-ae)">
        <rect x="8" y="0" width="24" height="10.66" fill="#00732F" />
        <rect x="8" y="10.66" width="24" height="10.66" fill="#FFFFFF" />
        <rect x="8" y="21.33" width="24" height="10.67" fill="#000000" />
        <rect x="0" y="0" width="8.5" height="32" fill="#FF0000" />
      </g>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN GLOBAL TELEPHONY COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

export function GlobalTelephonyMap() {
  return (
    <section
      id="global-capability"
      className="w-full py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-10 select-none overflow-hidden font-sans transition-colors duration-300"
      style={{
        backgroundColor: "var(--theme-bg-map, #FAFAFA)",
        borderTop: "1px solid var(--theme-border, #E5E5E5)",
      }}
    >
      <div className="w-full max-w-[1440px] mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 xl:gap-16">
          
          {/* ══════════════════════════════════════════════════════════════
              LEFT SIDE: REAL DOTTED WORLD MAP WITH DISTINCT MULTI-DIRECTIONAL ROUTES
              ══════════════════════════════════════════════════════════════ */}
          <div className="w-full lg:w-[54%] xl:w-[53%] relative flex items-center justify-center">
            
            {/* Map Supporting Visual Canvas inside Card Frame */}
            <div className="relative w-full max-w-[700px] rounded-3xl bg-white border border-[#E2E8F0] p-4 sm:p-6 shadow-[0_2px_14px_rgba(8,13,24,0.03)] aspect-[800/440] flex items-center justify-center">
              
              {/* SVG Vector World Map */}
              <svg
                viewBox="0 0 800 420"
                className="w-full h-full object-contain"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* 1. Real Dotted World Map (High-visibility dots from official GeoJSON boundaries) */}
                <image
                  href="/real-world-dots.svg"
                  x="0"
                  y="0"
                  width="800"
                  height="420"
                  opacity="1"
                />

                {/* 2. Destination Markers in 3 Distinct Geographic Locations */}
                
                {/* Location 1: North America West Coast (x: 220, y: 100) */}
                <g>
                  <circle cx="220" cy="100" r="4.5" fill="#315CFF" />
                  <circle cx="220" cy="100" r="10" fill="none" stroke="#315CFF" strokeWidth="1.2" opacity="0.45" />
                </g>

                {/* Location 2: Asia-Pacific / Tokyo (x: 745, y: 135) */}
                <g>
                  <circle cx="745" cy="135" r="4.5" fill="#45C5FF" />
                  <circle cx="745" cy="135" r="10" fill="none" stroke="#45C5FF" strokeWidth="1.2" opacity="0.45" />
                </g>

                {/* Location 3: Middle East / UAE (x: 505, y: 175) */}
                <g>
                  <circle cx="505" cy="175" r="4.5" fill="#18243A" />
                  <circle cx="505" cy="175" r="10" fill="none" stroke="#18243A" strokeWidth="1.2" opacity="0.45" />
                </g>

                {/* India Central Core Hub (x: 563, y: 183) - Completely unobstructed */}
                <g>
                  <circle
                    cx="563"
                    cy="183"
                    r="18"
                    fill="none"
                    stroke="#315CFF"
                    strokeWidth="1.75"
                    opacity="0.45"
                    className="animate-ping"
                    style={{ transformOrigin: "563px 183px", animationDuration: "2.4s" }}
                  />
                  <circle cx="563" cy="183" r="6.5" fill="#315CFF" />
                  <circle cx="563" cy="183" r="2.5" fill="#FFFFFF" />
                </g>

                {/* ── 3 COMPLETELY DISTINCT FLIGHT PATHS (NO OVERLAP) ── */}
                
                {/* Route 1: India -> High Polar North Arc to USA (Clears all other routes completely) */}
                <path
                  id="flight-route-west"
                  d="M 563 183 Q 380 -5 220 100"
                  fill="none"
                  stroke="#315CFF"
                  strokeWidth="1.8"
                  strokeDasharray="4 6"
                  opacity="0.85"
                />

                {/* Route 2: India -> Eastward Arc to Tokyo & Asia-Pacific (Points completely EAST) */}
                <path
                  id="flight-route-east"
                  d="M 563 183 Q 660 110 745 135"
                  fill="none"
                  stroke="#45C5FF"
                  strokeWidth="1.8"
                  strokeDasharray="5 5"
                  opacity="0.85"
                />

                {/* Route 3: India -> Direct Southwest Arc into UAE (Points SOUTHWEST) */}
                <path
                  id="flight-route-southwest"
                  d="M 563 183 Q 540 205 505 175"
                  fill="none"
                  stroke="#18243A"
                  strokeWidth="1.8"
                  strokeDasharray="3 5"
                  opacity="0.85"
                />

                {/* ── AIRPLANE 1: Flying WEST to USA ── */}
                <g>
                  <animateMotion
                    path="M 563 183 Q 380 -5 220 100"
                    dur="7s"
                    repeatCount="indefinite"
                    rotate="auto"
                  />
                  <g transform="scale(0.85)">
                    <path
                      d="M 12 0 L -5 -6 L -2 -1 L -9 -2 L -11 -4 L -13 -4 L -12 0 L -13 4 L -11 4 L -9 2 L -2 1 L -5 6 Z"
                      fill="#315CFF"
                      stroke="#FFFFFF"
                      strokeWidth="0.8"
                    />
                  </g>
                </g>

                {/* ── AIRPLANE 2: Flying EAST to Asia-Pacific ── */}
                <g>
                  <animateMotion
                    path="M 563 183 Q 660 110 745 135"
                    dur="5.5s"
                    repeatCount="indefinite"
                    rotate="auto"
                    begin="1.2s"
                  />
                  <g transform="scale(0.8)">
                    <path
                      d="M 12 0 L -5 -6 L -2 -1 L -9 -2 L -11 -4 L -13 -4 L -12 0 L -13 4 L -11 4 L -9 2 L -2 1 L -5 6 Z"
                      fill="#45C5FF"
                      stroke="#FFFFFF"
                      strokeWidth="0.8"
                    />
                  </g>
                </g>

                {/* ── AIRPLANE 3: Flying SOUTHWEST to Middle East ── */}
                <g>
                  <animateMotion
                    path="M 563 183 Q 540 205 505 175"
                    dur="4s"
                    repeatCount="indefinite"
                    rotate="auto"
                    begin="2.5s"
                  />
                  <g transform="scale(0.7)">
                    <path
                      d="M 12 0 L -5 -6 L -2 -1 L -9 -2 L -11 -4 L -13 -4 L -12 0 L -13 4 L -11 4 L -9 2 L -2 1 L -5 6 Z"
                      fill="#18243A"
                      stroke="#FFFFFF"
                      strokeWidth="0.8"
                    />
                  </g>
                </g>
              </svg>

              {/* Floating India Telephony Hub Card */}
              <div
                className="absolute top-[48%] right-[8%] sm:right-[12%] backdrop-blur-md border rounded-2xl p-3 sm:p-3.5 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.08)] flex flex-col gap-2 z-20 transition-colors duration-300"
                style={{
                  backgroundColor: "var(--theme-surface, #FFFFFF)",
                  borderColor: "var(--theme-border, #E2E8F0)",
                }}
              >
                <div className="flex items-center gap-2">
                  <IndiaCircularFlag className="w-5 h-5" />
                  <div>
                    <h4
                      className="text-xs font-bold leading-tight font-sans transition-colors duration-300"
                      style={{ color: "var(--theme-text-primary, #080D18)" }}
                    >
                      India
                    </h4>
                    <p
                      className="text-[10px] font-semibold flex items-center gap-1 font-sans transition-colors duration-300"
                      style={{ color: "var(--theme-accent, #315CFF)" }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: "var(--theme-accent, #315CFF)" }}
                      />
                      Global Telephony Hub
                    </p>
                  </div>
                </div>

                {/* Representative Agent Avatars with Real Portraits */}
                <div className="flex items-center -space-x-1.5 pt-0.5">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white bg-cover bg-center shadow-2xs"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80')" }}
                    title="Arika"
                  />
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white bg-cover bg-center shadow-2xs"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80')" }}
                    title="Vikram"
                  />
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white bg-cover bg-center shadow-2xs"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=80&q=80')" }}
                    title="Vaamika"
                  />
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white bg-cover bg-center shadow-2xs"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80')" }}
                    title="Shubh"
                  />
                </div>
              </div>

              {/* Hand-Drawn Note: Positioned with Arrow Curving UP-RIGHT Directly into India Hub Pin */}
              <div className="absolute bottom-[3%] left-[44%] sm:left-[48%] flex flex-col items-center pointer-events-none select-none z-20">
                {/* Arrow pointing UP-RIGHT directly at India node (563, 183) */}
                <svg width="60" height="48" viewBox="0 0 60 48" fill="none" style={{ color: "var(--theme-accent, #315CFF)" }}>
                  <path
                    d="M 12 44 Q 38 34 42 12"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Arrowhead pointing UP-RIGHT into India */}
                  <path
                    d="M 34 18 L 42 10 L 48 18"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <span
                  className="font-serif italic text-sm sm:text-base tracking-wide whitespace-nowrap drop-shadow-xs -mt-1 font-bold"
                  style={{ color: "var(--theme-accent, #315CFF)" }}
                >
                  India-first. <br />
                  Built for the world.
                </span>
              </div>

            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              RIGHT SIDE: CUSTOMER-FACING CONTENT & 2-WAY TYPOGRAPHY
              ══════════════════════════════════════════════════════════════ */}
          <div className="w-full lg:w-[46%] xl:w-[47%] flex flex-col justify-center">
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase mb-3 border bg-white border-[#E2E8F0] text-[#315CFF] w-fit">
              <Globe className="w-3.5 h-3.5 text-[#315CFF]" />
              <span>GLOBAL CARRIER FABRIC</span>
            </div>

            {/* Display Headline with Cal Sans Font */}
            <h2
              className="text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-tight leading-[1.12] mb-3 font-[family-name:var(--font-cal-sans)] transition-colors duration-300"
              style={{ color: "var(--theme-text-primary, #080D18)" }}
            >
              Built for India. <br />
              <span style={{ color: "var(--theme-accent, #315CFF)" }}>
                Ready for the world.
              </span>
            </h2>

            {/* Customer-Centric Enterprise Narrative with Inter Font */}
            <p
              className="text-sm sm:text-base lg:text-[16.5px] font-normal leading-relaxed mb-6 max-w-xl font-sans transition-colors duration-300"
              style={{ color: "var(--theme-text-secondary, #4A5568)" }}
            >
              Engineered with native vernacular code-switching, advanced noise filtration, and sub-480ms conversational latency. Vaakriti empowers global enterprises to deliver human-like voice intelligence across continents, regional dialects, and statutory telephony compliance standards.
            </p>

            {/* Flag Badges Row with Real Circular Vector Country Flags & Names */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              
              {/* India */}
              <div
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border shadow-2xs transition-colors duration-300"
                style={{
                  backgroundColor: "var(--theme-surface, #FFFFFF)",
                  borderColor: "var(--theme-border, #E2E8F0)",
                }}
              >
                <IndiaCircularFlag className="w-7 h-7" />
                <div className="flex flex-col text-left">
                  <span
                    className="text-xs font-bold leading-none font-sans"
                    style={{ color: "var(--theme-text-primary, #080D18)" }}
                  >
                    India
                  </span>
                  <span
                    className="text-[10px] font-semibold leading-none mt-1 font-sans"
                    style={{ color: "var(--theme-accent, #315CFF)" }}
                  >
                    Live now
                  </span>
                </div>
              </div>

              {/* USA */}
              <div
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border shadow-2xs transition-colors duration-300"
                style={{
                  backgroundColor: "var(--theme-surface, #FFFFFF)",
                  borderColor: "var(--theme-border, #E2E8F0)",
                }}
              >
                <USACircularFlag className="w-7 h-7" />
                <div className="flex flex-col text-left">
                  <span
                    className="text-xs font-bold leading-none font-sans"
                    style={{ color: "var(--theme-text-primary, #080D18)" }}
                  >
                    USA
                  </span>
                  <span
                    className="text-[10px] font-medium leading-none mt-1 font-sans"
                    style={{ color: "var(--theme-text-secondary, #718096)" }}
                  >
                    Coming soon
                  </span>
                </div>
              </div>

              {/* UK */}
              <div
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border shadow-2xs transition-colors duration-300"
                style={{
                  backgroundColor: "var(--theme-surface, #FFFFFF)",
                  borderColor: "var(--theme-border, #E2E8F0)",
                }}
              >
                <UKCircularFlag className="w-7 h-7" />
                <div className="flex flex-col text-left">
                  <span
                    className="text-xs font-bold leading-none font-sans"
                    style={{ color: "var(--theme-text-primary, #080D18)" }}
                  >
                    UK
                  </span>
                  <span
                    className="text-[10px] font-medium leading-none mt-1 font-sans"
                    style={{ color: "var(--theme-text-secondary, #718096)" }}
                  >
                    Coming soon
                  </span>
                </div>
              </div>

              {/* UAE */}
              <div
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border shadow-2xs transition-colors duration-300"
                style={{
                  backgroundColor: "var(--theme-surface, #FFFFFF)",
                  borderColor: "var(--theme-border, #E2E8F0)",
                }}
              >
                <UAECircularFlag className="w-7 h-7" />
                <div className="flex flex-col text-left">
                  <span
                    className="text-xs font-bold leading-none font-sans"
                    style={{ color: "var(--theme-text-primary, #080D18)" }}
                  >
                    UAE
                  </span>
                  <span
                    className="text-[10px] font-medium leading-none mt-1 font-sans"
                    style={{ color: "var(--theme-text-secondary, #718096)" }}
                  >
                    Coming soon
                  </span>
                </div>
              </div>

              {/* + more */}
              <span
                className="text-xs font-semibold pl-1 cursor-default font-sans"
                style={{ color: "var(--theme-text-secondary, #475569)" }}
              >
                + more
              </span>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}

export default GlobalTelephonyMap;
