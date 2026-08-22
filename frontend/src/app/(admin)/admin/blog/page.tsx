'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  FileText, Eye, Plus, Search, Pencil, Copy, Trash2, Globe, FileClock, 
  TrendingUp, CheckSquare, Square, RefreshCw, Loader2, ExternalLink, Settings,
  AlertTriangle, ShieldAlert
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createBrowserClient } from '@/lib/supabase/client'

interface Post {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  status: string
  review_status?: string
  author_name: string
  author_id?: string
  view_count: number
  published_at?: string
  created_at: string
  moderation_result?: any
}

const CATEGORIES = ['All', 'Product', 'Industry', 'Guide', 'News']
const STATUSES = ['All', 'draft', 'pending', 'published', 'archived']

export default function AdminBlogPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'moderation'>('all')
  
  // Filtering & Search
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [status, setStatus] = useState('All')
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // Settings Modal
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState({
    blog_public_creation_enabled: 'false',
    blog_require_approval: 'true'
  })
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    drafts: 0,
    pending: 0,
    views: 0
  })

  const loadSettings = async () => {
    const { data } = await supabase.from('system_config').select('config_key, config_value').in('config_key', ['blog_public_creation_enabled', 'blog_require_approval'])
    if (data) {
      const newSettings = { ...settings }
      data.forEach((item: any) => {
        if (item.config_key === 'blog_public_creation_enabled') newSettings.blog_public_creation_enabled = item.config_value
        if (item.config_key === 'blog_require_approval') newSettings.blog_require_approval = item.config_value
      })
      setSettings(newSettings)
    }
  }

  const saveSettings = async () => {
    try {
      await supabase.from('system_config').upsert([
        { config_key: 'blog_public_creation_enabled', config_value: settings.blog_public_creation_enabled },
        { config_key: 'blog_require_approval', config_value: settings.blog_require_approval }
      ])
      toast.success('Settings saved!')
      setShowSettings(false)
    } catch (e) {
      toast.error('Failed to save settings')
    }
  }

  // Fetch posts from admin API
  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '500', 
        category: category !== 'All' ? category : '',
        status: status !== 'All' ? status : '',
        search
      })
      const res = await fetch(`/api/admin/blog?${params}`)
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch posts')
      
      const allPosts = data.posts || []
      
      // Calculate Stats
      const totalViews = allPosts.reduce((sum: number, p: Post) => sum + (p.view_count || 0), 0)
      setStats({
        total: allPosts.length,
        published: allPosts.filter((p: Post) => p.status === 'published').length,
        drafts: allPosts.filter((p: Post) => p.status === 'draft' && p.review_status !== 'pending').length,
        pending: allPosts.filter((p: Post) => p.review_status === 'pending').length,
        views: totalViews
      })

      // Filter based on active tab
      if (activeTab === 'moderation') {
        setPosts(allPosts.filter((p: Post) => p.review_status === 'pending'))
      } else {
        setPosts(allPosts)
      }
      
    } catch (err: any) {
      toast.error(err.message || 'Error loading dashboard data')
    } finally {
      setLoading(false)
    }
  }, [category, status, search, activeTab])

  useEffect(() => {
    fetchPosts()
    loadSettings()
  }, [fetchPosts])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete post')
      toast.success('Post deleted successfully! 🗑️')
      fetchPosts()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete post')
    }
  }

  const handleDuplicate = async (post: Post) => {
    try {
      const resDetail = await fetch(`/api/admin/blog/${post.id}`)
      const detailData = await resDetail.json()
      if (!resDetail.ok) throw new Error('Failed to fetch article details')

      const original = detailData.post
      const payload = {
        ...original,
        title: `${original.title} (Copy)`,
        slug: `${original.slug}-copy-${Math.random().toString(36).slice(2, 6)}`,
        status: 'draft',
        review_status: 'approved', // Admin copies are approved
        published_at: null,
        view_count: 0
      }

      const resInsert = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!resInsert.ok) throw new Error('Failed to insert duplicated post')
      toast.success('Post duplicated as draft! 📋')
      fetchPosts()
    } catch (err: any) {
      toast.error(err.message || 'Failed to duplicate post')
    }
  }

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.length === 0) return
    let succeeded = 0
    let failed = 0

    const updatePayload = newStatus === 'approved' 
      ? { review_status: 'approved', status: 'published' }
      : newStatus === 'rejected' 
        ? { review_status: 'rejected', status: 'archived' }
        : { status: newStatus }

    await Promise.all(
      selectedIds.map(async (id) => {
        try {
          const res = await fetch(`/api/admin/blog/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload)
          })
          if (res.ok) succeeded++
          else failed++
        } catch {
          failed++
        }
      })
    )

    toast.success(`Bulk updated: ${succeeded} succeeded, ${failed} failed.`)
    setSelectedIds([])
    fetchPosts()
  }

  const handleModerate = async (id: string, action: 'approve' | 'reject') => {
    try {
      const payload = action === 'approve' 
        ? { review_status: 'approved', status: 'published' }
        : { review_status: 'rejected', status: 'archived' }

      const res = await fetch(`/api/admin/blog/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Failed to moderate post')
      toast.success(`Post ${action}d successfully`)
      fetchPosts()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === posts.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(posts.map(p => p.id))
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  return (
    <div className="space-y-6 text-white min-h-screen selection:bg-violet-500/30">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
            Blog Management
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Create, edit, publish, and track analytics for platform articles and updates.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 px-5 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
          >
            <Settings size={16} />
            Settings
          </button>
          <button
            onClick={() => router.push('/admin/blog/new')}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4"
          >
            <Plus size={16} />
            Create Article
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Total Articles', value: stats.total, icon: FileText, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Published', value: stats.published, icon: Globe, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Admin Drafts', value: stats.drafts, icon: FileClock, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
          { label: 'Needs Review', value: stats.pending, icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Total Views', value: stats.views, icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 flex items-center gap-4 backdrop-blur-xl">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.bg}`}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">{stat.label}</span>
              <span className="text-2xl font-black text-white">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] mb-4">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'all' ? 'border-violet-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          All Posts
        </button>
        <button
          onClick={() => setActiveTab('moderation')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'moderation' ? 'border-violet-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          Moderation Queue
          {stats.pending > 0 && (
            <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full">{stats.pending}</span>
          )}
        </button>
      </div>

      {/* Filters & Bulk Toolbar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-xs text-white outline-none focus:border-violet-500"
            />
          </div>

          {activeTab === 'all' && (
            <>
              {/* Category */}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-xs text-zinc-300 outline-none focus:border-violet-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>Category: {cat}</option>
                ))}
              </select>

              {/* Status */}
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-xs text-zinc-300 outline-none focus:border-violet-500"
              >
                {STATUSES.map(stat => (
                  <option key={stat} value={stat}>Status: {stat}</option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Bulk Action Controls */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-[var(--border)]">
            <span className="text-xs text-zinc-500 font-bold mr-2">{selectedIds.length} Selected:</span>
            {activeTab === 'moderation' ? (
              <>
                <button
                  onClick={() => handleBulkStatusChange('approved')}
                  className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors"
                >
                  Approve Selected
                </button>
                <button
                  onClick={() => handleBulkStatusChange('rejected')}
                  className="h-9 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-colors"
                >
                  Reject Selected
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleBulkStatusChange('published')}
                  className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors"
                >
                  Publish Selected
                </button>
                <button
                  onClick={() => handleBulkStatusChange('archived')}
                  className="h-9 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 border border-[var(--border)] transition-colors"
                >
                  Archive Selected
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Table grid */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden backdrop-blur-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            <p className="text-xs">Loading dashboard listing...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-sm font-semibold">
            {activeTab === 'moderation' ? "No posts pending review! 🎉" : "No articles match your filters."}
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-zinc-200">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background)] text-xs font-extrabold uppercase tracking-wider text-zinc-500">
                  <th className="p-4 w-12 text-center">
                    <button type="button" onClick={toggleSelectAll}>
                      {selectedIds.length === posts.length ? (
                        <CheckSquare size={16} className="text-violet-400" />
                      ) : (
                        <Square size={16} className="text-zinc-600" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">Title</th>
                  <th className="p-4 w-28">Status</th>
                  <th className="p-4 w-28">Author</th>
                  {activeTab === 'moderation' ? (
                     <th className="p-4 w-40">AI Flag</th>
                  ) : (
                    <th className="p-4 w-32">Published</th>
                  )}
                  <th className="p-4 w-40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-xs font-medium">
                {posts.map((post) => {
                  const isSelected = selectedIds.includes(post.id)
                  const pubDate = post.published_at
                    ? new Date(post.published_at).toLocaleDateString()
                    : '-'
                  
                  return (
                    <tr key={post.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-center">
                        <button type="button" onClick={() => toggleSelect(post.id)}>
                          {isSelected ? (
                            <CheckSquare size={16} className="text-violet-400" />
                          ) : (
                            <Square size={16} className="text-zinc-700" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 font-bold text-white max-w-sm">
                        <div className="truncate">{post.title}</div>
                        <div className="text-[10px] text-zinc-500 font-normal mt-0.5 truncate">{post.slug}</div>
                      </td>
                      <td className="p-4">
                        <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase border ${
                          post.review_status === 'pending'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            : post.status === 'published'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : post.status === 'archived'
                            ? 'bg-zinc-800 border-[var(--border)] text-zinc-400'
                            : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400' // Draft
                        }`}>
                          {post.review_status === 'pending' ? 'Pending' : post.status}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-400">
                        {post.author_name}
                      </td>
                      
                      {activeTab === 'moderation' ? (
                        <td className="p-4">
                          {post.moderation_result && post.moderation_result.severity !== 'none' ? (
                            <div className="flex items-center gap-1 text-amber-400 text-[10px]" title={post.moderation_result.violations?.join(', ')}>
                              <AlertTriangle size={12} /> Flagged ({post.moderation_result.severity})
                            </div>
                          ) : (
                            <div className="text-[10px] text-emerald-500">Clean</div>
                          )}
                        </td>
                      ) : (
                        <td className="p-4 text-zinc-500">{pubDate}</td>
                      )}
                      
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {activeTab === 'moderation' && (
                             <>
                              <button
                                onClick={() => handleModerate(post.id, 'approve')}
                                className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all text-[10px] font-bold"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleModerate(post.id, 'reject')}
                                className="px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all text-[10px] font-bold"
                              >
                                Reject
                              </button>
                             </>
                          )}
                          <button
                            onClick={() => router.push(`/admin/blog/${post.id}/edit`)}
                            className="p-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-zinc-400 hover:text-white hover:border-violet-500/30 transition-all"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          
                          {activeTab === 'all' && (
                            <button
                              onClick={() => handleDuplicate(post)}
                              className="p-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-zinc-400 hover:text-white hover:border-violet-500/30 transition-all"
                              title="Duplicate"
                            >
                              <Copy size={13} />
                            </button>
                          )}

                          <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-zinc-400 hover:text-white hover:border-violet-500/30 transition-all inline-flex"
                            title="Preview"
                          >
                            <ExternalLink size={13} />
                          </a>

                          <button
                            onClick={() => handleDelete(post.id)}
                            className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Global Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <Settings size={20} className="text-violet-400" /> Global Blog Settings
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white text-2xl leading-none">&times;</button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
                <div>
                  <div className="font-bold text-sm text-white">Public Blog Creation</div>
                  <div className="text-xs text-zinc-400">Allow users to write and submit blogs</div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only" checked={settings.blog_public_creation_enabled === 'true'} onChange={(e) => setSettings({...settings, blog_public_creation_enabled: e.target.checked ? 'true' : 'false'})} />
                  <div className="h-6 w-11 rounded-full bg-zinc-700 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-focus:outline-none" />
                </label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
                <div>
                  <div className="font-bold text-sm text-white">Require Approval</div>
                  <div className="text-xs text-zinc-400">User posts must be manually approved</div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only" checked={settings.blog_require_approval === 'true'} onChange={(e) => setSettings({...settings, blog_require_approval: e.target.checked ? 'true' : 'false'})} />
                  <div className="h-6 w-11 rounded-full bg-zinc-700 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-focus:outline-none" />
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowSettings(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-bold text-zinc-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={saveSettings} className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-bold text-white transition-colors">Save Settings</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
