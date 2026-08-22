'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { 
  Bold, Italic, Heading2, Heading3, Link as LinkIcon, Image as ImageIcon, 
  Quote, Code, List, ListOrdered, Eye, ChevronDown, ChevronUp, Save, Upload, Loader2,
  Wand2, RefreshCcw, CheckCircle2, ArrowRight, FileText, PanelLeftClose, PanelRightClose
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import slugify from 'slugify'

interface PostData {
  id?: string
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image_url: string
  category: string
  tags: string[]
  author_name: string
  author_avatar_url: string
  read_time_minutes: number
  status: string
  featured: boolean
  seo_title: string
  seo_description: string
}

interface RichEditorProps {
  post: PostData | null
  isEditing: boolean
  onSave: () => void
  onCancel: () => void
  onAutoSave?: (status: string) => void
  userRole?: string
}

const CATEGORIES = ['Product', 'Industry', 'Guide', 'News']

export default function RichEditor({ post, isEditing, onSave, onCancel, onAutoSave, userRole = 'admin' }: RichEditorProps) {
  const supabase = createBrowserClient()

  // Core post states
  const [title, setTitle] = useState(post?.title || '')
  const [slug, setSlug] = useState(post?.slug || '')
  const [excerpt, setExcerpt] = useState(post?.excerpt || '')
  const [content, setContent] = useState(post?.content || '')
  const [coverImageUrl, setCoverImageUrl] = useState(post?.cover_image_url || '')
  const [category, setCategory] = useState(post?.category || CATEGORIES[0])
  const [tags, setTags] = useState<string[]>(post?.tags || [])
  const [authorName, setAuthorName] = useState(post?.author_name || (userRole === 'admin' ? 'Admin' : ''))
  const [authorAvatarUrl, setAuthorAvatarUrl] = useState(post?.author_avatar_url || '')
  const [readTimeMinutes, setReadTimeMinutes] = useState(post?.read_time_minutes || 1)
  const [status, setStatus] = useState(post?.status || 'draft')
  const [featured, setFeatured] = useState(post?.featured || false)

  // SEO States
  const [seoTitle, setSeoTitle] = useState(post?.seo_title || '')
  const [seoDescription, setSeoDescription] = useState(post?.seo_description || '')
  const [seoExpanded, setSeoExpanded] = useState(false)

  // UI States
  const [showPreview, setShowPreview] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-calculate read time based on word count
  useEffect(() => {
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length
    const calculatedMinutes = Math.max(1, Math.ceil(wordCount / 200))
    setReadTimeMinutes(calculatedMinutes)
  }, [content])

  // Auto-generate slug from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setTitle(val)
    if (!slugManuallyEdited) {
      setSlug(slugify(val, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g }))
    }
  }

  // Insert markdown helper at cursor
  const insertMarkdown = (syntax: string, placeholder = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const startPos = textarea.selectionStart
    const endPos = textarea.selectionEnd
    const selectedText = textarea.value.substring(startPos, endPos)

    const textToInsert = syntax.includes('%s') 
      ? syntax.replace('%s', selectedText || placeholder)
      : syntax + (selectedText || placeholder)

    const nextContent = content.substring(0, startPos) + textToInsert + content.substring(endPos)
    setContent(nextContent)

    // Reset cursor focus
    setTimeout(() => {
      textarea.focus()
      const nextCursorPos = startPos + textToInsert.length
      textarea.setSelectionRange(nextCursorPos, nextCursorPos)
    }, 50)
  }

  // AI Actions
  const handleAIAction = async (action: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const startPos = textarea.selectionStart
    const endPos = textarea.selectionEnd
    const selectedText = textarea.value.substring(startPos, endPos)

    if (!selectedText) {
      toast.error('Please highlight some text in the editor first.')
      return
    }

    setIsEnhancing(true)
    const loadingToast = toast.loading('AI is working...')

    try {
      const res = await fetch('/api/blog/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectedText, action, blog_title: title })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Enhancement failed')

      const enhancedText = data.enhanced_text
      const nextContent = content.substring(0, startPos) + enhancedText + content.substring(endPos)
      setContent(nextContent)
      toast.success('Text enhanced!', { id: loadingToast })
      
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(startPos, startPos + enhancedText.length)
      }, 50)
    } catch (err: any) {
      toast.error(err.message, { id: loadingToast })
    } finally {
      setIsEnhancing(false)
    }
  }

  // File upload to Supabase storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase()
      const fileName = `blog-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('blog-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(fileName)

      setCoverImageUrl(publicUrl)
      toast.success('Cover image uploaded! 📸')
    } catch (err: any) {
      toast.error('Image upload failed: ' + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  // Save / Publish
  const handleSave = async (selectedStatus = 'draft') => {
    if (!title) return toast.error('Title is required')
    if (!slug) return toast.error('Slug is required')

    setIsSaving(true)
    try {
      const payload = {
        title,
        slug,
        excerpt,
        content,
        cover_image_url: coverImageUrl,
        category,
        tags,
        author_name: authorName,
        author_avatar_url: authorAvatarUrl,
        read_time_minutes: readTimeMinutes,
        status: selectedStatus,
        featured,
        seo_title: seoTitle || title,
        seo_description: seoDescription || excerpt,
      }

      // If user is not admin, route to user endpoint, else admin endpoint
      const url = userRole === 'admin' || userRole === 'super_admin' 
        ? (isEditing && post?.id ? `/api/admin/blog/${post.id}` : '/api/admin/blog')
        : '/api/dashboard/blogs'
        
      const method = (isEditing && post?.id && (userRole === 'admin' || userRole === 'super_admin')) ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403 && data.violations) {
          throw new Error(data.error + '\\nViolations: ' + data.violations.join(', '))
        }
        throw new Error(data.error || 'Failed to save post')
      }

      toast.success(data.message || (selectedStatus === 'published' ? 'Article Published! 🚀' : 'Draft Saved! 📝'))
      onSave()
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = tagInput.trim().replace(',', '')
      if (val && !tags.includes(val)) {
        setTags([...tags, val])
        setTagInput('')
      }
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  // Auto-save logic
  useEffect(() => {
    if (!onAutoSave || (userRole !== 'admin' && userRole !== 'super_admin')) return
    const interval = setInterval(async () => {
      if (!title || !post?.id) return
      onAutoSave('Auto-saving...')
      try {
        const payload = {
          title, slug, excerpt, content, cover_image_url: coverImageUrl, category, tags,
          author_name: authorName, author_avatar_url: authorAvatarUrl, read_time_minutes: readTimeMinutes,
          status, featured, seo_title: seoTitle || title, seo_description: seoDescription || excerpt,
        }
        await fetch(`/api/admin/blog/${post.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        onAutoSave('● Auto-saved just now')
      } catch {
        onAutoSave('● Auto-save failed')
      }
    }, 45000)
    return () => clearInterval(interval)
  }, [title, slug, excerpt, content, coverImageUrl, category, tags, authorName, authorAvatarUrl, readTimeMinutes, status, featured, seoTitle, seoDescription, post?.id, onAutoSave, userRole])

  return (
    // Static grid — never changes between SSR and client, no hydration mismatch
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-white">

      {/* Editor Column — full width when preview hidden, half when shown */}
      <div className={`flex flex-col space-y-6 ${showPreview ? 'lg:col-span-6' : 'lg:col-span-12'}`}>

        {/* Editor Settings (Title, Slug, Excerpt) */}
        <div className="space-y-4">
          {/* Top Actions */}
          <div className="flex justify-between items-center bg-[var(--card-bg)] p-3 rounded-2xl border border-[var(--border)]">
            <h2 className="text-lg font-bold text-[var(--heading)] px-2">Write Blog</h2>
            <button
              onClick={() => setShowPreview(p => !p)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold transition-colors"
              suppressHydrationWarning
            >
              <Eye size={16} /> {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>

          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Post Title..."
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-5 py-4 text-xl font-bold text-[var(--body)] outline-none focus:border-violet-500 transition-all"
          />

          {(userRole === 'admin' || userRole === 'super_admin') && (
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                setSlugManuallyEdited(true)
              }}
              placeholder="url-slug"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-5 py-3 font-mono text-sm text-violet-400 outline-none focus:border-violet-500 transition-all"
            />
          )}

          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Short excerpt for blog feed cards (max 200 characters)..."
            rows={2}
            className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 text-sm text-[var(--body)] outline-none focus:border-violet-500 transition-all"
          />
        </div>

        {/* Markdown Content Editor */}
        <div className="flex-1 min-h-[500px] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden focus-within:border-violet-500 transition-colors">
          
          {/* AI Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--background)] px-3 py-2">
            <span className="text-xs font-bold uppercase text-zinc-500 flex items-center gap-1 mr-2">
              <Wand2 size={12} className="text-violet-500" /> AI Tools:
            </span>
            {[
              { icon: Wand2, action: 'enhance', label: 'Enhance' },
              { icon: RefreshCcw, action: 'rewrite', label: 'Rewrite' },
              { icon: CheckCircle2, action: 'grammar', label: 'Fix Grammar' },
              { icon: ArrowRight, action: 'continue', label: 'Continue' },
              { icon: FileText, action: 'summarize', label: 'Summarize' },
            ].map((tool, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAIAction(tool.action)}
                disabled={isEnhancing}
                className="flex items-center gap-1.5 rounded-lg bg-violet-600/10 px-2.5 py-1.5 text-xs font-semibold text-violet-400 hover:bg-violet-600/20 hover:text-violet-300 disabled:opacity-50 transition-colors"
              >
                <tool.icon size={13} />
                {tool.label}
              </button>
            ))}
          </div>

          {/* Standard Markdown Toolbar */}
          <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border)] bg-[var(--background)] px-3 py-1.5">
            {[
              { icon: Bold, action: () => insertMarkdown('**%s**', 'bold text'), title: 'Bold' },
              { icon: Italic, action: () => insertMarkdown('*%s*', 'italic text'), title: 'Italic' },
              { icon: Heading2, action: () => insertMarkdown('## %s', 'Heading 2'), title: 'Heading 2' },
              { icon: Heading3, action: () => insertMarkdown('### %s', 'Heading 3'), title: 'Heading 3' },
              { icon: LinkIcon, action: () => insertMarkdown('[%s](url)', 'link text'), title: 'Link' },
              { icon: ImageIcon, action: () => insertMarkdown('![%s](image_url)', 'image alt'), title: 'Image' },
              { icon: Quote, action: () => insertMarkdown('> %s', 'blockquote'), title: 'Quote' },
              { icon: Code, action: () => insertMarkdown('\n```javascript\n%s\n```\n', '// code here'), title: 'Code block' },
              { icon: List, action: () => insertMarkdown('\n- %s', 'list item'), title: 'Bullet list' },
              { icon: ListOrdered, action: () => insertMarkdown('\n1. %s', 'list item'), title: 'Numbered list' },
            ].map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={item.action}
                className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                title={item.title}
              >
                <item.icon size={15} />
              </button>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your blog article using markdown... Highlight text and use AI tools to improve it!"
            className="flex-1 w-full resize-y min-h-[400px] bg-transparent p-5 text-[15px] leading-relaxed text-[var(--body)] outline-none font-mono"
          />
        </div>

        {/* Metadata Sidebar (Always visible at bottom or integrated) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-500">Categories & Tags</h3>
            
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm text-[var(--body)] outline-none focus:border-violet-500"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <div className="flex flex-wrap gap-1.5 p-2 min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--background)]">
              {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 rounded bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)} className="text-[10px] text-zinc-500 hover:text-white font-bold">×</button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Add tag (press Enter)..."
                className="flex-grow bg-transparent text-xs text-white outline-none px-1 py-0.5"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-500">Media</h3>
            <div className="relative border border-dashed border-[var(--border)] rounded-xl overflow-hidden bg-[var(--background)] p-4 flex flex-col items-center justify-center min-h-[144px]">
              {coverImageUrl ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden group/img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setCoverImageUrl('')} className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-zinc-400 hover:text-white">×</button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={24} className="text-zinc-500" />
                  <label className="mt-2 inline-flex h-8 cursor-pointer items-center justify-center rounded-lg bg-violet-600 px-4 text-xs font-semibold text-white hover:bg-violet-500 transition-colors">
                    {isUploading ? <Loader2 size={12} className="animate-spin" /> : 'Upload Cover'}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 flex items-center justify-between">
           <div className="text-xs text-zinc-500 font-bold">
            Word count: {content.trim().split(/\s+/).filter(Boolean).length} | Est. Read: {readTimeMinutes} min
           </div>
           <div className="flex gap-3">
             <button type="button" onClick={onCancel} className="px-5 h-11 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-[var(--border)] transition-all">Cancel</button>
             
             {userRole === 'admin' || userRole === 'super_admin' ? (
               <>
                 <button onClick={() => handleSave('draft')} disabled={isSaving} className="px-5 h-11 rounded-xl font-bold bg-white/5 border border-[var(--border)] hover:bg-white/10 transition-all text-[var(--body)]">Save Draft</button>
                 <button onClick={() => handleSave('published')} disabled={isSaving} className="px-5 h-11 rounded-xl font-bold bg-violet-600 text-white hover:bg-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all flex items-center gap-2">
                   {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Publish
                 </button>
               </>
             ) : (
                <button onClick={() => handleSave('pending')} disabled={isSaving} className="px-5 h-11 rounded-xl font-bold bg-violet-600 text-white hover:bg-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all flex items-center gap-2">
                 {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Submit for Review
               </button>
             )}
           </div>
        </div>

      </div>

      {/* Right Side Live Preview — always in DOM, toggled via CSS. No conditional render = no hydration mismatch */}
      <div className={`lg:col-span-6 flex-col rounded-3xl border border-[var(--border)] bg-black/40 overflow-hidden shadow-2xl relative sticky top-6 max-h-[90vh] ${showPreview ? 'hidden lg:flex' : 'hidden'}`}>
        <div className="absolute top-0 left-0 right-0 h-12 bg-black/60 backdrop-blur-md border-b border-[var(--border)] flex items-center px-6 z-10">
          <span className="text-sm font-bold text-violet-300 flex items-center gap-2"><Eye size={16} /> Live Public Preview</span>
        </div>
        
        <div className="flex-1 overflow-y-auto pt-16 pb-20 px-8 custom-scrollbar">
          {/* Mock Blog Detail Page Layout */}
          <div className="max-w-[800px] mx-auto">
            <span className="text-violet-400 font-bold text-sm tracking-wider uppercase">{category}</span>
            <h1 className="mt-4 text-3xl md:text-5xl font-display font-extrabold text-white leading-[1.1] tracking-tight">{title || 'Untitled Post'}</h1>
            
            <div className="mt-8 flex items-center gap-4 border-b border-white/10 pb-8">
              <div className="h-12 w-12 rounded-full bg-violet-600/20 overflow-hidden border border-violet-500/30">
                {authorAvatarUrl && <img src={authorAvatarUrl} alt="" className="w-full h-full object-cover" />}
              </div>
              <div>
                <div className="font-bold text-white text-sm">{authorName || 'Anonymous'}</div>
                <div className="text-xs text-zinc-500 font-medium">Just now · {readTimeMinutes} min read</div>
              </div>
            </div>

            {coverImageUrl && (
              <div className="mt-10 rounded-2xl overflow-hidden shadow-xl aspect-video border border-white/10">
                <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="mt-12 prose prose-lg prose-invert max-w-none prose-headings:font-display prose-headings:font-bold prose-headings:text-white prose-p:text-zinc-300 prose-p:leading-relaxed prose-a:text-violet-400 prose-img:rounded-xl">
              {content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              ) : (
                <div className="text-zinc-600 italic">Start writing to see the preview...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
