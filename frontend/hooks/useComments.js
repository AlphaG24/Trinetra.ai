import { useCallback, useEffect, useMemo, useState } from "react";

import { createBrowserClient } from "@/lib/supabase/client";

const supabase = createBrowserClient();

function buildThreads(rows) {
  const top = [];
  const childrenByParent = new Map();

  for (const row of rows) {
    if (row.parent_id) {
      const arr = childrenByParent.get(row.parent_id) || [];
      arr.push(row);
      childrenByParent.set(row.parent_id, arr);
    } else {
      top.push(row);
    }
  }

  return top.map((comment) => ({
    ...comment,
    replies: childrenByParent.get(comment.id) || [],
  }));
}

export default function useComments(postId) {
  const stablePostId = useMemo(() => String(postId || ""), [postId]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");

  const fetchComments = useCallback(async () => {
    if (!stablePostId) return;

    const ascending = sortBy === "oldest";
    const { data, error } = await supabase
      .from("blog_comments")
      .select(
        "id,post_id,parent_id,user_name,user_email,user_avatar,content,is_approved,likes,created_at"
      )
      .eq("post_id", stablePostId)
      .eq("is_approved", true)
      .order("created_at", { ascending });

    if (error) throw error;
    setComments(buildThreads(data || []));
  }, [stablePostId, sortBy]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!stablePostId) {
        setComments([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await fetchComments();
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
  }, [stablePostId, fetchComments]);

  useEffect(() => {
    if (!stablePostId) return undefined;

    const channel = supabase
      .channel(`blog_comments_${stablePostId}_${sortBy}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blog_comments", filter: `post_id=eq.${stablePostId}` },
        async () => {
          try {
            await fetchComments();
          } catch {
            // ignore
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stablePostId, fetchComments, sortBy]);

  const addComment = useCallback(
    async ({ postId: pid, parentId, userName, userEmail, content }) => {
      const payload = {
        post_id: pid,
        parent_id: parentId || null,
        user_name: userName,
        user_email: userEmail || "",
        user_avatar: userEmail
          ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userEmail)}`
          : "",
        content,
        is_approved: true,
        likes: 0,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("blog_comments")
        .insert(payload)
        .select(
          "id,post_id,parent_id,user_name,user_email,user_avatar,content,is_approved,likes,created_at"
        )
        .single();

      if (error) throw error;
      await fetchComments();
      return data;
    },
    [fetchComments]
  );

  const likeComment = useCallback(async (commentId) => {
    const { data, error } = await supabase
      .from("blog_comments")
      .select("id,likes")
      .eq("id", commentId)
      .maybeSingle();

    if (error) throw error;
    const nextLikes = (data?.likes || 0) + 1;

    const { error: updateError } = await supabase
      .from("blog_comments")
      .update({ likes: nextLikes })
      .eq("id", commentId);

    if (updateError) throw updateError;
    await fetchComments();
  }, [fetchComments]);

  const commentCount = useMemo(() => {
    let count = 0;
    for (const c of comments) {
      count += 1;
      count += (c.replies || []).length;
    }
    return count;
  }, [comments]);

  return { comments, commentCount, addComment, likeComment, loading, sortBy, setSortBy };
}

