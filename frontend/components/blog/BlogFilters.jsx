"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";

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
    <div className="w-full mb-8 bg-white/[0.02] border border-white/[0.06] rounded-[24px] p-6 backdrop-blur-md">
      <div className="flex flex-col gap-5">
        
        {/* Top Row: Search and Sort */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search Box */}
          <div className="relative group/search flex-1 max-w-lg">
            <Search
              size={18}
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
              className="h-[48px] w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-11 pr-11 text-[14px] text-white placeholder:text-gray-500 outline-none transition-all focus:border-violet-500/60 focus:bg-white/[0.06]"
            />
            {localSearch ? (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch("");
                  setSearchQuery("");
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-1 text-gray-400 hover:text-white transition-colors"
                aria-label="Clear search"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>

          {/* Sort & Result Stats */}
          <div className="flex items-center justify-between md:justify-end gap-4">
            <div className="text-[13px] font-medium text-gray-400">
              <span className="text-white font-bold">{resultCount || 0}</span> Articles Found
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <SlidersHorizontal size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-[44px] min-w-[150px] appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] pl-10 pr-9 text-[13px] font-semibold text-gray-300 outline-none transition-all hover:bg-white/[0.05] hover:border-violet-500/30 cursor-pointer"
                >
                  <option value="newest" className="bg-[#0c0118] text-white">Newest First</option>
                  <option value="oldest" className="bg-[#0c0118] text-white">Oldest First</option>
                  <option value="popular" className="bg-[#0c0118] text-white">Most Popular</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
                  className="h-[44px] rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[13px] font-semibold text-gray-400 transition-all hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-400"
                >
                  Reset
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="h-px w-full bg-white/5" />

        {/* Categories Pills */}
        <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {allCategories.map((cat) => {
            const active = cat === activeCategory;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={[
                  "relative whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-semibold transition-all duration-200",
                  active
                    ? "text-white"
                    : "border border-white/[0.05] bg-white/[0.02] text-gray-400 hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-white",
                ].join(" ")}
                style={active ? { background: "linear-gradient(135deg, #7c3aed, #8b5cf6)", border: "none" } : {}}
              >
                {cat}
                {active ? (
                  <motion.div
                    layoutId="activeCatIndicator"
                    className="absolute inset-0 rounded-lg border border-white/10 pointer-events-none"
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
