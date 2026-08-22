import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { ArrowLeft, Clock, Calendar, Share2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

/**
 * Returns author avatar URL. Falls back to official trinetraedu-ai logo for Admin/trinetraedu-ai or when missing.
 */
function getAuthorAvatar(authorName?: string, authorAvatarUrl?: string): string {
  const name = (authorName || '').toLowerCase().trim()
  if (authorAvatarUrl && authorAvatarUrl.trim() !== '' && !name.includes('admin') && !name.includes('trinetra')) {
    return authorAvatarUrl
  }
  return '/logo-transparent.png'
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt, seo_title, seo_description, cover_image_url')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!post) return { title: 'Article Not Found | trinetraedu-ai Publications' }

  return {
    title: `${post.seo_title || post.title} | trinetraedu-ai`,
    description: post.seo_description || post.excerpt || '',
    openGraph: {
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt || '',
      type: 'article',
      ...(post.cover_image_url ? { images: [{ url: post.cover_image_url }] } : {}),
    },
  }
}

export default async function BlogPostDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) notFound()

  // Related posts
  const { data: related } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image_url, category, author_name, author_avatar_url, read_time_minutes, published_at, created_at')
    .eq('status', 'published')
    .eq('category', post.category)
    .neq('id', post.id)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(3)

  const publishDate = new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const contentParagraphs = typeof post.content === 'string'
    ? post.content.split(/\n\n+/).filter((p: string) => p.trim() !== '')
    : [String(post.content || '')]

  const shareUrl = `https://trinetraedu-ai.com/blog/${post.slug}`
  const encodedTitle = encodeURIComponent(post.title)
  const encodedUrl = encodeURIComponent(shareUrl)

  const authorAvatar = getAuthorAvatar(post.author_name, post.author_avatar_url)

  return (
    <div className="min-h-screen bg-[#080010] text-white selection:bg-violet-500/30">

      {/* ═══ ARTICLE HERO — Full-width cover image with overlay ═══ */}
      <div className="relative w-full h-[52vh] min-h-[380px] max-h-[560px] overflow-hidden">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-900 to-indigo-950" />
        )}
        
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080010] via-[#080010]/60 to-transparent" />
        <div className="absolute inset-0 bg-black/35" />

        {/* Top bar with back link and social sharing */}
        <div className="absolute top-6 left-6 sm:left-10 lg:left-16 right-6 sm:right-10 lg:right-16 z-10 flex items-center justify-between">
          <a
            href="/blog"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-violet-300 bg-black/40 border border-white/10 backdrop-blur-md hover:bg-violet-600 hover:text-white transition-all"
          >
            <ArrowLeft size={14} /> Back to Blog
          </a>

          <div className="flex items-center gap-2">
            <a
              href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-xl border border-white/15 bg-black/40 backdrop-blur-md flex items-center justify-center text-sm text-gray-300 hover:bg-violet-600 hover:text-white transition-all"
              title="Share on Twitter"
            >
              𝕏
            </a>
            <a
              href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-xl border border-white/15 bg-black/40 backdrop-blur-md flex items-center justify-center text-xs font-bold text-gray-300 hover:bg-[#0A66C2] hover:text-white transition-all"
              title="Share on LinkedIn"
            >
              in
            </a>
          </div>
        </div>

        {/* Title overlay at bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-10 lg:px-16 pb-10">
          <div className="max-w-4xl">
            {post.category && (
              <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest text-white bg-violet-600 px-3.5 py-1 rounded-md mb-4 shadow-lg shadow-violet-600/30">
                {post.category}
              </span>
            )}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-6 text-sm text-gray-300">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-[#130026] border border-violet-500/40 p-0.5 flex items-center justify-center shrink-0">
                <img
                  src={authorAvatar}
                  alt={post.author_name || 'Author'}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-bold text-white">{post.author_name || 'trinetraedu-ai'}</span>
              <span className="text-gray-500">·</span>
              <span className="flex items-center gap-1.5 text-gray-300">
                <Calendar size={14} className="text-violet-400" />
                {publishDate}
              </span>
              <span className="text-gray-500">·</span>
              <span className="flex items-center gap-1.5 text-gray-300">
                <Clock size={14} className="text-violet-400" />
                {post.read_time_minutes || 5} min read
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ARTICLE BODY ═══ */}
      <div className="w-full px-6 sm:px-10 lg:px-16 pt-12 pb-24 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">

          {/* Main content column */}
          <article className="xl:col-span-8">

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-lg sm:text-xl text-[#E2E0FD] italic leading-relaxed border-l-4 border-violet-500 bg-violet-950/20 px-6 py-4 rounded-r-2xl mb-10">
                {post.excerpt}
              </p>
            )}

            {/* Body text */}
            <div className="text-[17px] sm:text-[18px] leading-[1.85] text-[#D4D0ED] space-y-6">
              {contentParagraphs.map((para: string, i: number) => {
                const trimmed = para.trim()

                if (trimmed.startsWith('### ')) {
                  return (
                    <h3 key={i} className="text-xl sm:text-2xl font-bold text-white mt-10 mb-4 tracking-tight">
                      {trimmed.replace(/^###\s*/, '')}
                    </h3>
                  )
                }
                if (trimmed.startsWith('## ')) {
                  return (
                    <h2 key={i} className="text-2xl sm:text-3xl font-extrabold text-white mt-12 mb-5 tracking-tight border-b border-violet-500/15 pb-3">
                      {trimmed.replace(/^##\s*/, '')}
                    </h2>
                  )
                }
                if (trimmed.startsWith('> ')) {
                  return (
                    <blockquote key={i} className="border-l-4 border-violet-500 bg-violet-500/10 rounded-r-2xl px-6 py-4 italic text-[#E2E0FD] my-8 shadow-inner">
                      {trimmed.replace(/^>\s*/, '')}
                    </blockquote>
                  )
                }
                if (trimmed.startsWith('```')) {
                  const codeContent = trimmed.replace(/^```\w*\n?/, '').replace(/```$/, '')
                  return (
                    <pre key={i} className="bg-black/70 border border-violet-500/20 rounded-2xl p-6 font-mono text-sm text-[#E2E0FD] overflow-x-auto my-8 shadow-xl">
                      <code>{codeContent}</code>
                    </pre>
                  )
                }

                return (
                  <p key={i} className="leading-relaxed">{trimmed}</p>
                )
              })}
            </div>

            {/* Tags */}
            {post.tags && Array.isArray(post.tags) && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t border-violet-500/15">
                {post.tags.map((tag: string) => (
                  <span key={tag} className="text-xs font-semibold text-[#9E99E0] bg-violet-500/10 border border-violet-500/15 px-3.5 py-1.5 rounded-xl tracking-wide">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Author Card */}
            <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-5 p-6 sm:p-8 bg-[#110D1F] border border-violet-500/20 rounded-2xl shadow-xl">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#130026] border border-violet-500/40 p-1 flex items-center justify-center shrink-0">
                <img
                  src={authorAvatar}
                  alt={post.author_name || 'Author'}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-1">
                <p className="font-extrabold text-lg text-white">Written by {post.author_name || 'trinetraedu-ai'}</p>
                <p className="text-sm text-[#9E99E0] leading-relaxed">
                  Founding Team &amp; AI Architect at trinetraedu-ai · Engineering the next frontier of autonomous intelligence, cognitive workflows, and scalable AI infrastructure.
                </p>
              </div>
            </div>
          </article>

          {/* Sidebar — share + quick info */}
          <aside className="xl:col-span-4 hidden xl:block">
            <div className="sticky top-24 space-y-6">
              {/* Quick info card */}
              <div className="p-6 bg-[#110D1F] border border-violet-500/15 rounded-2xl space-y-4 shadow-xl">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-violet-400 mb-3">
                  Article Info
                </h4>
                <div className="text-sm text-[#9E99E0] space-y-2.5">
                  <p className="flex justify-between">
                    <span className="text-gray-500">Published:</span> 
                    <span className="text-white font-medium">{publishDate}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-500">Read time:</span> 
                    <span className="text-white font-medium">{post.read_time_minutes || 5} minutes</span>
                  </p>
                  {post.category && (
                    <p className="flex justify-between">
                      <span className="text-gray-500">Category:</span> 
                      <span className="text-violet-300 font-bold">{post.category}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Share card */}
              <div className="p-6 bg-[#110D1F] border border-violet-500/15 rounded-2xl shadow-xl">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-violet-400 mb-4 flex items-center gap-1.5">
                  <Share2 size={14} /> Share Article
                </h4>
                <div className="flex gap-3">
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-10 rounded-xl border border-violet-500/20 bg-white/[0.02] flex items-center justify-center text-xs font-bold text-gray-300 hover:bg-violet-600 hover:text-white hover:border-violet-500 transition-all"
                  >
                    𝕏 Twitter
                  </a>
                  <a
                    href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-10 rounded-xl border border-violet-500/20 bg-white/[0.02] flex items-center justify-center text-xs font-bold text-gray-300 hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2] transition-all"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>

              {/* Back to blog CTA */}
              <a
                href="/blog"
                className="block text-center text-xs font-extrabold uppercase tracking-wider text-violet-400 hover:text-violet-300 transition-colors py-3.5 border border-violet-500/20 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05]"
              >
                ← Explore All Publications
              </a>
            </div>
          </aside>
        </div>

        {/* ═══ RELATED ARTICLES ═══ */}
        {related && related.length > 0 && (
          <section className="mt-24 pt-12 border-t border-violet-500/15">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-8 tracking-tight">
              Related Publications
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
              {related.map((r) => (
                <a
                  key={r.id}
                  href={`/blog/${r.slug}`}
                  className="group flex flex-col rounded-2xl overflow-hidden bg-[#110D1F] border border-violet-500/15 hover:border-violet-500/40 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-violet-950/40 transition-all duration-300"
                >
                  {r.cover_image_url && (
                    <div className="w-full h-44 overflow-hidden bg-[#1a0f30]">
                      <img
                        src={r.cover_image_url}
                        alt={r.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-400 mb-2">
                      {r.category || 'General'}
                    </span>
                    <h3 className="text-base font-bold text-white leading-snug line-clamp-2 group-hover:text-violet-300 transition-colors">
                      {r.title}
                    </h3>
                    {r.excerpt && (
                      <p className="text-xs sm:text-sm text-[#9E99E0] mt-2 line-clamp-2 leading-relaxed">
                        {r.excerpt}
                      </p>
                    )}
                    <div className="mt-auto pt-4 flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-5 h-5 rounded-full overflow-hidden bg-[#130026] border border-violet-500/30 p-0.5 flex items-center justify-center shrink-0">
                        <img
                          src={getAuthorAvatar(r.author_name, r.author_avatar_url)}
                          alt={r.author_name || 'Author'}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span>{r.author_name || 'trinetraedu-ai'}</span>
                      <span>·</span>
                      <span>{r.read_time_minutes || 5} min</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}