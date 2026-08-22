'use client'

import { useState } from 'react'
import { Linkedin, Facebook, Link as LinkIcon, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface Post {
  title: string
  slug: string
}

interface ShareButtonsProps {
  post: Post
}

export default function ShareButtons({ post }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  // In Next.js, window is only available on client
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/blog/${post.slug}`
    : ''

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('Link copied to clipboard! 🔗')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy link.')
    }
  }

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`
    window.open(url, '_blank', 'width=600,height=400')
  }

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'width=600,height=400')
  }

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'width=600,height=400')
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Twitter / X Button */}
      <button
        onClick={shareToTwitter}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-400 transition-colors hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-white"
        title="Share on Twitter"
      >
        {/* Simple X Icon */}
        <span className="font-bold text-[15px] font-sans">X</span>
      </button>

      {/* LinkedIn Button */}
      <button
        onClick={shareToLinkedIn}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-400 transition-colors hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-white"
        title="Share on LinkedIn"
      >
        <Linkedin size={16} />
      </button>

      {/* Facebook Button */}
      <button
        onClick={shareToFacebook}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-400 transition-colors hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-white"
        title="Share on Facebook"
      >
        <Facebook size={16} />
      </button>

      {/* Copy Link Button */}
      <button
        onClick={handleCopyLink}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-400 transition-colors hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-white"
        title="Copy Link"
      >
        {copied ? <Check size={16} className="text-emerald-400" /> : <LinkIcon size={16} />}
      </button>
    </div>
  )
}
