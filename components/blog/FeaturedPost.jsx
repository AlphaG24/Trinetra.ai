"use client";

import { motion } from "framer-motion";
import { ArrowRight, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FeaturedPost({ post }) {
  const router = useRouter();

  if (!post) return null;

  const truncateText = (text, maxLength) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getCategoryColor = (cat) => {
    switch(cat?.toLowerCase()) {
      case 'technology': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'business': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'ai & ml': return 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30';
      case 'design': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      default: return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative z-20 mx-auto w-full max-w-[1600px] px-8 -mt-[80px]"
    >
      <div 
        onClick={() => router.push(`/blog/${post.slug}`)}
        className="group flex cursor-pointer flex-col overflow-hidden rounded-[24px] border border-violet-500/30 bg-[linear-gradient(135deg,rgba(124,58,237,0.15)_0%,rgba(0,0,0,0.6)_100%)] shadow-[0_25px_50px_rgba(0,0,0,0.5),0_0_0_1px_rgba(124,58,237,0.1)] backdrop-blur-[20px] transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/50 hover:shadow-[0_30px_60px_rgba(0,0,0,0.6),0_0_20px_rgba(124,58,237,0.2)] md:flex-row"
      >
        {/* Left Column: Image */}
        <div className="relative w-full md:w-[45%] h-[240px] md:h-[320px] overflow-hidden bg-black/40">
          {post.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={post.cover_image} 
              alt={post.title} 
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" 
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-600/30 via-black to-cyan-500/20 transition-colors duration-500 group-hover:from-violet-500/40" />
          )}
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-r from-transparent to-[#0a0008]/80 max-md:hidden" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0008]/80 to-transparent md:hidden" />
        </div>

        {/* Right Column: Content */}
        <div className="flex w-full flex-col justify-center p-6 md:w-[55%] md:p-10">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded border border-gold-500/30 bg-gold-500/10 px-2.5 py-1 pt-[5px] text-[11px] font-bold uppercase tracking-wider text-gold-400">
              ⭐ Featured Article
            </span>
            {post.category && (
              <span className={`inline-flex items-center rounded border px-2.5 py-1 pt-[5px] text-[11px] font-bold uppercase tracking-wider ${getCategoryColor(post.category)}`}>
                {post.category}
              </span>
            )}
          </div>

          <h2 className="font-display text-2xl font-bold leading-tight text-white md:text-3xl line-clamp-3 mb-3">
            {post.title}
          </h2>

          <p className="text-[15px] leading-relaxed text-gray-400 line-clamp-3 mb-6">
            {truncateText(post.excerpt, 150)}
          </p>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 overflow-hidden rounded-full border border-white/10 bg-white/5">
                {post.author_avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.author_avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white">{post.author_name?.[0]?.toUpperCase() || 'T'}</div>
                )}
              </div>
              <div className="flex items-center gap-2 text-[13px] text-gray-500">
                <span className="font-medium text-gray-300">{post.author_name || 'Admin'}</span>
                <span>·</span>
                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {post.read_time || 1} min read</span>
              </div>
            </div>

            <button className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-2 text-[13px] font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]">
              Read Article <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
