'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RichEditor from '@/src/components/blog/RichEditor'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewBlogPostPage() {
  const router = useRouter()
  const [autoSaveStatus, setAutoSaveStatus] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/blog"
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
            Create New Article
          </h1>
          <p className="text-zinc-400 text-xs mt-0.5">
            {autoSaveStatus || 'Markdown-enabled post editor with auto-save'}
          </p>
        </div>
      </div>

      <RichEditor
        post={null}
        isEditing={false}
        onSave={() => router.push('/admin/blog')}
        onCancel={() => router.push('/admin/blog')}
        onAutoSave={(status: string) => setAutoSaveStatus(status)}
      />
    </div>
  )
}

