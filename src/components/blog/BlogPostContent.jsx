"use client";

import { useEffect, useRef } from "react";

import { generateSlug } from "../../utils/blogHelpers";

function ensureHeadingIds(container) {
  if (!container) return;

  const headings = Array.from(container.querySelectorAll("h2, h3"));
  const used = new Map();

  for (const el of headings) {
    const text = (el.textContent || "").trim();
    if (!text) continue;

    const base = el.getAttribute("id") || generateSlug(text) || "section";
    const next = (used.get(base) || 0) + 1;
    used.set(base, next);
    const id = next === 1 ? base : `${base}-${next}`;
    el.setAttribute("id", id);
  }
}

function AuthorBox({ post }) {
  if (!post) return null;

  const name = post.author_name || "Trinetra AI";
  const avatar = post.author_avatar || "";
  const category = post.category ? `Writing about ${post.category}.` : "";
  const bio = `${name} shares insights on AI, automation, and building smarter businesses. ${category}`.trim();

  const links = [];
  if (post.author_twitter) links.push({ label: "X", href: post.author_twitter });
  if (post.author_linkedin) links.push({ label: "LinkedIn", href: post.author_linkedin });
  if (post.author_website) links.push({ label: "Website", href: post.author_website });

  return (
    <section className="mt-10 rounded-2xl border border-border-subtle bg-trinetra-bg-secondary p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-16 w-16 overflow-hidden rounded-2xl border border-border-subtle bg-trinetra-bg-primary">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-bold text-trinetra-muted">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-trinetra-subtle">
            Written by
          </div>
          <div className="mt-1 font-display text-lg font-semibold text-trinetra-text">{name}</div>
          <p className="mt-2 text-sm leading-relaxed text-trinetra-muted">{bio}</p>

          {links.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-border-subtle bg-trinetra-bg-tertiary px-3 py-1 text-xs font-medium text-trinetra-muted hover:border-border-medium hover:text-trinetra-text"
                >
                  {l.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default function BlogPostContent({ content, post }) {
  const ref = useRef(null);
  const html = String(content || "");

  useEffect(() => {
    ensureHeadingIds(ref.current);
  }, [content]);

  if (!html) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-trinetra-bg-secondary p-6 text-sm text-trinetra-muted">
        This article has no content.
      </div>
    );
  }

  return (
    <div>
      <div
        ref={ref}
        className="blog-content prose prose-invert max-w-none text-trinetra-text"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <AuthorBox post={post} />
    </div>
  );
}
