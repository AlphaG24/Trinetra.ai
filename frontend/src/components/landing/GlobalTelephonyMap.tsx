import React from "react";

/* ══════════════════════════════════════════════════════════════════════════════
   CIRCULAR VECTOR COUNTRY FLAGS
   ══════════════════════════════════════════════════════════════════════════════ */

export function IndiaCircularFlag({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`shrink-0 rounded-full shadow-2xs ${className}`} xmlns="http://www.w3.org/2000/svg">
      <clipPath id="circle-clip-in-flag">
        <circle cx="16" cy="16" r="16" />
      </clipPath>
      <g clipPath="url(#circle-clip-in-flag)">
        <rect x="0" y="0" width="32" height="10.66" fill="#FF9933" />
        <rect x="0" y="10.66" width="32" height="10.66" fill="#FFFFFF" />
        <rect x="0" y="21.33" width="32" height="10.67" fill="#138808" />
        <circle cx="16" cy="16" r="3.2" fill="none" stroke="#000080" strokeWidth="0.75" />
        <circle cx="16" cy="16" r="0.7" fill="#000080" />
        <path d="M 16 13 L 16 19 M 13 16 L 19 16 M 13.9 13.9 L 18.1 18.1 M 13.9 18.1 L 18.1 13.9" stroke="#000080" strokeWidth="0.5" />
      </g>
    </svg>
  );
}

export function USACircularFlag({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`shrink-0 rounded-full shadow-2xs ${className}`} xmlns="http://www.w3.org/2000/svg">
      <clipPath id="circle-clip-us-flag">
        <circle cx="16" cy="16" r="16" />
      </clipPath>
      <g clipPath="url(#circle-clip-us-flag)">
        <rect x="0" y="0" width="32" height="32" fill="#B22234" />
        <rect x="0" y="2.5" width="32" height="2.5" fill="#FFFFFF" />
        <rect x="0" y="7.5" width="32" height="2.5" fill="#FFFFFF" />
        <rect x="0" y="12.5" width="32" height="2.5" fill="#FFFFFF" />
        <rect x="0" y="17.5" width="32" height="2.5" fill="#FFFFFF" />
        <rect x="0" y="22.5" width="32" height="2.5" fill="#FFFFFF" />
        <rect x="0" y="27.5" width="32" height="2.5" fill="#FFFFFF" />
        <rect x="0" y="0" width="14" height="15" fill="#3C3B6E" />
        <g fill="#FFFFFF" fontSize="3.5" textAnchor="middle">
          <text x="3.5" y="5">★</text>
          <text x="7" y="5">★</text>
          <text x="10.5" y="5">★</text>
          <text x="5.2" y="9">★</text>
          <text x="8.8" y="9">★</text>
          <text x="3.5" y="13">★</text>
          <text x="7" y="13">★</text>
        </g>
      </g>
    </svg>
  );
}

export function UKCircularFlag({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`shrink-0 rounded-full shadow-2xs ${className}`} xmlns="http://www.w3.org/2000/svg">
      <clipPath id="circle-clip-uk-flag">
        <circle cx="16" cy="16" r="16" />
      </clipPath>
      <g clipPath="url(#circle-clip-uk-flag)">
        <rect x="0" y="0" width="32" height="32" fill="#012169" />
        <path d="M 0 0 L 32 32 M 32 0 L 0 32" stroke="#FFFFFF" strokeWidth="5.5" strokeLinecap="square" />
        <path d="M 0 0 L 32 32 M 32 0 L 0 32" stroke="#C8102E" strokeWidth="2.5" strokeLinecap="square" />
        <path d="M 16 0 L 16 32 M 0 16 L 32 16" stroke="#FFFFFF" strokeWidth="7.5" />
        <path d="M 16 0 L 16 32 M 0 16 L 32 16" stroke="#C8102E" strokeWidth="4.5" />
      </g>
    </svg>
  );
}

