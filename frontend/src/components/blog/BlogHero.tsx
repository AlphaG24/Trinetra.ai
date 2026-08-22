'use client'

import { motion } from 'framer-motion'
import { Calendar, Clock, ArrowRight } from 'lucide-react'
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

interface BlogHeroProps {
  post: Post | null
}

export default function BlogHero({ post }: BlogHeroProps) {
  const publishDate = post
    ? post.published_at
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
    : ''

  return (
    <div className="relative overflow-hidden pt-12 pb-16">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[500px] w-[1000px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-[1600px] px-8 text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-violet-300">
            Insights & Guides
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl">
            Trinetra <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">AI Blog</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg md:text-xl text-zinc-400 font-medium">
            Insights on AI Voice Agents, Automation & Business Growth
          </p>
        </motion.div>
      </div>

      {post && (
        <div className="mx-auto max-w-[1600px] px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="group relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-gradient-to-b from-[#130324]/75 to-[#070010]/90 p-6 md:p-8 backdrop-blur-xl hover:border-violet-500/40 hover:shadow-[0_16px_50px_rgba(124,58,237,0.25)] transition-all duration-500"
          >
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-violet-600/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-center">
              {/* Image Column */}
              <div className="lg:col-span-7 relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/[0.04]">
                {post.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-103"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#17092c] text-zinc-500 text-lg">
                    No Cover Image
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#070010]/60 via-transparent to-transparent" />
                
                {post.category && (
                  <span className="absolute left-6 top-6 rounded-full border border-violet-500/30 bg-[#0c0118]/80 px-4 py-1.5 text-xs font-bold tracking-wider text-violet-300 uppercase backdrop-blur-md">
                    Featured • {post.category}
                  </span>
                )}
              </div>

              {/* Text Column */}
              <div className="lg:col-span-5 flex flex-col justify-center">
                <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400 mb-4">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-violet-400" />
                    {publishDate}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-violet-400" />
                    {post.read_time_minutes || 1} min read
                  </span>
                </div>

                <Link href={`/blog/${post.slug}`} className="group/title block">
                  <h2 className="font-display text-2xl font-black leading-tight text-white md:text-3.5xl lg:text-4xl transition-colors duration-200 group-hover/title:text-violet-300">
                    {post.title}
                  </h2>
                </Link>

                <p className="mt-4 text-[15px] leading-relaxed text-zinc-400 font-medium line-clamp-4">
                  {post.excerpt}
                </p>

                {post.tags && post.tags.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {post.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300 border border-white/[0.02]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-8 flex items-center justify-between border-t border-white/[0.05] pt-6">
                  <div className="flex items-center gap-3">
                    {post.author_avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.author_avatar_url}
                        alt={post.author_name}
                        className="h-9 w-9 rounded-full border border-violet-500/20 object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600/20 text-xs font-bold text-violet-300">
                        {(post.author_name || 'A').charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-bold text-zinc-100">{post.author_name}</div>
                      <div className="text-[11px] text-zinc-500 font-medium">Trinetra Author</div>
                    </div>
                  </div>

                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-xs font-extrabold text-white shadow-lg transition-transform group-hover:scale-102 hover:bg-violet-500"
                  >
                    Read Article
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
