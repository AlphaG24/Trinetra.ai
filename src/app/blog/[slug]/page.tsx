"use client";

import { use } from "react";
import { Layout } from "@/components/layout/Layout";
import BlogPost from "@/src/components/pages/BlogPost";

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  return (
    <Layout>
      <BlogPost slug={slug} />
    </Layout>
  );
}
