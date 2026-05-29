"use client";

import Link from "next/link";

export default function RelatedPosts({ posts, currentPostId }) {
  const list = (posts || []).filter((p) => p && p.id !== currentPostId);
  if (!list.length) return null;

  return (
    <div className="rounded-2xl border border-border-subtle bg-trinetra-bg-secondary p-5">
      <div className="text-sm font-semibold text-trinetra-text">Related Articles</div>
      <div className="mt-4 space-y-3">
        {list.slice(0, 3).map((p) => (
          <Link
            key={p.id}
            href={`/blog/${p.slug}`}
            className="flex items-center gap-3 rounded-xl border border-border-subtle bg-trinetra-bg-tertiary p-3 hover:border-border-medium"
          >
            <div className="h-[60px] w-[60px] overflow-hidden rounded-xl bg-trinetra-bg-primary">
              {p.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_image} alt={p.title || "Related"} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-violet-500/25 via-cyan-500/10 to-gold-500/20" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-sm font-semibold text-trinetra-text">{p.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-trinetra-muted">
                {p.category ? <span>{p.category}</span> : null}
                <span className="text-trinetra-subtle">•</span>
                <span>{p.read_time || 1} min</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

