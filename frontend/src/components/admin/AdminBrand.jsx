"use client";

export default function AdminBrand({ size = "md", showText = true }) {
  const heightClass = size === "lg" ? "h-14" : size === "sm" ? "h-8" : "h-10";

  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-transparent.png"
        alt="Trinetra AI"
        className={`${heightClass} w-auto object-contain dynamic-logo`}
      />
      {showText ? (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-[var(--heading)] font-playfair">Blog Admin</span>
          <span className="text-[12px] text-[var(--text-muted)] font-merriweather">Content & community console</span>
        </div>
      ) : null}
    </div>
  );
}

