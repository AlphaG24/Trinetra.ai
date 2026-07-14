"use client";

import { motion } from "framer-motion";
import { Clock, Eye, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { formatRelativeTime } from "@/utils/formatDate";
import { getCategoryColor, truncateText } from "@/utils/blogHelpers";

export default function BlogCard({ post, index = 0 }) {
  const router = useRouter();

  const onOpen = () => {
    if (!post?.slug) return;
    router.push(`/blog/${post.slug}`);
  };

  return (
    <motion.article 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -50px 0px" }}
      transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.05 }}
      whileHover={{ y: -6 }}
      onClick={onOpen}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[24px] border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent shadow-xl backdrop-blur-md transition-all duration-300 hover:border-violet-500/30 hover:shadow-[0_20px_50px_-20px_rgba(139,92,246,0.25)]"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0c0118]">
        {/* Cover image overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#080010]/80 via-transparent to-transparent opacity-60" />
        
        {post?.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={post.cover_image} 
            alt={post.title} 
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" 
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600/20 to-cyan-500/10 transition-transform duration-700 group-hover:scale-105">
            <span className="font-heading text-4xl font-bold text-violet-800/20">
              {(post?.title || 'T').charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {post?.category && (
          <div className="absolute left-5 top-5 z-20">
            <span className={`inline-flex rounded-lg border px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${getCategoryColor(post.category)}`}>
              {post.category}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col p-6 grow">
        {/* Metadata row */}
        <div className="mb-3 flex items-center gap-3 text-[12px] text-gray-500 font-medium">
          <span>{formatRelativeTime(post?.created_at)}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock size={12} className="text-violet-400" /> 
            {post?.read_time || 1} min read
          </span>
          {post?.views !== undefined && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Eye size={12} className="text-cyan-400" />
                {post.views} views
              </span>
            </>
          )}
        </div>

        <h3 className="mb-3 font-heading text-[22px] font-bold leading-[1.3] text-white tracking-tight line-clamp-2 transition-colors group-hover:text-violet-400">
          {post?.title || "Untitled Article"}
        </h3>
        
        <p className="mb-6 text-[14px] leading-relaxed text-[#A8A0C0] line-clamp-3">
          {truncateText(post?.excerpt || "", 150)}
        </p>

        {/* Card Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 overflow-hidden rounded-full border border-white/10 bg-white/5">
              {post?.author_avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.author_avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white bg-violet-600/40">
                  {(post?.author_name || "T").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-[13px] font-medium text-gray-300">{post?.author_name || 'Trinetra'}</span>
          </div>

          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-violet-400 group-hover:text-violet-300 transition-colors">
            Read Article
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </motion.article>
  );
}
