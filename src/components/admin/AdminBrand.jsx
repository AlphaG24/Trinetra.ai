"use client";

export default function AdminBrand({ size = "md", showText = true }) {
  const heightClass = size === "lg" ? "h-14" : size === "sm" ? "h-8" : "h-10";

  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-transparent.png"
        alt="Trinetra AI"
        className={`${heightClass} w-auto object-contain`}
      />
      {showText ? (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-gray-200">Blog Admin</span>
          <span className="text-[12px] text-gray-500">Content & community console</span>
        </div>
      ) : null}
    </div>
  );
}

