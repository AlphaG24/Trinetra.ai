'use client'

import { useState, useOptimistic } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ThumbsUp, MessageCircle, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Comment {
  id: string
  post_id: string
  name: string
  email?: string
  content: string
  created_at: string
  likes_count: number
  is_admin?: boolean
}

interface CommentSectionProps {
  postId: string
  initialComments: Comment[]
  isAdmin?: boolean
}

export function CommentSection({ 
  postId, 
  initialComments,
  isAdmin = false
}: CommentSectionProps) {
  const [comments, setComments] = useState(initialComments)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const supabase = createClient()

  const sortedComments = [...comments].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !content.trim()) {
      setError('Name and comment are required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const { data, error: insertError } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          name: name.trim(),
          email: email.trim() || null,
          content: content.trim(),
          likes_count: 0,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Optimistic add
      setComments(prev => [data, ...prev])
      setName('')
      setEmail('')
      setContent('')

      // Update comment count on post
      await supabase.rpc('increment_comment_count', { post_id: postId })

    } catch (err: any) {
      setError(err.message || 'Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLikeComment = async (commentId: string, currentLikes: number) => {
    const fp = getFingerprint()
    const likeKey = `comment_liked_${commentId}`
    const alreadyLiked = localStorage.getItem(likeKey)

    if (alreadyLiked) {
      localStorage.removeItem(likeKey)
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, likes_count: Math.max(0, c.likes_count - 1) } : c
      ))
      await supabase
        .from('comments')
        .update({ likes_count: Math.max(0, currentLikes - 1) })
        .eq('id', commentId)
    } else {
      localStorage.setItem(likeKey, '1')
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, likes_count: c.likes_count + 1 } : c
      ))
      await supabase
        .from('comments')
        .update({ likes_count: currentLikes + 1 })
        .eq('id', commentId)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!isAdmin) return
    if (!confirm('Delete this comment?')) return
    
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">
          Comments ({comments.length})
        </h3>
        <div className="flex gap-2">
          {(['newest', 'oldest'] as const).map(order => (
            <button
              key={order}
              onClick={() => setSortOrder(order)}
              className={`px-3 py-1 text-sm rounded-full border transition-all
                ${sortOrder === order 
                  ? 'bg-purple-600 border-purple-500 text-white' 
                  : 'border-white/20 text-white/60 hover:border-white/40'
                }`}
            >
              {order.charAt(0).toUpperCase() + order.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm text-white/60">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              maxLength={50}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 
                         text-white placeholder-white/30 focus:outline-none focus:border-purple-500
                         transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-white/60">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2
                         text-white placeholder-white/30 focus:outline-none focus:border-purple-500
                         transition-colors"
            />
            <p className="text-xs text-white/30">Used for avatar only</p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-white/60">Comment *</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value.slice(0, 1000))}
            placeholder="Write your comment..."
            rows={4}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2
                       text-white placeholder-white/30 focus:outline-none focus:border-purple-500
                       transition-colors resize-none"
          />
          <p className="text-xs text-white/30 text-right">{content.length}/1000</p>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 
                        rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 
                     disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg
                     font-medium transition-all duration-200 hover:scale-105 active:scale-95"
        >
          {isSubmitting ? 'Posting...' : 'Post Comment'}
        </button>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {sortedComments.length === 0 ? (
          <p className="text-center text-white/40 py-8">
            No comments yet. Be the first!
          </p>
        ) : (
          sortedComments.map(comment => (
            <div 
              key={comment.id}
              className="bg-white/5 border border-white/10 rounded-xl p-4 
                         hover:border-white/20 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 
                                  to-pink-500 flex items-center justify-center flex-shrink-0
                                  text-white font-bold text-sm">
                    {comment.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-white">{comment.name}</p>
                    <p className="text-xs text-white/40">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg
                               hover:bg-red-500/20 text-red-400 transition-all"
                    title="Delete comment"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <p className="mt-3 text-white/80 text-sm leading-relaxed pl-12">
                {comment.content}
              </p>

              <div className="mt-3 pl-12 flex items-center gap-3">
                <button
                  onClick={() => handleLikeComment(comment.id, comment.likes_count)}
                  className="flex items-center gap-1.5 text-xs text-white/40 
                             hover:text-purple-400 transition-colors"
                >
                  <ThumbsUp size={14} />
                  <span>{comment.likes_count}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function getFingerprint(): string {
  const stored = localStorage.getItem('user_fingerprint')
  if (stored) return stored
  const fp = Math.random().toString(36).substring(2) + Date.now().toString(36)
  localStorage.setItem('user_fingerprint', fp)
  return fp
}
