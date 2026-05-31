import { useEffect, useMemo, useRef, useState } from "react";

import { createBrowserClient } from "@/lib/supabase/client";

import useUserIdentifier from "./useUserIdentifier";

const supabase = createBrowserClient();

export default function useBlogPost(slug) {
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const userIdentifier = useUserIdentifier();
  const stableSlug = useMemo(() => String(slug || "").trim(), [slug]);
  const didTrackViewRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    didTrackViewRef.current = false;

    async function run() {
      if (!stableSlug) {
        setPost(null);
        setRelatedPosts([]);
        setLoading(false);
        setError("");
        return;
      }

      setLoading(true);
      setError("");
      setPost(null);
      setRelatedPosts([]);

      try {
        const { data, error: fetchError } = await supabase
          .from("blog_posts")
          .select(
            "id,title,slug,excerpt,content,cover_image,category,tags,author_name,author_avatar,status,featured,views,read_time,created_at,updated_at"
          )
          .eq("slug", stableSlug)
          .eq("status", "published")
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (cancelled) return;
        setPost(data || null);

        if (data?.category) {
          const { data: related, error: relatedError } = await supabase
            .from("blog_posts")
            .select(
              "id,title,slug,excerpt,cover_image,category,tags,author_name,author_avatar,featured,views,read_time,created_at"
            )
            .eq("status", "published")
            .eq("category", data.category)
            .neq("id", data.id)
            .order("created_at", { ascending: false })
            .limit(3);

          if (relatedError) throw relatedError;
          if (!cancelled) setRelatedPosts(related || []);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || "Failed to load the post.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [stableSlug]);

  useEffect(() => {
    if (!post?.id) return undefined;

    const channel = supabase
      .channel(`blog_post_${post.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blog_posts", filter: `id=eq.${post.id}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setPost(null);
            return;
          }

          const next = payload.new;
          if (next) setPost((prev) => ({ ...prev, ...next }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post?.id]);

  useEffect(() => {
    async function track() {
      if (!post?.id || !userIdentifier) return;
      if (didTrackViewRef.current) return;

      const sessionKey = `trinetra_blog_viewed_${post.id}`;
      try {
        if (window.sessionStorage.getItem(sessionKey)) return;
      } catch {
        // ignore
      }

      didTrackViewRef.current = true;

      try {
        await supabase.from("blog_views").insert({
          post_id: post.id,
          viewer_identifier: userIdentifier,
          viewed_at: new Date().toISOString(),
        });
      } catch {
        // ignore view insert errors (unique enforcement may exist elsewhere)
      }

      try {
        const nextViews = (post.views || 0) + 1;
        await supabase.from("blog_posts").update({ views: nextViews }).eq("id", post.id);
      } catch {
        // ignore view update errors
      }

      try {
        window.sessionStorage.setItem(sessionKey, "1");
      } catch {
        // ignore
      }
    }

    track();
  }, [post?.id, post?.views, userIdentifier]);

  return { post, relatedPosts, loading, error };
}

