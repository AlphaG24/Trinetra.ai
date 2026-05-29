"use client";

import { motion } from "framer-motion";

import BlogCard from "./BlogCard";

function SkeletonCard({ index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: Math.min(0.2, index * 0.04) }}
      className="overflow-hidden rounded-2xl border border-border-subtle bg-trinetra-bg-secondary shadow-[0_0_40px_rgba(139,92,246,0.04)]"
    >
      <div className="h-[200px] w-full skeleton" />
      <div className="p-5">
        <div className="mb-3 flex gap-2">
          <div className="h-6 w-20 rounded-full skeleton" />
          <div className="h-6 w-14 rounded-full skeleton" />
        </div>
        <div className="h-6 w-full rounded-lg skeleton" />
        <div className="mt-2 h-6 w-5/6 rounded-lg skeleton" />
        <div className="mt-4 h-4 w-full rounded-lg skeleton" />
        <div className="mt-2 h-4 w-11/12 rounded-lg skeleton" />
        <div className="mt-5 flex items-center gap-2">
          <div className="h-7 w-7 rounded-full skeleton" />
          <div className="h-4 w-28 rounded-lg skeleton" />
        </div>
        <div className="mt-5 flex gap-4">
          <div className="h-4 w-12 rounded-lg skeleton" />
          <div className="h-4 w-10 rounded-lg skeleton" />
          <div className="h-4 w-10 rounded-lg skeleton" />
          <div className="h-4 w-14 rounded-lg skeleton" />
        </div>
      </div>
    </motion.div>
  );
}

export default function BlogGrid({ posts, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2 lg:gap-10">
        {Array.from({ length: 4 }).map((_, idx) => (
          <SkeletonCard key={idx} index={idx} />
        ))}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-border-subtle bg-trinetra-bg-secondary px-6 py-12 text-center">
        <motion.div 
          animate={{ y: [-5, 5, -5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border-medium bg-trinetra-bg-primary shadow-inner"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="10" y1="13" x2="14" y2="13"/></svg>
        </motion.div>
        
        <h3 className="mt-5 font-display text-xl font-semibold text-trinetra-text">No articles found</h3>
        <p className="mt-2 max-w-[480px] text-sm leading-relaxed text-trinetra-muted">
          Try adjusting your search or category filter. New posts will appear here as soon as they're published.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2 lg:gap-10">
      {posts.map((post, idx) => (
        <div key={post.id} className="h-full">
          <BlogCard post={post} index={idx} />
        </div>
      ))}
    </div>
  );
}
