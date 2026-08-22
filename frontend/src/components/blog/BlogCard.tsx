'use client'

import { motion } from 'framer-motion'
import { Calendar, Clock, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

interface Post {
  id: string
  title: string
  slug: string
  excerpt: string
  cover_image_url?: string
  category?: string
  tags?: string[]
  author_name?: string
  author_avatar_url?: string
  read_time_minutes?: number
  published_at?: string
  created_at: string
}

interface BlogCardProps {
  post: Post
}

export default function BlogCard({ post }: BlogCardProps) {
  const publishDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : new Date(post.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-[#130324]/80 to-[#070010]/90 backdrop-blur-xl transition-all duration-300 hover:border-violet-500/30 hover:shadow-[0_12px_40px_rgba(124,58,237,0.15)]"
    >
      {/* Card Glow Effect */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-violet-600/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Cover Image Container */}
      <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/10] w-full overflow-hidden">
        {post.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1b0a2c] to-[#0a0214] text-zinc-600">
            No Cover Image
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070010]/80 via-transparent to-transparent" />

        {/* Category Badge */}
        {post.category && (
          <span className="absolute left-4 top-4 rounded-full border border-violet-500/30 bg-[#0c0118]/80 px-3.5 py-1 text-[11px] font-bold tracking-wider text-violet-300 uppercase backdrop-blur-md">
            {post.category}
          </span>
        )}
      </Link>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-6">
        {/* Date and Read Time */}
        <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400 mb-3.5">
          <span className="flex items-center gap-1.5">
            <Calendar size={13} className="text-violet-400" />
            {publishDate}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={13} className="text-violet-400" />
            {post.read_time_minutes || 1} min read
          </span>
        </div>

        {/* Post Title */}
        <Link href={`/blog/${post.slug}`} className="group/title block">
          <h3 className="font-display text-xl font-bold leading-snug text-white transition-colors duration-200 group-hover/title:text-violet-300 line-clamp-2">
            {post.title}
          </h3>
        </Link>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-zinc-400 line-clamp-2 font-medium">
            {post.excerpt}
          </p>
        )}

        {/* Author Metadata & View Action */}
        <div className="mt-auto pt-6 flex items-center justify-between border-t border-white/[0.05]">
          <div className="flex items-center gap-2.5 min-w-0">
            {post.author_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.author_avatar_url}
                alt={post.author_name || 'Author'}
                className="h-7 w-7 rounded-full border border-violet-500/20 object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600/20 text-[10px] font-bold text-violet-300">
                {(post.author_name || 'A').charAt(0)}
              </div>
            )}
            <span className="truncate text-xs font-bold text-zinc-200">
              {post.author_name || 'Trinetra AI'}
            </span>
          </div>

          <Link
            href={`/blog/${post.slug}`}
            className="flex items-center gap-1 text-xs font-extrabold text-violet-400 transition-colors group-hover:text-violet-300"
          >
            Read Article
            <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
