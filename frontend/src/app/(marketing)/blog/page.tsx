import { createClient } from '@/utils/supabase/server'
import { Metadata } from 'next'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import SubscribeForm from './SubscribeForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Blog & Research | trinetraedu-ai',
  description: 'Practical guides, architectural deep-dives, and engineering insights on autonomous AI systems, agentic workflows, and scalable intelligence.',
  openGraph: {
    title: 'Blog & Research | trinetraedu-ai',
    description: 'Insights on Autonomous AI Systems, Agentic Workflows & Scalable Intelligence.',
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

  const supabase = await createClient()

  // Base query with exact count
  let query = supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image_url, category, tags, author_name, author_avatar_url, read_time_minutes, published_at, created_at', { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (activeCategory !== 'All') {
    query = query.eq('category', activeCategory)
  }

  if (searchQuery) {
    query = query.or(`title.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
  }

  // Calculate pagination range
  const from = (currentPage - 1) * POSTS_PER_PAGE
  const to = from + POSTS_PER_PAGE - 1

  const { data: posts, count: totalCount } = await query.range(from, to)
  const allPosts = posts || []
  const total = totalCount || 0
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
    <div className="min-h-screen bg-[#080010] text-white selection:bg-violet-500/30">

      {/* ═══ AMBIENT GLOW ═══ */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[450px] w-full max-w-[1200px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.12)_0%,transparent_70%)]"
      />

      {/* ═══ PAGE HEADER ═══ */}
      <div className="relative w-full px-6 sm:px-10 lg:px-16 pt-20 pb-10 text-center">
        <p className="text-xs sm:text-sm font-extrabold uppercase tracking-[3px] text-violet-400 mb-4">
          TRINETRAEDU-AI PUBLICATIONS
        </p>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight max-w-4xl mx-auto tracking-tight">
          Insights on Agentic AI, Autonomous Workflows &amp; Intelligence
        </h1>
        <p className="text-base sm:text-lg text-[#9E99E0] mt-4 max-w-2xl mx-auto leading-relaxed">
          Engineering deep-dives, practical blueprints, and research insights to help you build and scale autonomous AI systems.
        </p>
      </div>

      <div className="w-full px-6 sm:px-10 lg:px-16 pb-24 max-w-[1400px] mx-auto">

        {/* ═══ FEATURED HERO POST (When on page 1 of default feed) ═══ */}
        {featured && (
          <a
            href={`/blog/${featured.slug}`}
            className="group block relative w-full rounded-2xl overflow-hidden mb-12 border border-violet-500/20 hover:border-violet-500/50 transition-all duration-300 shadow-2xl shadow-violet-950/20"
          >
            <div className="relative w-full h-[320px] sm:h-[420px] lg:h-[500px]">
              {featured.cover_image_url ? (
                <img
                  src={featured.cover_image_url}
                  alt={featured.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-900 to-indigo-950" />
              )}
              
              {/* Dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#080010] via-black/50 to-transparent" />

              {/* Content overlay — bottom-left */}
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 lg:p-14">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300 bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-md">
                    Featured
                  </span>
                  {featured.category && (
                    <span className="text-[11px] font-bold uppercase tracking-widest text-white bg-violet-600 px-3 py-1 rounded-md">
                      {featured.category}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight max-w-4xl group-hover:text-violet-200 transition-colors">
                  {featured.title}
                </h2>

                {featured.excerpt && (
                  <p className="text-sm sm:text-base text-gray-300 mt-3 max-w-2xl line-clamp-2 leading-relaxed">
                    {featured.excerpt}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-6 text-sm text-gray-400">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[#130026] border border-violet-500/30 p-0.5 flex items-center justify-center shrink-0">
                    <img
                      src={getAuthorAvatar(featured.author_name, featured.author_avatar_url)}
                      alt={featured.author_name || 'Author'}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="font-semibold text-gray-200">{featured.author_name || 'trinetraedu-ai'}</span>
                  <span className="text-gray-600">·</span>
                  <span>{formatDate(featured.published_at || featured.created_at)}</span>
                  <span className="text-gray-600">·</span>
                  <span>{featured.read_time_minutes || 5} min read</span>
                </div>
              </div>
            </div>
          </a>
        )}

        {/* ═══ TOOLBAR: Search & Category Filter ═══ */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-10 pb-6 border-b border-violet-500/10">
          
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
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/20 border border-violet-500'
                      : 'border border-violet-500/20 bg-white/[0.02] text-[#9E99E0] hover:border-violet-500/50 hover:text-white hover:bg-white/[0.04]'
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
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              name="search"
              defaultValue={searchQuery}
              placeholder="Search articles..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-violet-500/20 bg-white/[0.02] text-xs text-white outline-none focus:border-violet-400 transition-colors placeholder:text-zinc-500"
            />
          </form>
        </div>

        {/* ═══ POSTS GRID ═══ */}
        {allPosts.length === 0 ? (
          <div className="text-center py-24 border border-violet-500/10 rounded-2xl bg-white/[0.01]">
            <p className="text-2xl font-bold text-white">No articles found</p>
            <p className="text-[#9E99E0] mt-2 text-sm">
              {searchQuery ? `No matches for "${searchQuery}". Try a different keyword.` : 'Check back soon for new publications.'}
            </p>
            {(searchQuery || activeCategory !== 'All') && (
              <a
                href="/blog"
                className="inline-block mt-5 text-xs font-bold text-violet-400 hover:text-violet-300 uppercase tracking-wider underline"
              >
                Clear all filters
              </a>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {searchQuery ? `Search Results for "${searchQuery}"` : activeCategory === 'All' ? 'Latest Publications' : `${activeCategory} Articles`}
              </h2>
              <span className="text-xs sm:text-sm text-gray-500 font-semibold">
                Showing {from + 1}-{Math.min(to + 1, total)} of {total} articles
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {gridPosts.map((post) => (
                <a
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col rounded-2xl overflow-hidden bg-[#110D1F] border border-violet-500/15 hover:border-violet-500/40 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-violet-950/40 transition-all duration-300"
                >
                  {/* Card image with fixed aspect ratio */}
                  <div className="relative w-full h-52 overflow-hidden bg-[#1a0f30]">
                    {post.cover_image_url ? (
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-900/40 to-indigo-950/40 flex items-center justify-center text-xs text-zinc-600 font-bold uppercase tracking-wider">
                        trinetraedu-ai Publication
                      </div>
                    )}
                    {post.category && (
                      <span className="absolute top-3 left-3 text-[10px] font-extrabold uppercase tracking-wider text-white bg-violet-600/90 backdrop-blur-md px-2.5 py-1 rounded-md">
                        {post.category}
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="flex-1 flex flex-col p-6">
                    <h3 className="text-lg font-bold text-white leading-snug line-clamp-2 group-hover:text-violet-300 transition-colors">
                      {post.title}
                    </h3>
                    
                    {post.excerpt && (
                      <p className="text-xs sm:text-sm text-[#9E99E0] mt-2.5 line-clamp-2 leading-relaxed">
                        {post.excerpt}
                      </p>
                    )}

                    {/* Author row */}
                    <div className="mt-auto pt-5 flex items-center gap-2.5 text-xs text-gray-400 border-t border-white/[0.06]">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-[#130026] border border-violet-500/30 p-0.5 flex items-center justify-center shrink-0">
                        <img
                          src={getAuthorAvatar(post.author_name, post.author_avatar_url)}
                          alt={post.author_name || 'Author'}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="font-semibold text-gray-200 truncate">{post.author_name || 'trinetraedu-ai'}</span>
                      <span className="text-gray-600">·</span>
                      <span className="shrink-0">{formatDate(post.published_at || post.created_at)}</span>
                      <span className="text-gray-600">·</span>
                      <span className="shrink-0">{post.read_time_minutes || 5} min</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* ═══ PAGINATION CONTROLS (For 100s of blogs) ═══ */}
            {totalPages > 1 && (
              <div className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-violet-500/10">
                <p className="text-xs text-gray-500 font-semibold">
                  Page {currentPage} of {totalPages}
                </p>

                <div className="flex items-center gap-2">
                  {/* Previous Button */}
                  {currentPage > 1 ? (
                    <a
                      href={getPageUrl(currentPage - 1)}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-white border border-violet-500/20 hover:border-violet-500/50 bg-white/[0.02] hover:bg-white/[0.05] transition-all"
                    >
                      <ChevronLeft size={14} /> Previous
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 border border-white/5 bg-white/[0.01] cursor-not-allowed">
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
                          {showEllipsis && <span className="px-2 text-xs text-gray-600">...</span>}
                          <a
                            href={getPageUrl(p)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                              isCurrent
                                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/20'
                                : 'text-gray-400 border border-violet-500/15 hover:border-violet-500/40 hover:text-white bg-white/[0.02]'
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
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-white border border-violet-500/20 hover:border-violet-500/50 bg-white/[0.02] hover:bg-white/[0.05] transition-all"
                    >
                      Next <ChevronRight size={14} />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 border border-white/5 bg-white/[0.01] cursor-not-allowed">
                      Next <ChevronRight size={14} />
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ NEWSLETTER SUBSCRIPTION SECTION ═══ */}
        <section className="mt-24 rounded-3xl bg-gradient-to-br from-violet-950/40 via-[#120E22] to-indigo-950/20 border border-violet-500/20 p-8 sm:p-12 lg:p-16 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 shadow-2xl">
          <div className="space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
              STAY AHEAD OF THE AI FRONTIER
            </span>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Get engineering insights in your inbox
            </h3>
            <p className="text-sm sm:text-base text-[#9E99E0] max-w-lg leading-relaxed">
              Join 2,000+ engineers, founders, and leaders building autonomous AI systems, intelligent workflows, and next-gen intelligence.
            </p>
          </div>

          <SubscribeForm />
        </section>

      </div>
    </div>
  )
}