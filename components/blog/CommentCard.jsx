"use client";

import { useMemo, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, ThumbsUp } from "lucide-react";
import toast from "react-hot-toast";

import { formatRelativeTime } from "@/utils/formatDate";
import CommentForm from "./CommentForm";

function colorFromName(name) {
  const colors = [
    "bg-violet-500/20 text-violet-200 border-violet-500/20",
    "bg-cyan-500/20 text-cyan-200 border-cyan-500/20",
    "bg-emerald-500/20 text-emerald-200 border-emerald-500/20",
    "bg-amber-500/20 text-amber-200 border-amber-500/20",
    "bg-pink-500/20 text-pink-200 border-pink-500/20",
  ];

  const s = String(name || "x");
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

export default function CommentCard({ comment, postId, addComment, likeComment }) {
  const [showReply, setShowReply] = useState(false);
  const [showReplies, setShowReplies] = useState(true);

  const name = comment?.user_name || "Anonymous";
  const initial = name.slice(0, 1).toUpperCase();
  const avatarColor = useMemo(() => colorFromName(name), [name]);

  const isReply = Boolean(comment?.parent_id);
  const replies = Array.isArray(comment?.replies) ? comment.replies : [];

  const isNew = useMemo(() => {
    const rel = formatRelativeTime(comment?.created_at);
    return rel === "just now" || rel.includes("minute");
  }, [comment?.created_at]);

  const onLike = async () => {
    if (typeof likeComment !== "function") return;
    try {
      await likeComment(comment.id);
    } catch (err) {
      toast.error(err?.message || "Failed to like comment.");
    }
  };

  return (
    <div className={`${isReply ? "pl-4" : ""}`}>
      <div className="rounded-2xl border border-border-subtle bg-trinetra-bg-secondary p-5">
        <div className="flex items-start gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded-full border ${avatarColor}`}>
            <span className="text-sm font-bold">{initial}</span>
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold text-trinetra-text">{name}</div>
              <div className="text-xs text-trinetra-subtle">{formatRelativeTime(comment?.created_at)}</div>
              {isNew ? (
                <span className="ml-1 inline-flex items-center rounded-full border border-gold-500/25 bg-gold-500/15 px-2 py-0.5 text-[11px] font-semibold text-gold-300">
                  New
                </span>
              ) : null}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-trinetra-muted">
              {comment?.content}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-trinetra-muted">
              <button
                type="button"
                onClick={onLike}
                className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-trinetra-bg-tertiary px-3 py-1.5 hover:border-border-medium hover:text-trinetra-text"
              >
                <ThumbsUp size={14} />
                Like {comment?.likes ? `(${comment.likes})` : ""}
              </button>

              {!isReply ? (
                <button
                  type="button"
                  onClick={() => setShowReply((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-trinetra-bg-tertiary px-3 py-1.5 hover:border-border-medium hover:text-trinetra-text"
                >
                  <MessageSquare size={14} />
                  Reply
                </button>
              ) : null}

              {replies.length ? (
                <button
                  type="button"
                  onClick={() => setShowReplies((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-trinetra-bg-tertiary px-3 py-1.5 hover:border-border-medium hover:text-trinetra-text"
                >
                  {showReplies ? "▼" : "►"} View {replies.length} repl{replies.length === 1 ? "y" : "ies"}
                </button>
              ) : null}
            </div>

            <AnimatePresence>
              {showReply ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                  className="mt-4"
                >
                  <CommentForm
                    postId={postId}
                    parentId={comment.id}
                    addComment={addComment}
                    onCancel={() => setShowReply(false)}
                    onSuccess={() => setShowReply(false)}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {replies.length && showReplies ? (
        <div className="mt-3 space-y-3">
          {replies.map((r) => (
            <CommentCard key={r.id} comment={r} postId={postId} addComment={addComment} likeComment={likeComment} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
