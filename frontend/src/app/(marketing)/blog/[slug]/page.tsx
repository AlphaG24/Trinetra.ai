import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { ArrowLeft, Clock, Calendar, Share2 } from 'lucide-react'
import { FALLBACK_BLOG_POSTS } from '@/src/lib/blogData'

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
  const targetSlug = slug.includes('scaling-multilingual') ? 'scaling-multilingual-voice-ai-india' : slug
  let post: any = null

  try {
    const supabase = await createClient()
    const queryPromise = supabase
      .from('blog_posts')
      .select('title, excerpt, seo_title, seo_description, cover_image_url')
      .eq('slug', targetSlug)
      .eq('status', 'published')
      .maybeSingle()

    const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: new Error('Metadata timeout') }), 1500)
    )

    const res = await Promise.race([queryPromise, timeoutPromise])
    if (res.data) {
      post = res.data
    }
  } catch (err) {
    // ignore
  }

  if (!post) {
    post = FALLBACK_BLOG_POSTS.find((p) => 
      p.slug === slug || 
      p.slug === targetSlug ||
      (slug.includes('multilingual') && p.slug.includes('multilingual')) ||
      (slug.includes('sub-480ms') && p.slug.includes('sub-480ms')) ||
      (slug.includes('sovereign') && p.slug.includes('sovereign')) ||
      (slug.includes('freight') && p.slug.includes('freight'))
    )
  }

  if (!post) return { title: 'Article Not Found | Vaakriti AI' }

  return {
    title: `${post.seo_title || post.title} | Vaakriti AI`,
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
  const targetSlug = slug.includes('scaling-multilingual') ? 'scaling-multilingual-voice-ai-india' : slug
  let post: any = null
  let related: any[] = []

  try {
    const supabase = await createClient()
    const queryPromise = supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', targetSlug)
      .eq('status', 'published')
      .single()

    const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: new Error('Post query timeout') }), 2000)
    )

    const res = await Promise.race([queryPromise, timeoutPromise])
    if (res.data) {
      post = res.data

      const { data: relatedData } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image_url, category, author_name, author_avatar_url, read_time_minutes, published_at, created_at')
        .eq('status', 'published')
        .eq('category', post.category)
        .neq('id', post.id)
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(3)

      if (relatedData && relatedData.length > 0) {
        related = relatedData
      }
    }
  } catch (err) {
    console.warn('[BlogPostDetailPage] Error or timeout querying blog:', err)
  }

  if (!post) {
    post = FALLBACK_BLOG_POSTS.find((p) => p.slug === slug)
  }

  if (!post) notFound()

  if (related.length === 0) {
    related = FALLBACK_BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 3)
  }

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
    <div className="min-h-screen bg-[#FAFAFA] text-[#0F172A] pt-20 sm:pt-24">
      {/* ═══ ARTICLE HERO — Cover image with elegant overlay ═══ */}
      <div className="relative w-full h-[48vh] min-h-[360px] max-h-[520px] overflow-hidden bg-slate-900">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src="/images/vaakriti_blog.jpg"
            alt={post.title}
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

        {/* Top bar with back link and social sharing */}
        <div className="absolute top-6 left-6 sm:left-10 lg:left-16 right-6 sm:right-10 lg:right-16 z-10 flex items-center justify-between">
          <a
            href="/blog"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white bg-black/40 border border-white/20 backdrop-blur-md hover:bg-white hover:text-[#0F172A] transition-all font-sans"
          >
            <ArrowLeft size={14} /> Back to Blog
          </a>

          <div className="flex items-center gap-2">
            <a
              href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full border border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center text-xs font-bold text-white hover:bg-white hover:text-black transition-all"
              title="Share on Twitter"
            >
              𝕏
            </a>
            <a
              href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full border border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center text-xs font-bold text-white hover:bg-[#0A66C2] transition-all"
              title="Share on LinkedIn"
            >
              in
            </a>
          </div>
        </div>

        {/* Title overlay at bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-10 lg:px-16 pb-10 text-white">
          <div className="max-w-4xl">
            {post.category && (
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-white bg-[#2563EB] px-3 py-1 rounded-full mb-3 shadow-xs font-sans">
                {post.category}
              </span>
            )}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight font-sans drop-shadow-sm">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-5 text-xs text-slate-300 font-sans">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20 border border-white/30 p-0.5 flex items-center justify-center shrink-0">
                <img
                  src={authorAvatar}
                  alt={post.author_name || 'Author'}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-semibold text-white">{post.author_name || 'Trinetra AI'}</span>
              <span>·</span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Calendar size={13} className="text-[#60A5FA]" />
                {publishDate}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Clock size={13} className="text-[#60A5FA]" />
                {post.read_time_minutes || 5} min read
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ARTICLE BODY ═══ */}
      <div className="w-full px-6 sm:px-10 lg:px-16 pt-12 pb-24 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
          {/* Main content column */}
          <article className="xl:col-span-8 bg-white border border-[#E2E8F0] rounded-3xl p-8 sm:p-12 shadow-xs">
            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-base sm:text-lg text-[#334155] italic leading-relaxed border-l-4 border-[#2563EB] bg-blue-50/50 px-6 py-4 rounded-r-2xl mb-8 font-sans">
                {post.excerpt}
              </p>
            )}

            {/* Body text */}
            <div className="text-[16px] sm:text-[17px] leading-[1.8] text-[#334155] space-y-6 font-sans">
              {contentParagraphs.map((para: string, i: number) => {
                const trimmed = para.trim()

                if (trimmed.startsWith('### ')) {
                  return (
                    <h3 key={i} className="text-xl sm:text-2xl font-bold text-[#0F172A] mt-8 mb-3 tracking-tight font-sans">
                      {trimmed.replace(/^###\s*/, '')}
                    </h3>
                  )
                }
                if (trimmed.startsWith('## ')) {
                  return (
                    <h2 key={i} className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] mt-10 mb-4 tracking-tight border-b border-[#E2E8F0] pb-3 font-sans">
                      {trimmed.replace(/^##\s*/, '')}
                    </h2>
                  )
                }
                if (trimmed.startsWith('> ')) {
                  return (
                    <blockquote key={i} className="border-l-4 border-[#2563EB] bg-blue-50/40 rounded-r-2xl px-6 py-4 italic text-[#0F172A] my-6 font-sans">
                      {trimmed.replace(/^>\s*/, '')}
                    </blockquote>
                  )
                }
                if (trimmed.startsWith('```')) {
                  const codeContent = trimmed.replace(/^```\w*\n?/, '').replace(/```$/, '')
                  return (
                    <pre key={i} className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-5 font-mono text-xs sm:text-sm text-slate-100 overflow-x-auto my-6 shadow-sm">
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
              <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-[#E2E8F0]">
                {post.tags.map((tag: string) => (
                  <span key={tag} className="text-xs font-semibold text-[#2563EB] bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full font-sans">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Author Card */}
            <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-5 p-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-[#CBD5E1] p-1 flex items-center justify-center shrink-0">
                <img
                  src={authorAvatar}
                  alt={post.author_name || 'Author'}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-1 font-sans">
                <p className="font-bold text-base text-[#0F172A]">Written by {post.author_name || 'Vaakriti AI'}</p>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Engineering Team at Vaakriti AI · Building the sovereign voice intelligence and telephone infrastructure layer for modern enterprises.
                </p>
              </div>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="xl:col-span-4 hidden xl:block">
            <div className="sticky top-24 space-y-5">
              {/* Quick info card */}
              <div className="p-6 bg-white border border-[#E2E8F0] rounded-2xl space-y-3.5 shadow-xs font-sans">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  Article Metadata
                </h4>
                <div className="text-sm text-[#475569] space-y-2">
                  <p className="flex justify-between">
                    <span className="text-[#64748B]">Published:</span> 
                    <span className="text-[#0F172A] font-semibold">{publishDate}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-[#64748B]">Read time:</span> 
                    <span className="text-[#0F172A] font-semibold">{post.read_time_minutes || 5} min</span>
                  </p>
                  {post.category && (
                    <p className="flex justify-between">
                      <span className="text-[#64748B]">Category:</span> 
                      <span className="text-[#2563EB] font-bold">{post.category}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Share card */}
              <div className="p-6 bg-white border border-[#E2E8F0] rounded-2xl shadow-xs font-sans">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3.5 flex items-center gap-1.5">
                  <Share2 size={13} /> Share Article
                </h4>
                <div className="flex gap-2.5">
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-9 rounded-xl border border-[#CBD5E1] bg-white flex items-center justify-center text-xs font-bold text-[#0F172A] hover:border-[#2563EB] hover:text-[#2563EB] transition-all"
                  >
                    𝕏 Twitter
                  </a>
                  <a
                    href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-9 rounded-xl border border-[#CBD5E1] bg-white flex items-center justify-center text-xs font-bold text-[#0F172A] hover:border-[#0A66C2] hover:text-[#0A66C2] transition-all"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>

              {/* Back to blog CTA */}
              <a
                href="/blog"
                className="block text-center text-xs font-bold uppercase tracking-wider text-[#2563EB] hover:text-[#1D4ED8] transition-colors py-3.5 border border-[#CBD5E1] rounded-2xl bg-white hover:bg-slate-50 font-sans shadow-2xs"
              >
                ← Explore All Publications
              </a>
            </div>
          </aside>
        </div>

        {/* ═══ RELATED ARTICLES ═══ */}
        {related && related.length > 0 && (
          <section className="mt-20 pt-10 border-t border-[#E2E8F0]">
            <h2 className="text-2xl font-bold text-[#0F172A] mb-6 tracking-tight font-sans">
              Related Publications
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {related.map((r) => (
                <a
                  key={r.id}
                  href={`/blog/${r.slug}`}
                  className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-[#E2E8F0] hover:border-[#2563EB]/40 hover:-translate-y-1 hover:shadow-md transition-all duration-300"
                >
                  <div className="w-full h-40 overflow-hidden bg-slate-100">
                    <img
                      src={r.cover_image_url || '/images/vaakriti_blog.jpg'}
                      alt={r.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col font-sans">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] mb-1.5">
                      {r.category || 'General'}
                    </span>
                    <h3 className="text-sm font-bold text-[#0F172A] leading-snug line-clamp-2 group-hover:text-[#2563EB] transition-colors">
                      {r.title}
                    </h3>
                    {r.excerpt && (
                      <p className="text-xs text-[#64748B] mt-2 line-clamp-2 leading-relaxed">
                        {r.excerpt}
                      </p>
                    )}
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