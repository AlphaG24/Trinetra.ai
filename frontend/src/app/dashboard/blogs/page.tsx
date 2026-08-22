'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, BookOpen, Search, Eye, FileText, Loader2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Post {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  status: string
  review_status?: string
  author_name: string
  view_count: number
  published_at?: string
  created_at: string
  moderation_result?: any
  cover_image_url?: string
}

export default function UserBlogDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'my_blogs' | 'discover'>('my_blogs')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [canCreate, setCanCreate] = useState(true)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/blogs?type=${activeTab}`)
      const data = await res.json()
      
      if (!res.ok) {
        if (res.status === 403) setCanCreate(false)
        throw new Error(data.error || 'Failed to fetch posts')
      }
      
      setPosts(data.posts || [])
    } catch (err: any) {
      if (err.message.includes('blocked') || err.message.includes('disabled')) {
         setCanCreate(false)
      } else {
         toast.error(err.message || 'Error loading blogs')
      }
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(search.toLowerCase()) || 
    post.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display flex items-center gap-2">
            <BookOpen size={28} className="text-violet-500" /> Community Blogs
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Write, share, and discover articles within the Trinetra community.
          </p>
        </div>
        
        {canCreate ? (
          <button
            onClick={() => router.push('/dashboard/blogs/new')}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-violet-500 px-5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.2)] transition-transform hover:scale-[1.02]"
          >
            <Plus size={16} />
            Write Article
          </button>
        ) : (
          <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 px-4 py-2 rounded-lg text-sm border border-amber-500/20 font-semibold">
            <AlertTriangle size={16} /> Public creation disabled or account flagged.
          </div>
        )}
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-[var(--border)] pb-4">
        <div className="flex bg-[var(--card-bg)] rounded-xl p-1 border border-[var(--border)] w-full md:w-auto">
          <button
            onClick={() => setActiveTab('my_blogs')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'my_blogs' ? 'bg-violet-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
          >
            My Blogs
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'discover' ? 'bg-violet-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
          >
            Discover
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-xs text-white outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
          <p className="text-xs">Loading articles...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center border border-dashed border-[var(--border)] rounded-2xl bg-[var(--card-bg)]">
           <FileText size={48} className="text-zinc-600 mb-4" />
           <h3 className="text-lg font-bold text-white mb-2">No articles found</h3>
           <p className="text-zinc-400 text-sm max-w-sm">
             {activeTab === 'my_blogs' 
                ? "You haven't written any articles yet. Click 'Write Article' to get started and share your knowledge!" 
                : "No published articles found in the community."}
           </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPosts.map((post) => (
            <div key={post.id} className="group rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden hover:border-violet-500/50 transition-all flex flex-col hover:shadow-xl hover:-translate-y-1 duration-300">
              {post.cover_image_url ? (
                <div className="w-full aspect-video overflow-hidden relative">
                   <img src={post.cover_image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                   {activeTab === 'my_blogs' && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase backdrop-blur-md border ${
                          post.review_status === 'pending'
                            ? 'bg-amber-500/40 border-amber-500/50 text-amber-100'
                            : post.status === 'published'
                            ? 'bg-emerald-500/40 border-emerald-500/50 text-emerald-100'
                            : post.status === 'archived'
                            ? 'bg-black/60 border-white/20 text-zinc-300'
                            : 'bg-black/60 border-white/20 text-zinc-300' // Draft
                        }`}>
                          {post.review_status === 'pending' ? 'Pending Review' : post.status}
                        </span>
                      </div>
                   )}
                </div>
              ) : (
                <div className="w-full aspect-video bg-gradient-to-br from-violet-900/40 to-black relative flex items-center justify-center p-4 text-center">
                   <h3 className="font-display font-bold text-lg text-white opacity-50 truncate w-full">{post.title}</h3>
                   {activeTab === 'my_blogs' && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase backdrop-blur-md border ${
                          post.review_status === 'pending'
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                            : post.status === 'published'
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                            : post.status === 'archived'
                            ? 'bg-zinc-800 border-white/20 text-zinc-400'
                            : 'bg-zinc-800 border-white/20 text-zinc-400' // Draft
                        }`}>
                          {post.review_status === 'pending' ? 'Pending' : post.status}
                        </span>
                      </div>
                   )}
                </div>
              )}
              
              <div className="p-5 flex flex-col flex-1">
                <div className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-2">{post.category}</div>
                <h3 className="font-bold text-white text-lg leading-tight mb-2 line-clamp-2">{post.title}</h3>
                <p className="text-zinc-400 text-sm line-clamp-2 mb-4 flex-1">{post.excerpt}</p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border)]">
                   <div className="flex items-center gap-2">
                     <div className="h-6 w-6 rounded-full bg-violet-600/20 border border-violet-500/30 overflow-hidden flex items-center justify-center text-[10px] font-bold text-violet-300">
                        {post.author_name ? post.author_name.charAt(0).toUpperCase() : 'A'}
                     </div>
                     <span className="text-xs font-semibold text-zinc-300 truncate max-w-[100px]">{post.author_name || 'Anonymous'}</span>
                   </div>
                   
                   {activeTab === 'my_blogs' && post.moderation_result?.severity === 'mild' && (
                      <div className="flex items-center gap-1 text-amber-400 text-[10px] bg-amber-500/10 px-2 py-1 rounded" title={post.moderation_result.violations?.join(', ')}>
                         <AlertTriangle size={10} /> Flagged
                      </div>
                   )}
                   
                   {activeTab === 'discover' && (
                      <div className="flex items-center gap-1 text-zinc-500 text-[11px] font-medium">
                         <Eye size={12} /> {post.view_count || 0}
                      </div>
                   )}
                </div>
                
                {activeTab === 'discover' && (
                   <Link href={`/blog/${post.slug}`} className="absolute inset-0 z-10">
                     <span className="sr-only">View Article</span>
                   </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
