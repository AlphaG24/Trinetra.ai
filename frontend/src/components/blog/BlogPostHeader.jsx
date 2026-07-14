"use client";

import Link from "next/link";
import { Clock, Eye, Sparkles } from "lucide-react";

import { formatDate, isNew } from "../../utils/formatDate";
import { getCategoryColor } from "../../utils/blogHelpers";

export default function BlogPostHeader({ post }) {
  if (!post) return null;

  const tags = Array.isArray(post.tags) ? post.tags : [];

  return (
    <header className="w-full">
      <nav className="mb-6 text-sm text-trinetra-muted">
        <Link href="/" className="hover:text-trinetra-text">
          Home
        </Link>{" "}
        <span className="text-trinetra-subtle">/</span>{" "}
        <Link href="/blog" className="hover:text-trinetra-text">
          Blog
        </Link>{" "}
        {post.category ? (
          <>
            <span className="text-trinetra-subtle">/</span>{" "}
            <Link href={`/blog?category=${encodeURIComponent(post.category)}`} className="hover:text-trinetra-text">
              {post.category}
            </Link>{" "}
          </>
        ) : null}
        <span className="text-trinetra-subtle">/</span>{" "}
        <span className="text-trinetra-subtle">{post.title}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        {post.category ? (
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getCategoryColor(post.category)}`}>
            {post.category}
          </span>
        ) : null}
        {isNew(post.created_at) ? (
          <span className="inline-flex items-center rounded-full border border-gold-500/25 bg-gold-500/15 px-3 py-1 text-xs font-semibold text-gold-300">
            New
          </span>
        ) : null}
        {post.featured ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
            <Sparkles size={14} />
            Featured
          </span>
        ) : null}
        {tags.slice(0, 6).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full border border-border-subtle bg-trinetra-bg-tertiary px-3 py-1 text-xs font-medium text-trinetra-muted"
          >
            {tag}
          </span>
        ))}
      </div>

      <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-trinetra-text md:text-4xl">
        {post.title}
      </h1>

      {post.excerpt ? (
        <p className="mt-3 text-base leading-relaxed text-trinetra-muted md:text-lg">{post.excerpt}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-trinetra-muted">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 overflow-hidden rounded-full border border-border-subtle bg-trinetra-bg-primary">
            {post.author_avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author_avatar} alt={post.author_name || "Author"} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-trinetra-muted">
                {(post.author_name || "T").slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <span className="font-medium text-trinetra-text">{post.author_name || "Trinetra AI"}</span>
        </div>
        <span className="text-trinetra-subtle">|</span>
        <span>{formatDate(post.created_at)}</span>
        <span className="text-trinetra-subtle">|</span>
        <span className="inline-flex items-center gap-1">
          <Clock size={16} />
          {post.read_time || 1} min read
        </span>
        <span className="text-trinetra-subtle">|</span>
        <span className="inline-flex items-center gap-1">
          <Eye size={16} />
          {post.views ?? 0}
        </span>
      </div>

      {post.cover_image ? (
        <div className="mt-8 overflow-hidden rounded-2xl border border-border-subtle bg-trinetra-bg-secondary flex items-center justify-center"
             style={{ minHeight: '200px', maxHeight: '500px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.cover_image}
            alt={post.title || "Cover image"}
            className="max-h-[500px] w-auto max-w-full object-contain"
            loading="lazy"
          />
        </div>
      ) : null}
    </header>
  );
}

