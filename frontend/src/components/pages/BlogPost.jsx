"use client";

import { useEffect, useMemo } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Toaster } from "react-hot-toast";

import BlogPostHeader from "@/components/blog/BlogPostHeader";
import BlogPostContent from "@/components/blog/BlogPostContent";
import BlogPostSidebar from "@/components/blog/BlogPostSidebar";
import CommentsSection from "@/components/blog/CommentsSection";
import LikeButton from "@/components/blog/LikeButton";
import ReactionBar from "@/components/blog/ReactionBar";
import ReadingProgress from "@/components/blog/ReadingProgress";
import ShareButtons from "@/components/blog/ShareButtons";
import useBlogPost from "@/hooks/useBlogPost";

function setMetaDescription(value) {
  if (typeof document === "undefined") return;
  const content = String(value || "").trim();
  if (!content) return;

  let tag = document.querySelector('meta[name="description"]');
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", "description");
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-16 pt-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="h-6 w-64 rounded-lg skeleton" />
          <div className="mt-4 h-12 w-full rounded-lg skeleton" />
          <div className="mt-2 h-12 w-5/6 rounded-lg skeleton" />
          <div className="mt-6 h-5 w-full rounded-lg skeleton" />
          <div className="mt-2 h-5 w-11/12 rounded-lg skeleton" />
          <div className="mt-8 h-[320px] w-full rounded-2xl skeleton" />
          <div className="mt-8 space-y-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="h-4 w-full rounded-lg skeleton" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-4">
          <div className="h-[460px] w-full rounded-2xl skeleton" />
        </div>
      </div>
    </div>
  );
}

export default function BlogPost({ slug: slugProp }) {
  const params = useParams();
  const slug = useMemo(() => slugProp || params?.slug || "", [params?.slug, slugProp]);

  const { post, relatedPosts, loading, error } = useBlogPost(slug);

  useEffect(() => {
    if (!post?.title) return;
    document.title = `${post.title} | Trinetra AI Blog`;
    setMetaDescription(post.excerpt || "");
  }, [post?.excerpt, post?.title]);

  return (
    <div className="min-h-screen bg-trinetra-bg">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#130224",
            color: "#F5F3FF",
            border: "1px solid #1E0A35",
          },
        }}
      />

      <ReadingProgress />

      {loading ? (
        <Skeleton />
      ) : !post ? (
        <div className="mx-auto max-w-[840px] px-5 pb-16 pt-16">
          <div className="rounded-2xl border border-border-subtle bg-trinetra-bg-secondary p-8 text-center">
            <div className="text-lg font-semibold text-trinetra-text">
              {error ? "Something went wrong" : "Post not found"}
            </div>
            <div className="mt-2 text-sm text-trinetra-muted">
              {error || "The article you\u2019re looking for doesn\u2019t exist or is not published."}
            </div>
            <Link
              href="/blog"
              className="mt-6 inline-flex rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-400"
            >
              Back to Blog
            </Link>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-[1180px] px-5 pb-16 pt-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <BlogPostHeader post={post} />

              <div className="mt-8 rounded-2xl border border-border-subtle bg-trinetra-bg-secondary p-6 md:p-8">
                <BlogPostContent content={post.content} post={post} />
              </div>

              <div className="mt-8">
                <ReactionBar postId={post.id} />
              </div>

              <LikeButton postId={post.id} />

              <div className="mt-2 rounded-2xl border border-border-subtle bg-trinetra-bg-secondary p-5">
                <div className="text-sm font-semibold text-trinetra-text">Share this article</div>
                <div className="mt-4">
                  <ShareButtons post={post} orientation="horizontal" />
                </div>
              </div>

              <CommentsSection postId={post.id} />
            </div>

            <div className="lg:col-span-4">
              <BlogPostSidebar post={post} relatedPosts={relatedPosts} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
