'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import RichEditor from '@/components/blog/RichEditor'

export default function NewUserBlogPage() {
  const router = useRouter()
  const [saveStatus, setSaveStatus] = useState('')

  return (
    <div className="space-y-6 text-white min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-white/5 border border-[var(--border)] text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white font-display">
            Write an Article
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
             <span>Community Blog</span>
             {saveStatus && (
               <>
                 <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                 <span className="text-violet-400">{saveStatus}</span>
               </>
             )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-2 md:p-6 shadow-2xl">
        <RichEditor
          post={null}
          isEditing={false}
          userRole="user"
          onSave={() => router.push('/dashboard/blogs')}
          onCancel={() => router.push('/dashboard/blogs')}
          onAutoSave={setSaveStatus}
        />
      </div>
    </div>
  )
}
