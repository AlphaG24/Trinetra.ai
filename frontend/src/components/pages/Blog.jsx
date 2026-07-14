"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
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
    document.title = "Insights & Innovation Blog | Trinetra AI";
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

  // Popular posts extracted dynamically from the fetched list sorted by views
  const popularPosts = useMemo(() => {
    if (!posts || posts.length === 0) return [];
    return [...posts]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 3);
  }, [posts]);

  // Unique tags cloud extracted dynamically from active posts
  const allTags = useMemo(() => {
    if (!posts) return [];
    const tagsSet = new Set();
    posts.forEach(p => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach(t => tagsSet.add(t));
      }
    });
    return Array.from(tagsSet).slice(0, 10);
  }, [posts]);

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
      
      {/* Redesigned Blog Hero Header */}
      <BlogHero />

      {/* Main Grid: Left content column, Right sidebar widget column */}
      <main className="mx-auto max-w-[1600px] w-full px-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Main Content Block */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Featured Post Card (no negative margins, wide flow) */}
            <FeaturedPost post={featuredPost} />
            
            {/* Non-sticky Filters inside glass card container */}
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

            {error ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {/* Grid of Post Cards */}
            <div className="mt-8">
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
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-gradient-to-r from-violet-600 to-violet-500 px-8 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(124,58,237,0.2)] hover:shadow-[0_4px_30px_rgba(124,58,237,0.45)] hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70 transition-all duration-300"
                >
                  {loadingMore ? <Loader2 size={18} className="animate-spin" /> : null}
                  {loadingMore ? "Loading..." : "Load More Articles"}
                </motion.button>
              </div>
            ) : null}
          </div>

          {/* Right Sidebar Widget Column */}
          <aside className="lg:col-span-4 space-y-8">
            <div className="sticky top-[110px] space-y-8">
              
              {/* Newsletter subscription widget */}
              <SubscribeWidget variant="sidebar" />

              {/* Dynamic Popular Articles list */}
              {popularPosts.length > 0 && (
                <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-md">
                  <h3 className="font-heading text-lg font-bold text-white mb-5 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    Popular Articles
                  </h3>
                  <div className="space-y-4">
                    {popularPosts.map((p) => (
                      <div 
                        key={p.id} 
                        onClick={() => router.push(`/blog/${p.slug}`)}
                        className="flex gap-4 group cursor-pointer"
                      >
                        <div className="h-16 w-20 overflow-hidden rounded-xl bg-white/5 flex-shrink-0">
                          {p.cover_image ? (
                            <img src={p.cover_image} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="h-full w-full bg-violet-950/20" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <h4 className="text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-violet-400 transition-colors">
                            {p.title}
                          </h4>
                          <span className="text-[11px] text-gray-500 mt-1">
                            {new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Tags Cloud widget */}
              {allTags.length > 0 && (
                <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-md">
                  <h3 className="font-heading text-lg font-bold text-white mb-5 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    Trending Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSearchQuery(tag)}
                        className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-1.5 text-xs text-gray-400 hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-white transition-all duration-200"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

        </div>
      </main>
    </div>
  );
}
