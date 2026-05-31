"use client";

import { useEffect, useRef } from "react";

import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import { createBrowserClient } from "@/lib/supabase/client";

import useComments from "@/hooks/useComments";
import CommentCard from "./CommentCard";
import CommentForm from "./CommentForm";

const supabase = createBrowserClient();

function CommentSkeleton({ index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(0.18, index * 0.05) }}
      className="rounded-2xl border border-border-subtle bg-trinetra-bg-secondary p-5"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full skeleton" />
        <div className="flex-1">
          <div className="h-4 w-40 rounded-lg skeleton" />
          <div className="mt-3 h-4 w-full rounded-lg skeleton" />
          <div className="mt-2 h-4 w-11/12 rounded-lg skeleton" />
          <div className="mt-4 h-8 w-28 rounded-full skeleton" />
        </div>
      </div>
    </motion.div>
  );
}

export default function CommentsSection({ postId }) {
  const { comments, commentCount, addComment, likeComment, loading, sortBy, setSortBy } =
    useComments(postId);

  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (!postId) return undefined;

    const channel = supabase
      .channel(`blog_comments_toast_${postId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "blog_comments", filter: `post_id=eq.${postId}` },
        (payload) => {
          if (!initialLoadRef.current) return;
          const name = payload?.new?.user_name;
          toast(`New comment${name ? ` from ${name}` : ""}`);
        }
      )
      .subscribe();

    initialLoadRef.current = true;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-trinetra-text">
          Comments <span className="text-trinetra-subtle">({commentCount})</span>
        </h2>
        <div className="flex items-center gap-2 text-sm text-trinetra-muted">
          <span>Sort by:</span>
          <button
            type="button"
            onClick={() => setSortBy("newest")}
            className={[
              "rounded-full px-3 py-1 font-semibold",
              sortBy === "newest"
                ? "bg-violet-500/15 text-violet-200"
                : "border border-border-subtle bg-trinetra-bg-secondary hover:border-border-medium hover:text-trinetra-text",
            ].join(" ")}
          >
            Newest
          </button>
          <button
            type="button"
            onClick={() => setSortBy("oldest")}
            className={[
              "rounded-full px-3 py-1 font-semibold",
              sortBy === "oldest"
                ? "bg-violet-500/15 text-violet-200"
                : "border border-border-subtle bg-trinetra-bg-secondary hover:border-border-medium hover:text-trinetra-text",
            ].join(" ")}
          >
            Oldest
          </button>
        </div>
      </div>

      <div className="mt-5">
        <CommentForm postId={postId} parentId={null} addComment={addComment} />
      </div>

      <div className="my-6 h-px w-full bg-border-subtle" />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <CommentSkeleton key={idx} index={idx} />
          ))}
        </div>
      ) : !comments.length ? (
        <div className="rounded-2xl border border-border-subtle bg-trinetra-bg-secondary p-8 text-center text-sm text-trinetra-muted">
          Be the first to comment!
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {comments.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
              >
                <CommentCard comment={c} postId={postId} addComment={addComment} likeComment={likeComment} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

