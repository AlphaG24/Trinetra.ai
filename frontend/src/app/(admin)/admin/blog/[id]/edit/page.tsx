'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import RichEditor from '@/src/components/blog/RichEditor'
import { createBrowserClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const supabase = createBrowserClient()

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const router = useRouter()

  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [autoSaveStatus, setAutoSaveStatus] = useState('')

  useEffect(() => {
    async function fetchPost() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', id)
          .single()

        if (error || !data) {
          toast.error('Article not found')
          router.push('/admin/blog')
          return
        }

        // Map old DB cover_image to cover_image_url if present
        const mappedData = {
          ...data,
          cover_image_url: data.cover_image_url || data.cover_image || '',
          author_avatar_url: data.author_avatar_url || data.author_avatar || '',
          read_time_minutes: data.read_time_minutes || data.read_time || 1,
          seo_title: data.seo_title || data.title || '',
          seo_description: data.seo_description || data.excerpt || ''
        }

        setPost(mappedData)
      } catch (err: any) {
        toast.error('Failed to fetch article: ' + err.message)
        router.push('/admin/blog')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchPost()
  }, [id, router])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        <p className="text-xs">Loading article details...</p>
      </div>
    )
  }

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
            Edit Article
          </h1>
          <p className="text-zinc-400 text-xs mt-0.5">
            {autoSaveStatus || `Editing "${post?.title || 'Article'}"`}
          </p>
        </div>
      </div>

      <RichEditor
        post={post}
        isEditing={true}
        onSave={() => router.push('/admin/blog')}
        onCancel={() => router.push('/admin/blog')}
        onAutoSave={(status: string) => setAutoSaveStatus(status)}
      />
    </div>
  )
}
