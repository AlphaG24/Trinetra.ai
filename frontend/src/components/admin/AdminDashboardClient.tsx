'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  FileText, Eye, Heart, MessageCircle, Users, 
  Trash2, CheckCircle, XCircle, BarChart3,
  TrendingUp, Search, Filter
} from 'lucide-react'

// FULL ADMIN DASHBOARD WITH:
// - Stats overview with charts
// - Posts management (edit/delete/publish)
// - Comments management (view/delete/moderate)
// - Likes overview
// - Subscribers list
// - Search and filter for each section

type Tab = 'overview' | 'posts' | 'comments' | 'likes' | 'subscribers'

export function AdminDashboardClient({ 
  initialPosts, 
  initialComments, 
  initialLikes,
  initialSubscribers
}: any) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [posts, setPosts] = useState(initialPosts)
  const [comments, setComments] = useState(initialComments)
  const [likes, setLikes] = useState(initialLikes)
  const [subscribers, setSubscribers] = useState(initialSubscribers)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  const stats = {
    totalPosts: posts.length,
    totalViews: posts.reduce((sum: number, p: any) => sum + (p.views_count || 0), 0),
    totalLikes: likes.length,
    totalComments: comments.length,
    totalSubscribers: subscribers.length,
    publishedPosts: posts.filter((p: any) => p.status === 'published').length,
    draftPosts: posts.filter((p: any) => p.status === 'draft').length,
  }

  const handleDeleteComment = async (id: string) => {
    if (!confirm('Delete this comment permanently?')) return
    await supabase.from('comments').delete().eq('id', id)
    setComments((prev: any[]) => prev.filter((c: any) => c.id !== id))
  }

  const handleDeletePost = async (id: string) => {
    if (!confirm('Delete this post and all its data?')) return
    await supabase.from('posts').delete().eq('id', id)
    setPosts((prev: any[]) => prev.filter((p: any) => p.id !== id))
  }

  const handleDeleteLike = async (id: string) => {
    await supabase.from('post_likes').delete().eq('id', id)
    setLikes((prev: any[]) => prev.filter((l: any) => l.id !== id))
  }

  const handleDeleteSubscriber = async (id: string) => {
    if (!confirm('Remove subscriber?')) return
    await supabase.from('subscribers').delete().eq('id', id)
    setSubscribers((prev: any[]) => prev.filter((s: any) => s.id !== id))
  }

  const handleTogglePublish = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published'
    await supabase.from('posts').update({ status: newStatus }).eq('id', id)
    setPosts((prev: any[]) => prev.map((p: any) => 
      p.id === id ? { ...p, status: newStatus } : p
    ))
  }

  const tabs: { key: Tab; label: string; icon: any; count: number }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3, count: 0 },
    { key: 'posts', label: 'Posts', icon: FileText, count: stats.totalPosts },
    { key: 'comments', label: 'Comments', icon: MessageCircle, count: stats.totalComments },
    { key: 'likes', label: 'Likes', icon: Heart, count: stats.totalLikes },
    { key: 'subscribers', label: 'Subscribers', icon: Users, count: stats.totalSubscribers },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Blog Admin</h1>
            <p className="text-xs text-white/40">Full management console</p>
          </div>
          <div className="flex gap-3">
            <a 
              href="/blog" 
              className="px-4 py-2 text-sm border border-white/20 rounded-lg 
                         text-white/70 hover:text-white hover:border-white/40 transition-all"
            >
              View Blog
            </a>
            <a 
              href="/admin/posts/new"
              className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 
                         rounded-lg text-white transition-all font-medium"
            >
              + New Post
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Posts', value: stats.totalPosts, icon: FileText, color: 'purple' },
            { label: 'Total Views', value: stats.totalViews, icon: Eye, color: 'blue' },
            { label: 'Total Likes', value: stats.totalLikes, icon: Heart, color: 'pink' },
            { label: 'Comments', value: stats.totalComments, icon: MessageCircle, color: 'green' },
            { label: 'Subscribers', value: stats.totalSubscribers, icon: Users, color: 'orange' },
          ].map(stat => (
            <div 
              key={stat.label}
              className="bg-white/5 border border-white/10 rounded-xl p-4 
                         hover:border-white/20 transition-all group"
            >
              <div className={`w-10 h-10 rounded-lg bg-${stat.color}-500/20 
                               flex items-center justify-center mb-3 
                               group-hover:scale-110 transition-transform`}>
                <stat.icon size={20} className={`text-${stat.color}-400`} />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/40 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm 
                          font-medium transition-all whitespace-nowrap
                          ${activeTab === tab.key 
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                            : 'text-white/50 hover:text-white hover:bg-white/10'
                          }`}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full
                  ${activeTab === tab.key ? 'bg-white/20' : 'bg-white/10'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        {activeTab !== 'overview' && (
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5
                         text-white placeholder-white/30 focus:outline-none 
                         focus:border-purple-500 transition-colors"
            />
          </div>
        )}

        {/* TAB CONTENT */}
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-purple-400" />
                Post Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Published</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-green-500 rounded-full" 
                         style={{ width: `${(stats.publishedPosts / Math.max(stats.totalPosts, 1)) * 100}px` }} />
                    <span className="text-white font-medium">{stats.publishedPosts}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Drafts</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-yellow-500 rounded-full"
                         style={{ width: `${(stats.draftPosts / Math.max(stats.totalPosts, 1)) * 100}px` }} />
                    <span className="text-white font-medium">{stats.draftPosts}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-4">Recent Activity</h3>
              <div className="space-y-2">
                {comments.slice(0, 5).map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <MessageCircle size={14} className="text-purple-400 flex-shrink-0" />
                    <span className="text-white/70 truncate">
                      <span className="text-white">{c.name}</span> commented on{' '}
                      <span className="text-purple-400">{c.posts?.title}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* POSTS TAB */}
        {activeTab === 'posts' && (
          <div className="space-y-3">
            {posts
              .filter((p: any) => 
                p.title?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((post: any) => (
              <div 
                key={post.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4
                           flex items-center justify-between gap-4
                           hover:border-white/20 transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-white truncate">{post.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0
                      ${post.status === 'published' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                      {post.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <Eye size={12} /> {post.views_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart size={12} /> {post.likes_count || 0}
                    </span>
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleTogglePublish(post.id, post.status)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    title={post.status === 'published' ? 'Unpublish' : 'Publish'}
                  >
                    {post.status === 'published' 
                      ? <XCircle size={16} className="text-yellow-400" />
                      : <CheckCircle size={16} className="text-green-400" />
                    }
                  </button>
                  <a 
                    href={`/admin/posts/${post.id}/edit`}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60"
                  >
                    Edit
                  </a>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* COMMENTS TAB */}
        {activeTab === 'comments' && (
          <div className="space-y-3">
            {comments
              .filter((c: any) =>
                c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.content?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((comment: any) => (
              <div 
                key={comment.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4
                           hover:border-white/20 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{comment.name}</span>
                      {comment.email && (
                        <span className="text-xs text-white/30">{comment.email}</span>
                      )}
                      <span className="text-xs text-purple-400">
                        on: {comment.posts?.title}
                      </span>
                    </div>
                    <p className="text-sm text-white/70">{comment.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-white/30">
                      <span>{new Date(comment.created_at).toLocaleString()}</span>
                      <span className="flex items-center gap-1">
                        <Heart size={12} /> {comment.likes_count || 0}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="p-2 rounded-lg hover:bg-red-500/20 opacity-0 
                               group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LIKES TAB */}
        {activeTab === 'likes' && (
          <div className="space-y-3">
            {likes
              .filter((l: any) =>
                l.posts?.title?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((like: any) => (
              <div
                key={like.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4
                           flex items-center justify-between
                           hover:border-white/20 transition-all group"
              >
                <div>
                  <p className="text-white text-sm">
                    Like on: <span className="text-purple-400">{like.posts?.title}</span>
                  </p>
                  <p className="text-xs text-white/30 mt-1">
                    {new Date(like.created_at).toLocaleString()}
                    {like.user_id && ` • User: ${like.user_id.slice(0, 8)}...`}
                    {like.fingerprint && ` • Guest: ${like.fingerprint.slice(0, 8)}...`}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteLike(like.id)}
                  className="p-2 rounded-lg hover:bg-red-500/20 opacity-0 
                             group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={16} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* SUBSCRIBERS TAB */}
        {activeTab === 'subscribers' && (
          <div className="space-y-3">
            {subscribers
              .filter((s: any) =>
                s.email?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((sub: any) => (
              <div
                key={sub.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4
                           flex items-center justify-between
                           hover:border-white/20 transition-all group"
              >
                <div>
                  <p className="text-white">{sub.email}</p>
                  <p className="text-xs text-white/30 mt-1">
                    Subscribed: {new Date(sub.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteSubscriber(sub.id)}
                  className="p-2 rounded-lg hover:bg-red-500/20 opacity-0
                             group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={16} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
