"use client";

import { useEffect } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { RichTextRenderer } from "@/components/blog/RichTextRenderer";
import { Layout } from "@/components/layout/Layout";
import { usePublishedBlogPost } from "@/lib/site-content";

function formatPublishedDate(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const { data: post, loading } = usePublishedBlogPost(slug);

  useEffect(() => {
    if (!post?.title) {
      return;
    }

    document.title = `${post.title} — Trinetra AI`;
  }, [post]);

  return (
    <Layout>
      <section className="min-h-[calc(100vh-72px)] bg-[#080010] px-[20px] pb-[120px] pt-[140px]">
        <div className="mx-auto max-w-[840px]">
          {loading ? (
            <div className="rounded-[20px] border border-[#1E0A35] bg-[#130224] px-[24px] py-[32px] text-center font-sans text-[15px] text-[#A8A0C0]">
              Loading post...
            </div>
          ) : !post ? (
            <div className="rounded-[20px] border border-[#1E0A35] bg-[#130224] px-[24px] py-[32px] text-center">
              <p className="font-sans text-[16px] text-[#A8A0C0]">Post not found.</p>
              <Link
                href="/blog"
                className="mt-[16px] inline-flex font-sans text-[15px] text-[#A78BFA] transition-colors hover:text-[#F5F3FF]"
              >
                Back to Blog &larr;
              </Link>
            </div>
          ) : (
            <article className="rounded-[24px] border border-[#1E0A35] bg-[#130224] p-[24px] shadow-[0_0_40px_rgba(139,92,246,0.05)] md:p-[40px]">
              <div className="mb-[18px] flex flex-wrap items-center gap-[10px]">
                {post.category ? (
                  <span className="rounded-full border border-[rgba(139,92,246,0.15)] bg-[rgba(139,92,246,0.1)] px-[12px] py-[4px] font-sans text-[12px] font-medium text-[#A78BFA]">
                    {post.category}
                  </span>
                ) : null}
                {formatPublishedDate(post.publishedAt) ? (
                  <span className="font-sans text-[13px] text-[#6B6088]">
                    {formatPublishedDate(post.publishedAt)}
                  </span>
                ) : null}
                {post.readingTimeMinutes ? (
                  <span className="font-sans text-[13px] text-[#6B6088]">
                    {post.readingTimeMinutes} min read
                  </span>
                ) : null}
              </div>

              <h1 className="font-display text-[34px] font-bold leading-tight tracking-[-0.02em] text-[#F5F3FF] md:text-[44px]">
                {post.title}
              </h1>

              {post.coverImageUrl ? (
                <div
                  className="mt-[28px] h-[300px] w-full rounded-[20px] bg-cover bg-center md:h-[420px]"
                  style={{ backgroundImage: `url("${post.coverImageUrl}")` }}
                />
              ) : null}

              <div className="mt-[32px]">
                <RichTextRenderer content={post.content} />
              </div>

              <div className="mt-[40px]">
                <Link
                  href="/blog"
                  className="font-sans text-[15px] text-[#A78BFA] transition-colors hover:text-[#F5F3FF]"
                >
                  Back to Blog &larr;
                </Link>
              </div>
            </article>
          )}
        </div>
      </section>
    </Layout>
  );
}
