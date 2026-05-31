"use client";

import { motion } from "framer-motion";
import { Clock, Eye, Heart } from "lucide-react";
import { useRouter } from "next/navigation";

import { formatRelativeTime } from "../../utils/formatDate";
import { getCategoryColor, truncateText } from "../../utils/blogHelpers";

export default function BlogCard({ post, index = 0 }) {
  const router = useRouter();

  const onOpen = () => {
    if (!post?.slug) return;
    router.push(`/blog/${post.slug}`);
  };

  const likeCount = post?._likeCount ?? 0;

  return (
    <motion.article 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -50px 0px" }}
      transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      onClick={onOpen}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[20px] border border-white/5 bg-white/[0.02] transition-colors hover:border-violet-500/30 hover:bg-white/[0.04] hover:shadow-[0_15px_40px_-15px_rgba(124,58,237,0.3)] backdrop-blur-sm"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0a0008]">
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0a0008] via-transparent to-transparent opacity-80" />
        
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
            <span className="font-display text-4xl font-bold text-violet-800/20">
              {(post?.title || 'T').charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {post?.category && (
          <div className="absolute left-4 top-4 z-20">
            <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${getCategoryColor(post.category)}`}>
              {post.category}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col p-5 grow">
        <h3 className="mb-4 font-display text-[24px] font-black leading-[1.2] text-white line-clamp-2 transition-colors group-hover:text-violet-400">
          {post?.title || "Untitled Article"}
        </h3>
        
        <p className="mb-6 text-[14px] leading-relaxed text-gray-400 line-clamp-3">
          {truncateText(post?.excerpt || "", 150)}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-5 text-[13px]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 overflow-hidden rounded-full border border-white/10 bg-white/5">
              {post?.author_avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.author_avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
                  {(post?.author_name || "T").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-gray-300">{post?.author_name || 'Trinetra'}</span>
              <span className="text-[11px] text-gray-500">{formatRelativeTime(post?.created_at)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-gray-500">
            <span className="flex items-center gap-1"><Eye size={14} className="text-violet-400/70" /> {post?.views ?? 0}</span>
            <span className="flex items-center gap-1.5"><Clock size={14} className="text-cyan-400/70" /> {post?.read_time || 1}m</span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
