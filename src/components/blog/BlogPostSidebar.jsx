"use client";

import BlogStats from "./BlogStats";
import RelatedPosts from "./RelatedPosts";
import { SubscribeWidget } from "./SubscribeWidget";
import ShareButtons from "./ShareButtons";
import TableOfContents from "./TableOfContents";

export default function BlogPostSidebar({ post, relatedPosts }) {
  if (!post) return null;
  const hasRelated = Array.isArray(relatedPosts) && relatedPosts.length > 0;

  return (
    <aside className="sticky top-[80px] space-y-4">
      <BlogStats post={post} />
      <div className="h-px w-full bg-border-subtle" />
      <div className="rounded-2xl border border-border-subtle bg-trinetra-bg-secondary p-5">
        <div className="text-sm font-semibold text-trinetra-text">Share</div>
        <div className="mt-4">
          <ShareButtons post={post} orientation="vertical" />
        </div>
      </div>
      <div className="h-px w-full bg-border-subtle" />
      <TableOfContents content={post.content} />
      {hasRelated ? (
        <>
          <div className="h-px w-full bg-border-subtle" />
          <RelatedPosts posts={relatedPosts} currentPostId={post.id} />
        </>
      ) : null}
      <div className="h-px w-full bg-border-subtle" />
      <SubscribeWidget variant="sidebar" />
    </aside>
  );
}