export function UAECircularFlag({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`shrink-0 rounded-full shadow-2xs ${className}`} xmlns="http://www.w3.org/2000/svg">
      <clipPath id="circle-clip-ae-flag">
        <circle cx="16" cy="16" r="16" />
      </clipPath>
      <g clipPath="url(#circle-clip-ae-flag)">
        <rect x="8" y="0" width="24" height="10.66" fill="#00732F" />
        <rect x="8" y="10.66" width="24" height="10.66" fill="#FFFFFF" />
        <rect x="8" y="21.33" width="24" height="10.67" fill="#000000" />
        <rect x="0" y="0" width="8.5" height="32" fill="#FF0000" />
      </g>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   GLOBAL CAPABILITY: BUILT FOR INDIA, READY FOR THE WORLD
   2-Column Layout matching the reference design with accurate India geometry.
   ══════════════════════════════════════════════════════════════════════════════ */
export function GlobalTelephonyMap() {
  return (
    <section className="relative py-14 sm:py-20 lg:py-24 overflow-hidden bg-transparent font-sans">
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* ══════════════════════════════════════════════════════════════════
              LEFT COLUMN: WORLD MAP WITH INDIA BLUE ACCURACY & ORBIT ARCS
              ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 relative w-full aspect-[800/440] max-h-[500px] flex items-center justify-center select-none">
            
            {/* Ambient India Glow */}
            <div className="pointer-events-none absolute right-[26%] top-[42%] -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-blue-100/40 blur-[80px]" />

            {/* SVG Canvas */}
            <svg
              viewBox="0 0 800 420"
              className="w-full h-full object-contain relative z-10"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Blue Flight Arc Gradients */}
                <linearGradient id="orbit-blue-west" x1="565" y1="185" x2="160" y2="135" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.4" />
                </linearGradient>

                <linearGradient id="orbit-blue-uk" x1="565" y1="185" x2="395" y2="105" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.6" />
                </linearGradient>

                <linearGradient id="orbit-blue-uae" x1="565" y1="185" x2="492" y2="182" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.6" />
                </linearGradient>

                {/* Pulse Filter */}
                <filter id="blue-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 1. Dotted World Map Base */}
              <image
                href="/real-world-dots.svg"
                x="0"
                y="0"
                width="800"
                height="420"
                opacity="0.85"
              />

              {/* 2. ACCURATE INDIA GEOMETRY (52 Geo-Aligned Vibrant Dots) */}
              <g id="india-geometry-complete" fill="#2563EB">
                {/* Subtle soft blue aura */}
                <ellipse cx="568" cy="176" rx="40" ry="36" fill="#3B82F6" opacity="0.16" />

                {/* 1. Jammu & Kashmir, Ladakh, Siachen */}
                <circle cx="562.9" cy="136.3" r="2.8" />
                <circle cx="569.2" cy="136.3" r="2.8" />
                <circle cx="556.5" cy="144.1" r="2.8" />
                <circle cx="562.9" cy="144.1" r="2.8" />
                <circle cx="569.2" cy="144.1" r="2.8" />
                <circle cx="575.6" cy="144.1" r="2.8" />

                {/* 2. Punjab, Himachal, Uttarakhand, Haryana */}
                <circle cx="556.5" cy="151.9" r="2.8" />
                <circle cx="562.9" cy="151.9" r="2.8" />
                <circle cx="569.2" cy="151.9" r="2.8" />
                <circle cx="575.6" cy="151.9" r="2.8" />

                {/* 3. Rajasthan, Delhi NCR, Uttar Pradesh */}
                <circle cx="543.8" cy="159.7" r="2.8" />
                <circle cx="550.2" cy="159.7" r="2.8" />
                <circle cx="556.5" cy="159.7" r="2.8" />
                <circle cx="562.9" cy="159.7" r="2.8" />
                <circle cx="569.2" cy="159.7" r="2.8" />
                <circle cx="575.6" cy="159.7" r="2.8" />

                {/* 4. Gujarat, Madhya Pradesh, Bihar, West Bengal */}
                <circle cx="537.5" cy="167.5" r="2.8" />
                <circle cx="543.8" cy="167.5" r="2.8" />
                <circle cx="550.2" cy="167.5" r="2.8" />
                <circle cx="556.5" cy="167.5" r="2.8" />
                <circle cx="562.9" cy="167.5" r="2.8" />
                <circle cx="569.2" cy="167.5" r="2.8" />
                <circle cx="575.6" cy="167.5" r="2.8" />
                <circle cx="582.0" cy="167.5" r="2.8" />

                {/* 5. Northeast Corridor & Seven Sister States */}
                <circle cx="588.3" cy="167.5" r="2.8" />
                <circle cx="594.7" cy="167.5" r="2.8" />
                <circle cx="601.0" cy="167.5" r="2.8" />
                <circle cx="607.4" cy="167.5" r="2.8" />
                <circle cx="601.0" cy="175.3" r="2.8" />
                <circle cx="607.4" cy="175.3" r="2.8" />

                {/* 6. Maharashtra, Chhattisgarh, Odisha */}
                <circle cx="543.8" cy="175.3" r="2.8" />
                <circle cx="550.2" cy="175.3" r="2.8" />
                <circle cx="556.5" cy="175.3" r="2.8" />
                <circle cx="562.9" cy="175.3" r="2.8" />
                <circle cx="569.2" cy="175.3" r="2.8" />
                <circle cx="575.6" cy="175.3" r="2.8" />
                <circle cx="582.0" cy="175.3" r="2.8" />

                {/* 7. Goa, Karnataka, Telangana, Andhra Pradesh */}
                <circle cx="550.2" cy="183.1" r="2.8" />
                <circle cx="556.5" cy="183.1" r="2.8" />
                <circle cx="562.9" cy="183.1" r="2.8" />
                <circle cx="569.2" cy="183.1" r="2.8" />
                <circle cx="575.6" cy="183.1" r="2.8" />

                {/* 8. Kerala & Tamil Nadu */}
                <circle cx="556.5" cy="190.9" r="2.8" />
                <circle cx="562.9" cy="190.9" r="2.8" />
                <circle cx="569.2" cy="190.9" r="2.8" />

                {/* 9. Southern Tip (Kanyakumari) */}
                <circle cx="562.9" cy="198.7" r="2.8" />
              </g>

              {/* 3. Blue Arched Flight Paths (India -> USA, UK, UAE) */}
              <g fill="none">
                {/* Arc 1: India -> USA */}
                <path
                  d="M 565 185 C 430 40, 260 45, 160 135"
                  stroke="url(#orbit-blue-west)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />

                {/* Arc 2: India -> UK */}
                <path
                  d="M 565 185 Q 465 95 395 105"
                  stroke="url(#orbit-blue-uk)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />

                {/* Arc 3: India -> UAE */}
                <path
                  d="M 565 185 Q 532 208 492 182"
                  stroke="url(#orbit-blue-uae)"
                  strokeWidth="2"
                  strokeDasharray="3 4"
                />

                {/* Traveling glowing pulses along arcs */}
                <circle r="3" fill="#2563EB" filter="url(#blue-glow)">
                  <animateMotion
                    dur="4.8s"
                    repeatCount="indefinite"
                    path="M 565 185 C 430 40, 260 45, 160 135"
                  />
                </circle>
                <circle r="3" fill="#2563EB" filter="url(#blue-glow)">
                  <animateMotion
                    dur="3.2s"
                    repeatCount="indefinite"
                    path="M 565 185 Q 465 95 395 105"
                  />
                </circle>
              </g>

              {/* 4. Destination Nodes */}
              {/* USA (160, 135) */}
              <g>
                <circle cx="160" cy="135" r="7" fill="#EFF6FF" stroke="#2563EB" strokeWidth="1.5" />
                <circle cx="160" cy="135" r="3.2" fill="#2563EB" />
              </g>

              {/* UK (395, 105) */}
              <g>
                <circle cx="395" cy="105" r="7" fill="#EFF6FF" stroke="#2563EB" strokeWidth="1.5" />
                <circle cx="395" cy="105" r="3.2" fill="#2563EB" />
              </g>

              {/* UAE (492, 182) */}
              <g>
                <circle cx="492" cy="182" r="7" fill="#EFF6FF" stroke="#2563EB" strokeWidth="1.5" />
                <circle cx="492" cy="182" r="3.2" fill="#2563EB" />
              </g>

              {/* India Core Node (565, 185) */}
              <g>
                <circle
                  cx="565"
                  cy="185"
                  r="24"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="1.2"
                  opacity="0.3"
                  className="animate-ping"
                  style={{ transformOrigin: "565px 185px", animationDuration: "3s" }}
                />
                <circle cx="565" cy="185" r="7.5" fill="#2563EB" />
                <circle cx="565" cy="185" r="3" fill="#FFFFFF" />
              </g>

            </svg>

            {/* 5. FLOATING INDIA LAUNCH MARKET BADGE (Clean, without mock avatars) */}
            <div
              className="absolute top-[30%] left-[62%] sm:left-[64%] bg-white/95 backdrop-blur-md border border-blue-200/90 rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-[0_10px_25px_rgba(37,99,235,0.12),0_2px_8px_rgba(15,23,42,0.06)] flex items-center gap-2.5 z-20 transition-transform hover:scale-105"
            >
              <IndiaCircularFlag className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
              <div>
                <h4 className="text-xs font-bold leading-tight text-slate-900 font-sans">
                  India
                </h4>
                <p className="text-[10px] font-semibold text-blue-600 leading-tight mt-0.5">
                  Launch market
                </p>
              </div>
            </div>

            {/* 6. "India-first. Built for the world." CALLOUT WITH POINTER ARROW */}
            <div className="absolute bottom-[3%] sm:bottom-[6%] left-[49%] sm:left-[52%] flex flex-col items-center z-20 pointer-events-none">
              <svg width="44" height="34" viewBox="0 0 44 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M 20 30 C 24 20, 30 12, 38 4"
                  stroke="#2563EB"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 31 6 L 39 3 L 38 12"
                  stroke="#2563EB"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="text-center font-serif italic text-xs sm:text-[13px] font-bold text-[#2563EB] leading-tight bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-blue-100 shadow-2xs mt-0.5">
                <span>India-first.</span>
                <br />
                <span>Built for the world.</span>
              </div>
            </div>

          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT COLUMN: GLOBAL CAPABILITY EDITORIAL & REGIONS
              ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Header copy */}
            <div className="space-y-3.5">
              <span className="text-xs sm:text-[13px] font-mono font-bold tracking-widest text-[#2563EB] uppercase">
                GLOBAL CAPABILITY
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.12] font-sans">
                Built for India. <br />
                <span className="text-[#2563EB]">Ready for the world.</span>
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed pt-1 font-sans">
                India is the hardest linguistic market in the world. If our voice AI works here, it works anywhere. The same platform extends to the US, UK, UAE and beyond — with region-specific compliance, languages, and telephony providers.
              </p>
            </div>

            {/* Region Pills Matching Reference Design */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2">
              
              {/* India: Live now */}
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:border-blue-200 transition-colors">
                <IndiaCircularFlag className="w-6 h-6" />
                <div className="text-left">
                  <span className="text-xs font-bold block text-slate-900 leading-none">
                    India
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1 mt-1 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live now
                  </span>
                </div>
              </div>

              {/* USA: Coming soon */}
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-colors">
                <USACircularFlag className="w-6 h-6" />
                <div className="text-left">
                  <span className="text-xs font-bold block text-slate-900 leading-none">
                    USA
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 mt-1 block leading-none">
                    Coming soon
                  </span>
                </div>
              </div>

              {/* UK: Coming soon */}
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-colors">
                <UKCircularFlag className="w-6 h-6" />
                <div className="text-left">
                  <span className="text-xs font-bold block text-slate-900 leading-none">
                    UK
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 mt-1 block leading-none">
                    Coming soon
                  </span>
                </div>
              </div>

              {/* UAE: Coming soon */}
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-colors">
                <UAECircularFlag className="w-6 h-6" />
                <div className="text-left">
                  <span className="text-xs font-bold block text-slate-900 leading-none">
                    UAE
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 mt-1 block leading-none">
                    Coming soon
                  </span>
                </div>
              </div>

              {/* + more */}
              <span className="text-xs font-bold text-slate-400 px-2 py-1">
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
