"use client";

import { useMemo, useState } from "react";

import toast from "react-hot-toast";

export default function CommentForm({
  postId,
  parentId = null,
  onSuccess,
  onCancel,
  addComment,
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const errors = useMemo(() => {
    const next = {};
    if (!name.trim() || name.trim().length < 2) next.name = "Name must be at least 2 characters.";
    if (!content.trim() || content.trim().length < 10) next.content = "Comment must be at least 10 characters.";
    if (content.length > 1000) next.content = "Comment must be 1000 characters or less.";
    return next;
  }, [name, content]);

  const canSubmit = Object.keys(errors).length === 0 && !submitting;

  const onSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    if (typeof addComment !== "function") {
      toast.error("Comments are unavailable right now.");
      return;
    }

    setSubmitting(true);
    try {
      await addComment({
        postId,
        parentId,
        userName: name.trim(),
        userEmail: email.trim(),
        content: content.trim(),
      });

      setName("");
      setEmail("");
      setContent("");
      setTouched(false);
      toast.success("Comment posted! 🎉");
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err?.message || "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border-subtle bg-trinetra-bg-secondary p-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-trinetra-muted">Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            className="mt-2 h-11 w-full rounded-xl border border-border-subtle bg-trinetra-bg-primary px-3 text-sm text-trinetra-text outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            placeholder="Your name"
          />
          {touched && errors.name ? <div className="mt-1 text-xs text-red-300">{errors.name}</div> : null}
        </div>
        <div>
          <label className="block text-xs font-semibold text-trinetra-muted">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-border-subtle bg-trinetra-bg-primary px-3 text-sm text-trinetra-text outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            placeholder="you@example.com"
          />
          <div className="mt-1 text-[11px] text-trinetra-subtle">Used for avatar only.</div>
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-xs font-semibold text-trinetra-muted">Comment *</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={() => setTouched(true)}
          rows={4}
          className="mt-2 w-full resize-none rounded-xl border border-border-subtle bg-trinetra-bg-primary px-3 py-3 text-sm text-trinetra-text outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          placeholder="Write your comment..."
          maxLength={1000}
        />
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-trinetra-subtle">
          <span>{content.length}/1000</span>
          {touched && errors.content ? <span className="text-red-300">{errors.content}</span> : <span />}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-violet-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-violet-500/40"
        >
          {submitting ? "Posting..." : parentId ? "Post Reply" : "Post Comment"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border-subtle bg-trinetra-bg-tertiary px-4 text-sm font-semibold text-trinetra-muted hover:border-border-medium hover:text-trinetra-text"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

