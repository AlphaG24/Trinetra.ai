"use client";

import { motion } from "framer-motion";
import { ArrowRight, Clock, Star } from "lucide-react";
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
      case 'technology': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'business': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'ai & ml': return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20';
      case 'design': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default: return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative z-20 mx-auto w-full mb-12"
    >
      <div 
        onClick={() => router.push(`/blog/${post.slug}`)}
        className="group flex cursor-pointer flex-col overflow-hidden rounded-[28px] border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-violet-500/30 hover:shadow-[0_30px_60px_rgba(0,0,0,0.5),0_0_30px_rgba(139,92,246,0.15)] md:flex-row"
      >
        {/* Left Column: Widescreen Image */}
        <div className="relative w-full md:w-[48%] h-[260px] md:h-[380px] overflow-hidden bg-black/35">
          {post.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={post.cover_image} 
              alt={post.title} 
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" 
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-violet-600/20 via-[#0c0118] to-cyan-500/10 transition-colors duration-500 group-hover:from-violet-500/30" />
          )}
          
          {/* Cover image gradient overlay for a cinematic blend */}
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-r from-transparent to-[#080010]/30 max-md:hidden" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#080010]/30 to-transparent md:hidden" />
        </div>

        {/* Right Column: Text & Content */}
        <div className="flex w-full flex-col justify-center p-6 md:w-[52%] md:p-10">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-lg border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-400">
              <Star size={11} className="fill-gold-400" /> Featured Article
            </span>
            {post.category && (
              <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getCategoryColor(post.category)}`}>
                {post.category}
              </span>
            )}
          </div>

          <h2 className="font-heading text-2xl font-bold leading-tight text-white md:text-3xl tracking-tight line-clamp-3 mb-4 group-hover:text-violet-400 transition-colors">
            {post.title}
          </h2>

          <p className="text-[14px] md:text-[15px] leading-relaxed text-[#A8A0C0] line-clamp-3 mb-6">
            {truncateText(post.excerpt, 180)}
          </p>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-white/5">
                {post.author_avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.author_avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white bg-violet-600/40">{post.author_name?.[0]?.toUpperCase() || 'T'}</div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-gray-300">{post.author_name || 'Trinetra'}</span>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                  <span>{new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {post.read_time || 1} min read</span>
                </div>
              </div>
            </div>

            <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_20px_rgba(124,58,237,0.3)] transition-all duration-300 hover:shadow-[0_4px_30px_rgba(124,58,237,0.55)] hover:scale-[1.02]">
              Read Article <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
