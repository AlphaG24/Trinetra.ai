import { useCallback, useEffect, useMemo, useState } from "react";

import { createBrowserClient } from "@/lib/supabase/client";

import useUserIdentifier from "./useUserIdentifier";

const supabase = createBrowserClient();

function groupReactions(rows) {
  const grouped = {
    love: 0,
    haha: 0,
    wow: 0,
    sad: 0,
    angry: 0,
    fire: 0,
  };

  for (const row of rows) {
    if (row?.reaction_type && Object.prototype.hasOwnProperty.call(grouped, row.reaction_type)) {
      grouped[row.reaction_type] += 1;
    }
  }

  return grouped;
}

export default function useReactions(postId) {
  const userIdentifier = useUserIdentifier();
  const stablePostId = useMemo(() => String(postId || ""), [postId]);

  const [reactions, setReactions] = useState({
    love: 0,
    haha: 0,
    wow: 0,
    sad: 0,
    angry: 0,
    fire: 0,
  });
  const [userReaction, setUserReaction] = useState(null);
  const [userReactionRowId, setUserReactionRowId] = useState(null);

  const refetch = useCallback(async () => {
    if (!stablePostId) return;

    const { data, error } = await supabase
      .from("blog_reactions")
      .select("id,user_identifier,reaction_type")
      .eq("post_id", stablePostId);

    if (error) throw error;
    const rows = data || [];

    setReactions(groupReactions(rows));

    const mine = userIdentifier ? rows.find((r) => r.user_identifier === userIdentifier) : null;
    setUserReaction(mine?.reaction_type || null);
    setUserReactionRowId(mine?.id || null);
  }, [stablePostId, userIdentifier]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        await refetch();
      } catch {
        // ignore
      } finally {
        if (cancelled) return;
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [refetch]);

  useEffect(() => {
    if (!stablePostId) return undefined;

    const channel = supabase
      .channel(`blog_reactions_${stablePostId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blog_reactions", filter: `post_id=eq.${stablePostId}` },
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

  const toggleReaction = useCallback(
    async (reactionType) => {
      if (!stablePostId || !userIdentifier) return;

      if (userReaction && userReaction === reactionType) {
        const { error } = await supabase
          .from("blog_reactions")
          .delete()
          .eq("post_id", stablePostId)
          .eq("user_identifier", userIdentifier);
        if (error) throw error;
        await refetch();
        return;
      }

      if (userReaction && userReactionRowId) {
        const { error } = await supabase
          .from("blog_reactions")
          .update({ reaction_type: reactionType })
          .eq("id", userReactionRowId);
        if (error) throw error;
        await refetch();
        return;
      }

      const { error } = await supabase.from("blog_reactions").insert({
        post_id: stablePostId,
        user_identifier: userIdentifier,
        reaction_type: reactionType,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      await refetch();
    },
    [refetch, stablePostId, userIdentifier, userReaction, userReactionRowId]
  );

  const totalReactions = Object.values(reactions).reduce((sum, n) => sum + (n || 0), 0);

  return { reactions, userReaction, toggleReaction, totalReactions };
}

