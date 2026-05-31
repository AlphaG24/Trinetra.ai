import { useCallback, useEffect, useMemo, useState } from "react";

import { createBrowserClient } from "@/lib/supabase/client";

import useUserIdentifier from "./useUserIdentifier";

const supabase = createBrowserClient();

export default function useLikes(postId) {
  const userIdentifier = useUserIdentifier();
  const stablePostId = useMemo(() => String(postId || ""), [postId]);

  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!stablePostId) return;

    const [{ count, error: countError }, { data: likedRow, error: likedError }] =
      await Promise.all([
        supabase
          .from("blog_likes")
          .select("id", { count: "exact", head: true })
          .eq("post_id", stablePostId),
        userIdentifier
          ? supabase
              .from("blog_likes")
              .select("id")
              .eq("post_id", stablePostId)
              .eq("user_identifier", userIdentifier)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

    if (countError) throw countError;
    if (likedError) throw likedError;

    setLikeCount(count || 0);
    setIsLiked(Boolean(likedRow?.id));
  }, [stablePostId, userIdentifier]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!stablePostId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await refetch();
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [stablePostId, refetch]);

  useEffect(() => {
    if (!stablePostId) return undefined;

    const channel = supabase
      .channel(`blog_likes_${stablePostId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blog_likes", filter: `post_id=eq.${stablePostId}` },
        async () => {
          try {
            await refetch();
          } catch {
            // ignore
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stablePostId, refetch]);

  const toggleLike = useCallback(async () => {
    if (!stablePostId || !userIdentifier) return;
    setLoading(true);

    try {
      if (isLiked) {
        const { error } = await supabase
          .from("blog_likes")
          .delete()
          .eq("post_id", stablePostId)
          .eq("user_identifier", userIdentifier);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_likes").insert({
          post_id: stablePostId,
          user_identifier: userIdentifier,
          created_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      await refetch();
    } finally {
      setLoading(false);
    }
  }, [isLiked, refetch, stablePostId, userIdentifier]);

  return { likeCount, isLiked, toggleLike, loading };
}

