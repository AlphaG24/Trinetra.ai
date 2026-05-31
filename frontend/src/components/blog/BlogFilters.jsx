"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

export default function BlogFilters({
  categories,
  activeCategory,
  setActiveCategory,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  resultCount,
}) {
  const [localSearch, setLocalSearch] = useState(searchQuery || "");
  const debounceRef = useRef(null);

  const allCategories = useMemo(() => ["All", ...(categories || [])], [categories]);

  useEffect(() => {
    setLocalSearch(searchQuery || "");
  }, [searchQuery]);

  const hasActiveFilters = Boolean((searchQuery || "").trim()) || (activeCategory && activeCategory !== "All") || sortBy !== "newest";

  return (
    <div className="sticky top-[110px] z-40 w-full border-b border-white/5 bg-[#080010]/80 backdrop-blur-2xl transition-all duration-350">
      <div className="mx-auto w-full max-w-[1600px] px-8 py-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Search */}
          <div className="w-full lg:max-w-xl">
            <div className="relative group/search w-full">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within/search:text-violet-400"
              />
              <input
                value={localSearch}
                onChange={(e) => {
                  const next = e.target.value;
                  setLocalSearch(next);
                  if (debounceRef.current) window.clearTimeout(debounceRef.current);
                  debounceRef.current = window.setTimeout(() => setSearchQuery(next), 300);
                }}
                placeholder="Search articles, topics..."
                className="h-[56px] w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] pl-12 pr-12 text-[16px] text-white placeholder:text-gray-500 outline-none transition-all focus:border-violet-500/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(124,58,237,0.1)]"
              />
              {localSearch ? (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearch("");
                    setSearchQuery("");
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-1.5 text-gray-400 hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>

          {/* Meta + Sort + Clear */}
          <div className="flex flex-wrap items-center gap-4 lg:justify-end">
            <div className="hidden text-[14px] font-medium text-gray-500 xl:block">
              <span className="text-white">{resultCount || 0}</span> Articles Found
            </div>

            <div className="flex flex-1 items-center gap-3 min-w-0">
              <div className="relative flex-1 lg:flex-none">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-[48px] w-full lg:min-w-[180px] appearance-none rounded-2xl border border-white/[0.08] bg-white/[0.03] pl-5 pr-10 text-[14px] font-bold text-gray-300 outline-none transition-all hover:bg-white/[0.06] hover:border-violet-500/40 cursor-pointer"
                >
                  <option value="newest" className="bg-[#080010] text-white">Newest First</option>
                  <option value="oldest" className="bg-[#080010] text-white">Oldest First</option>
                  <option value="popular" className="bg-[#080010] text-white">Most Popular</option>
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </div>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory("All");
                    setSearchQuery("");
                    setSortBy("newest");
                  }}
                  className="h-[48px] rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 text-[14px] font-bold text-gray-400 transition-all hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-400"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mt-4 -mx-2 flex w-full items-center gap-2 overflow-x-auto px-2 pb-2 scrollbar-hide">
          {allCategories.map((cat) => {
            const active = cat === activeCategory;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={[
                  "relative whitespace-nowrap rounded-full px-5 py-2 text-[14px] font-medium transition-all duration-300",
                  active
                    ? "text-white shadow-[0_4px_15px_rgba(124,58,237,0.4)]"
                    : "border border-white/[0.06] bg-white/[0.03] text-gray-400 hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-white",
                ].join(" ")}
                style={active ? { background: "linear-gradient(135deg, #7c3aed, #8b5cf6)", border: "none" } : {}}
              >
                {cat}
                {active ? (
                  <motion.div
                    layoutId="activeCatIndicator"
                    className="absolute inset-0 rounded-full border border-white/20 pointer-events-none"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
