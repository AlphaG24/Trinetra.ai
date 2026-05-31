"use client";

import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Toaster } from "react-hot-toast";

import { createBrowserClient } from "@/lib/supabase/client";

import BlogHero from "@/components/blog/BlogHero";
import FeaturedPost from "@/components/blog/FeaturedPost";
import BlogFilters from "@/components/blog/BlogFilters";
import BlogGrid from "@/components/blog/BlogGrid";
import { SubscribeWidget } from "@/components/blog/SubscribeWidget";
import ReadingProgress from "@/components/blog/ReadingProgress";
import useBlogPosts from "@/hooks/useBlogPosts";

const supabase = createBrowserClient();

export default function Blog() {
  const [category, setCategory] = useState(() => {
    try {
      if (typeof window === "undefined") return "All";
      const params = new URLSearchParams(window.location.search);
      return params.get("category") || "All";
    } catch {
      return "All";
    }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [categories, setCategories] = useState([]);
  const [featuredPost, setFeaturedPost] = useState(null);

  const { posts, loading, error, totalCount, hasMore, loadMore, loadingMore } = useBlogPosts({
    category,
    searchQuery,
    sortBy,
  });

  useEffect(() => {
    document.title = "Blog | Trinetra AI";
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // Fetch categories
        const { data: catData } = await supabase
          .from("blog_posts")
          .select("category")
          .eq("status", "published");

        if (!cancelled && catData) {
          const unique = Array.from(
            new Set((catData || []).map((r) => r.category).filter(Boolean))
          ).sort((a, b) => a.localeCompare(b));
          setCategories(unique);
        }

        // Fetch Featured Post
        const { data: featData } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("status", "published")
          .eq("featured", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (!cancelled && featData) {
          setFeaturedPost(featData);
        }
      } catch {
        // ignore
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const resultCount = useMemo(() => totalCount, [totalCount]);

  return (
    <div className="min-h-screen bg-trinetra-bg overflow-x-hidden">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#130224",
            color: "#F5F3FF",
            border: "1px solid #1E0A35",
          },
        }}
      />

      <ReadingProgress />
      <BlogHero featuredPost={featuredPost} />
      <FeaturedPost post={featuredPost} />

      <BlogFilters
        categories={categories}
        activeCategory={category}
        setActiveCategory={setCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        resultCount={resultCount}
      />

      <main className="mx-auto max-w-[1280px] w-full px-8 pb-32 pt-12">
        {error ? (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-10">
          <BlogGrid posts={posts} loading={loading} />
        </div>

        {hasMore ? (
          <div className="mt-16 flex justify-center">
            <motion.button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border-subtle bg-trinetra-bg-secondary px-6 text-sm font-semibold text-trinetra-text hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-70 transition-all duration-300"
            >
              {loadingMore ? <Loader2 size={18} className="animate-spin" /> : null}
              {loadingMore ? "Loading..." : "Load More Articles"}
            </motion.button>
          </div>
        ) : null}

        <div className="mt-24 mb-12">
          <SubscribeWidget variant="banner" />
        </div>
      </main>
    </div>
  );
}
