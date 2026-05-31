import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createBrowserClient } from "@/lib/supabase/client";

const PAGE_SIZE = 9;

const supabase = createBrowserClient();

async function countForFilters({ category, searchQuery }) {
  let query = supabase
    .from("blog_posts")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  if (category && category !== "All") {
    query = query.eq("category", category);
  }

  const q = String(searchQuery || "").trim();
  if (q) {
    query = query.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function fetchStatsForPost(postId) {
  const [{ count: likeCount, error: likeError }, { count: commentCount, error: commentError }] =
    await Promise.all([
      supabase
        .from("blog_likes")
        .select("id", { count: "exact", head: true })
        .eq("post_id", postId),
      supabase
        .from("blog_comments")
        .select("id", { count: "exact", head: true })
        .eq("post_id", postId)
        .eq("is_approved", true),
    ]);

  if (likeError) throw likeError;
  if (commentError) throw commentError;

  return { likeCount: likeCount || 0, commentCount: commentCount || 0 };
}

async function enrichPosts(posts) {
  const enriched = await Promise.all(
    posts.map(async (post) => {
      try {
        const stats = await fetchStatsForPost(post.id);
        return { ...post, _likeCount: stats.likeCount, _commentCount: stats.commentCount };
      } catch {
        return { ...post, _likeCount: 0, _commentCount: 0 };
      }
    })
  );

  return enriched;
}

export default function useBlogPosts({ category, searchQuery, sortBy }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  const loadedCountRef = useRef(0);
  const filterKey = useMemo(
    () =>
      JSON.stringify({
        category: category || "All",
        searchQuery: String(searchQuery || ""),
        sortBy: sortBy || "newest",
      }),
    [category, searchQuery, sortBy]
  );

  const sortConfig = useMemo(() => {
    if (sortBy === "oldest") return { column: "created_at", ascending: true };
    if (sortBy === "popular") return { column: "views", ascending: false };
    return { column: "created_at", ascending: false };
  }, [sortBy]);

  const fetchPage = useCallback(
    async ({ pageIndex, replace }) => {
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("blog_posts")
        .select(
          "id,title,slug,excerpt,content,cover_image,category,tags,author_name,author_avatar,status,featured,views,read_time,created_at,updated_at"
        )
        .eq("status", "published")
        .order(sortConfig.column, { ascending: sortConfig.ascending })
        .range(from, to);

      if (category && category !== "All") {
        query = query.eq("category", category);
      }

      const q = String(searchQuery || "").trim();
      if (q) {
        query = query.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const enriched = await enrichPosts(data || []);

      setPosts((prev) => {
        const next = replace ? enriched : [...prev, ...enriched];
        loadedCountRef.current = next.length;
        return next;
      });

      setPage(pageIndex);
    },
    [category, searchQuery, sortConfig]
  );

  const refetchLoaded = useCallback(async () => {
    const totalLoaded = loadedCountRef.current;
    if (!totalLoaded) return;

    let query = supabase
      .from("blog_posts")
      .select(
        "id,title,slug,excerpt,content,cover_image,category,tags,author_name,author_avatar,status,featured,views,read_time,created_at,updated_at"
      )
      .eq("status", "published")
      .order(sortConfig.column, { ascending: sortConfig.ascending })
      .range(0, totalLoaded - 1);

    if (category && category !== "All") {
      query = query.eq("category", category);
    }

    const q = String(searchQuery || "").trim();
    if (q) {
      query = query.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`);
    }

    const { data, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    const enriched = await enrichPosts(data || []);
    setPosts(enriched);
  }, [category, searchQuery, sortConfig]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      setPosts([]);
      setPage(0);
      loadedCountRef.current = 0;

      try {
        const [count] = await Promise.all([
          countForFilters({ category, searchQuery }),
          fetchPage({ pageIndex: 0, replace: true }),
        ]);

        if (!cancelled) setTotalCount(count);
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || "Failed to load posts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [filterKey, category, searchQuery, fetchPage]);

  useEffect(() => {
    const channel = supabase
      .channel(`blog_posts_feed_${filterKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blog_posts" },
        async () => {
          try {
            const count = await countForFilters({ category, searchQuery });
            setTotalCount(count);
            await refetchLoaded();
          } catch {
            // ignore realtime errors
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterKey, category, searchQuery, refetchLoaded]);

  const hasMore = posts.length < totalCount;

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError("");

    try {
      await fetchPage({ pageIndex: page + 1, replace: false });
    } catch (err) {
      setError(err?.message || "Failed to load more posts.");
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, loading, loadingMore, page]);

  return {
    posts,
    loading,
    error,
    totalCount,
    loadMore,
    hasMore,
    loadingMore,
  };
}

