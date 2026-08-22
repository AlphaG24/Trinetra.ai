'use client'

import { Twitter, Linkedin, Facebook, Link as LinkIcon } from 'lucide-react'
import toast from 'react-hot-toast'

interface ShareProps {
  url: string
  title: string
}

export default function StickyShareBar({ url, title }: ShareProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard!')
  }

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  return (
    <div className="fixed bottom-0 left-0 w-full lg:w-auto lg:top-1/3 lg:left-8 lg:-translate-y-1/2 lg:bottom-auto z-40">
      <div className="flex lg:flex-col items-center justify-center gap-2 lg:gap-4 p-4 lg:p-3 bg-[#0c0118]/95 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none border-t border-white/10 lg:border-none shadow-[0_-10px_40px_rgba(0,0,0,0.5)] lg:shadow-none w-full">
        <a
          href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:bg-[#1DA1F2] hover:text-white hover:border-[#1DA1F2] transition-all hover:scale-110"
        >
          <Twitter size={16} fill="currentColor" />
        </a>
        <a
          href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2] transition-all hover:scale-110"
        >
          <Linkedin size={16} fill="currentColor" />
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-all hover:scale-110"
        >
          <Facebook size={16} fill="currentColor" />
        </a>
        <button
          onClick={handleCopy}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:bg-violet-600 hover:text-white hover:border-violet-500 transition-all hover:scale-110"
        >
          <LinkIcon size={16} />
        </button>
      </div>
    </div>
  )
}
