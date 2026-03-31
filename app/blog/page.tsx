"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import Link from "next/link";
import { PenLine } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { getBlogExcerpt, usePublishedBlogPosts } from "@/lib/site-content";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function BlogPage() {
  const { data: posts } = usePublishedBlogPosts();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!emailPattern.test(email.trim())) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          source: "blog",
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setStatus("error");
        setMessage(payload?.error || "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setMessage("You're on the list! We'll notify you when we publish.");
      setEmail("");
    } catch (error) {
      console.error("Failed to submit blog signup", error);
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  if (posts.length > 0) {
    return (
      <Layout>
        <section className="min-h-[calc(100vh-72px)] bg-[#080010] px-[20px] pb-[120px] pt-[140px]">
          <div className="mx-auto max-w-[1180px]">
            <div className="mx-auto mb-[48px] max-w-[720px] text-center">
              <div className="mx-auto mb-[24px] flex h-[96px] w-[96px] items-center justify-center rounded-full border border-[#1E0A35] bg-[#130224] text-[#6B6088]">
                <PenLine size={64} strokeWidth={1.5} />
              </div>
              <h1 className="font-display text-[36px] font-bold tracking-[-0.02em] text-[#F5F3FF] md:text-[44px]">
                Trinetra AI Blog
              </h1>
              <p className="mt-[16px] font-sans text-[16px] leading-[1.7] text-[#A8A0C0]">
                Insights on AI, automation, and building smarter businesses.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-[24px] md:grid-cols-2">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="overflow-hidden rounded-[20px] border border-[#1E0A35] bg-[#130224] shadow-[0_0_40px_rgba(139,92,246,0.05)] transition-colors duration-300 hover:border-[#2D1255]"
                >
                  {post.coverImageUrl ? (
                    <div
                      className="h-[220px] w-full bg-cover bg-center"
                      style={{ backgroundImage: `url("${post.coverImageUrl}")` }}
                    />
                  ) : null}
                  <div className="p-[24px]">
                    <div className="mb-[12px] flex flex-wrap items-center gap-[10px]">
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

                    <h2 className="font-display text-[24px] font-semibold leading-tight text-[#F5F3FF]">
                      {post.title}
                    </h2>
                    <p className="mt-[14px] font-sans text-[15px] leading-[1.7] text-[#A8A0C0]">
                      {getBlogExcerpt(post)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="min-h-[calc(100vh-72px)] bg-[#080010] px-[20px] pb-[120px] pt-[140px]">
        <div className="mx-auto flex max-w-[720px] flex-col items-center text-center">
          <div className="flex h-[96px] w-[96px] items-center justify-center rounded-full border border-[#1E0A35] bg-[#130224] text-[#6B6088]">
            <PenLine size={64} strokeWidth={1.5} />
          </div>

          <h1 className="mt-[28px] font-display text-[36px] font-bold tracking-[-0.02em] text-[#F5F3FF] md:text-[44px]">
            Blog Coming Soon
          </h1>

          <p className="mt-[16px] max-w-[500px] font-sans text-[16px] leading-[1.7] text-[#A8A0C0]">
            We&apos;re writing our first articles. Stay tuned for insights on AI, automation,
            and building smarter businesses.
          </p>

          <div className="mt-[36px] w-full max-w-[560px] rounded-[20px] border border-[#1E0A35] bg-[#130224] p-[24px] shadow-[0_0_40px_rgba(139,92,246,0.05)]">
            {status === "success" ? (
              <p className="text-center font-sans text-[15px] font-medium text-[#10B981]">
                {message}
              </p>
            ) : (
              <form className="flex flex-col gap-[14px] sm:flex-row sm:items-center" onSubmit={handleSubmit}>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  className="h-[52px] flex-1 rounded-[12px] border border-[#1E0A35] bg-[#0C0118] px-[16px] font-sans text-[15px] text-[#F5F3FF] placeholder:text-[#6B6088] focus:border-[#8B5CF6] focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)]"
                  aria-label="Email address"
                />
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="h-[52px] rounded-[12px] bg-[#F59E0B] px-[22px] font-sans text-[15px] font-semibold text-[#080010] transition-all duration-300 hover:bg-[#D97706] disabled:cursor-not-allowed disabled:bg-[#A8A0C0]"
                >
                  {status === "submitting" ? "Submitting..." : "Notify Me ->"}
                </button>
              </form>
            )}

            {status === "error" ? (
              <p className="mt-[14px] text-center font-sans text-[14px] text-[#EF4444]">{message}</p>
            ) : null}
          </div>
        </div>
      </section>
    </Layout>
  );
}
