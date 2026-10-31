import { createClient } from '@/utils/supabase/server'
import { Metadata } from 'next'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import SubscribeForm from './SubscribeForm'
import { FALLBACK_BLOG_POSTS, BlogPostItem } from '@/src/lib/blogData'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Blog & Research | Vaakriti AI',
  description: 'Practical guides, architectural deep-dives, and engineering insights on autonomous voice AI systems, agentic workflows, and scalable intelligence.',
  openGraph: {
    title: 'Blog & Research | Vaakriti AI',
    description: 'Insights on Autonomous Voice AI Systems, Agentic Workflows & Scalable Telephony.',
    type: 'website',
  },
}

const CATEGORIES = ['All', 'Architecture', 'Agents', 'Product', 'Industry', 'Guide', 'News']
const POSTS_PER_PAGE = 9

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

export default async function BlogListingPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string; page?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const activeCategory = resolvedSearchParams.category || 'All'
  const searchQuery = (resolvedSearchParams.search || '').trim()
  const currentPage = Math.max(1, parseInt(resolvedSearchParams.page || '1', 10))
  const from = (currentPage - 1) * POSTS_PER_PAGE
  const to = from + POSTS_PER_PAGE - 1

  let allPosts: BlogPostItem[] = []
  let total = 0

  try {
    const supabase = await createClient()

    // Base query with exact count
    let query = supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, cover_image_url, category, tags, author_name, author_avatar_url, read_time_minutes, published_at, created_at, status', { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (activeCategory !== 'All') {
      query = query.eq('category', activeCategory)
    }

    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
    }

    // 2-second timeout guard to prevent Cloudflare 522 hangs
    const timeoutPromise = new Promise<any>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase blog query timeout')), 2000)
    )

    const result = await Promise.race([query.range(from, to), timeoutPromise])
    if (result?.data && result.data.length > 0) {
      allPosts = result.data as any
      total = result.count || result.data.length
    }
  } catch {
    // Graceful fallback to rich built-in posts on network timeout
  }

  // Fallback to built-in blog posts if database is empty or unreachable
  if (allPosts.length === 0) {
    let filtered = FALLBACK_BLOG_POSTS.filter(p => p.status === 'published')
    if (activeCategory !== 'All') {
      filtered = filtered.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase())
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q)
      )
    }
    total = filtered.length
    allPosts = filtered.slice(from, from + POSTS_PER_PAGE)
  }

  const totalPages = Math.ceil(total / POSTS_PER_PAGE) || 1

  // Show hero card ONLY on page 1 when no search is active and category is 'All'
  const isDefaultView = activeCategory === 'All' && !searchQuery && currentPage === 1
  const featured = isDefaultView && allPosts.length > 0 ? allPosts[0] : null
  const gridPosts = featured ? allPosts.slice(1) : allPosts

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Build pagination link helper
  const getPageUrl = (targetPage: number) => {
    const params = new URLSearchParams()
    if (activeCategory !== 'All') params.set('category', activeCategory)
    if (searchQuery) params.set('search', searchQuery)
    if (targetPage > 1) params.set('page', String(targetPage))
    const qs = params.toString()
    return qs ? `/blog?${qs}` : '/blog'
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0F172A] pt-24 sm:pt-28">
      {/* ═══ PAGE HEADER ═══ */}
      <div className="relative w-full px-6 sm:px-10 lg:px-16 pt-10 pb-8 text-center">
        <div className="inline-flex items-center gap-1.5 bg-[#2563EB]/10 border border-[#2563EB]/25 text-[#2563EB] font-sans font-semibold text-[12.5px] px-4 py-1.5 rounded-full mb-5">
          <span>✦</span> Research &amp; Publications
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-[#0F172A] leading-tight max-w-4xl mx-auto tracking-tight font-sans">
          Insights on Autonomous Voice AI, Agentic Systems &amp; Scale
        </h1>
        <p className="text-base sm:text-lg text-[#475569] mt-4 max-w-2xl mx-auto leading-relaxed font-sans">
          Engineering deep-dives, telephony blueprints, and research insights to help you build and scale conversational AI.
        </p>
      </div>

      <div className="w-full px-6 sm:px-10 lg:px-16 pb-24 max-w-6xl mx-auto">
        {/* ═══ FEATURED HERO POST ═══ */}
        {featured && (
          <a
            href={`/blog/${featured.slug}`}
            className="group block relative w-full rounded-3xl overflow-hidden mb-12 border border-[#E2E8F0] bg-white hover:border-[#2563EB]/40 transition-all duration-300 shadow-xs hover:shadow-lg"
          >
            <div className="relative w-full h-[320px] sm:h-[420px] lg:h-[480px]">
              {featured.cover_image_url ? (
                <img
                  src={featured.cover_image_url}
                  alt={featured.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />
              ) : (
                <img
                  src="/images/vaakriti_blog.jpg"
                  alt={featured.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />
              )}
              
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

              {/* Content overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 lg:p-12 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-full backdrop-blur-md">
                    Featured
                  </span>
                  {featured.category && (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white bg-[#2563EB] px-2.5 py-1 rounded-full">
                      {featured.category}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight max-w-4xl font-sans drop-shadow-sm">
                  {featured.title}
                </h2>

                {featured.excerpt && (
                  <p className="text-sm sm:text-base text-slate-200 mt-2.5 max-w-2xl line-clamp-2 leading-relaxed font-sans">
                    {featured.excerpt}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-5 text-xs text-slate-300 font-sans">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-white/20 border border-white/30 p-0.5 flex items-center justify-center shrink-0">
                    <img
                      src={getAuthorAvatar(featured.author_name, featured.author_avatar_url)}
                      alt={featured.author_name || 'Author'}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="font-semibold text-white">{featured.author_name || 'Trinetra AI'}</span>
                  <span>·</span>
                  <span>{formatDate(featured.published_at || featured.created_at)}</span>
                  <span>·</span>
                  <span>{featured.read_time_minutes || 5} min read</span>
                </div>
              </div>
            </div>
          </a>
        )}

        {/* ═══ TOOLBAR: Search & Category Filter ═══ */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-10 pb-6 border-b border-[#E2E8F0]">
          {/* Category Tabs */}
          <nav className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat
              const params = new URLSearchParams()
              if (cat !== 'All') params.set('category', cat)
              if (searchQuery) params.set('search', searchQuery)
              const href = params.toString() ? `/blog?${params.toString()}` : '/blog'

              return (
                <a
                  key={cat}
                  href={href}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 font-sans ${
                    isActive
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'border border-[#E2E8F0] bg-white text-[#475569] hover:border-[#2563EB] hover:text-[#2563EB]'
                  }`}
                >
                  {cat}
                </a>
              )
            })}
          </nav>

          {/* Search Form */}
          <form action="/blog" method="GET" className="relative w-full md:w-72">
            {activeCategory !== 'All' && <input type="hidden" name="category" value={activeCategory} />}
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
            <input
              type="text"
              name="search"
              defaultValue={searchQuery}
              placeholder="Search articles..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all placeholder:text-[#94A3B8] font-sans"
            />
          </form>
        </div>

        {/* ═══ POSTS GRID ═══ */}
        {allPosts.length === 0 ? (
          <div className="text-center py-20 border border-[#E2E8F0] rounded-2xl bg-white shadow-xs">
            <p className="text-2xl font-bold text-[#0F172A] font-sans">No articles found</p>
            <p className="text-[#64748B] mt-2 text-sm font-sans">
              {searchQuery ? `No matches for "${searchQuery}". Try a different keyword.` : 'Check back soon for new publications.'}
            </p>
            {(searchQuery || activeCategory !== 'All') && (
              <a
                href="/blog"
                className="inline-block mt-4 text-xs font-bold text-[#2563EB] hover:underline uppercase tracking-wider font-sans"
              >
                Clear all filters
              </a>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight font-sans">
                {searchQuery ? `Search Results for "${searchQuery}"` : activeCategory === 'All' ? 'Latest Publications' : `${activeCategory} Articles`}
              </h2>
              <span className="text-xs sm:text-sm text-[#64748B] font-medium font-sans">
                Showing {from + 1}-{Math.min(to + 1, total)} of {total} articles
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
              {gridPosts.map((post) => (
                <a
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-[#E2E8F0] hover:border-[#2563EB]/40 hover:-translate-y-1 hover:shadow-md transition-all duration-300"
                >
                  {/* Card image with fixed aspect ratio */}
                  <div className="relative w-full h-48 overflow-hidden bg-slate-100">
                    {post.cover_image_url ? (
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <img
                        src="/images/vaakriti_blog.jpg"
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                    {post.category && (
                      <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider text-white bg-[#0F172A]/80 backdrop-blur-md px-2.5 py-1 rounded-full">
                        {post.category}
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="flex-1 flex flex-col p-6">
                    <h3 className="text-[17px] font-bold text-[#0F172A] leading-snug line-clamp-2 group-hover:text-[#2563EB] transition-colors font-sans">
                      {post.title}
                    </h3>
                    
                    {post.excerpt && (
                      <p className="text-xs sm:text-sm text-[#64748B] mt-2.5 line-clamp-2 leading-relaxed font-sans">
                        {post.excerpt}
                      </p>
                    )}

                    {/* Author row */}
                    <div className="mt-auto pt-5 flex items-center gap-2.5 text-xs text-[#64748B] border-t border-[#E2E8F0] font-sans">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-[#F1F5F9] border border-[#CBD5E1] p-0.5 flex items-center justify-center shrink-0">
                        <img
                          src={getAuthorAvatar(post.author_name, post.author_avatar_url)}
                          alt={post.author_name || 'Author'}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="font-semibold text-[#0F172A] truncate">{post.author_name || 'Trinetra AI'}</span>
                      <span>·</span>
                      <span className="shrink-0">{formatDate(post.published_at || post.created_at)}</span>
                      <span>·</span>
                      <span className="shrink-0">{post.read_time_minutes || 5} min</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* ═══ PAGINATION CONTROLS ═══ */}
            {totalPages > 1 && (
              <div className="mt-14 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#E2E8F0]">
                <p className="text-xs text-[#64748B] font-semibold font-sans">
                  Page {currentPage} of {totalPages}
                </p>

                <div className="flex items-center gap-2">
                  {/* Previous Button */}
                  {currentPage > 1 ? (
                    <a
                      href={getPageUrl(currentPage - 1)}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold text-[#0F172A] border border-[#CBD5E1] bg-white hover:border-[#2563EB] hover:text-[#2563EB] transition-all font-sans"
                    >
                      <ChevronLeft size={14} /> Previous
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold text-[#94A3B8] border border-[#E2E8F0] bg-white cursor-not-allowed font-sans">
                      <ChevronLeft size={14} /> Previous
                    </span>
                  )}

                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1]
                      const showEllipsis = prev && p - prev > 1
                      const isCurrent = p === currentPage

                      return (
                        <span key={p} className="flex items-center">
                          {showEllipsis && <span className="px-2 text-xs text-[#94A3B8]">...</span>}
                          <a
                            href={getPageUrl(p)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all font-sans ${
                              isCurrent
                                ? 'bg-[#2563EB] text-white shadow-xs'
                                : 'text-[#475569] border border-[#E2E8F0] bg-white hover:border-[#2563EB] hover:text-[#2563EB]'
                            }`}
                          >
                            {p}
                          </a>
                        </span>
                      )
                    })}

                  {/* Next Button */}
                  {currentPage < totalPages ? (
                    <a
                      href={getPageUrl(currentPage + 1)}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold text-[#0F172A] border border-[#CBD5E1] bg-white hover:border-[#2563EB] hover:text-[#2563EB] transition-all font-sans"
                    >
                      Next <ChevronRight size={14} />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold text-[#94A3B8] border border-[#E2E8F0] bg-white cursor-not-allowed font-sans">
                      Next <ChevronRight size={14} />
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ NEWSLETTER SUBSCRIPTION SECTION ═══ */}
        <section className="mt-20 rounded-3xl bg-white border border-[#E2E8F0] p-8 sm:p-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 shadow-xs">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] font-sans">
              STAY AHEAD OF THE AI FRONTIER
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight font-sans">
              Get engineering insights in your inbox
            </h3>
            <p className="text-sm sm:text-base text-[#475569] max-w-lg leading-relaxed font-sans">
              Join 2,000+ engineers, founders, and leaders building autonomous voice systems and telephony intelligence.
            </p>
          </div>

          <SubscribeForm />
        </section>
      </div>
    </div>
  )
}