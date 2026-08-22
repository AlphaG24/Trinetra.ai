import { requireAdmin, safeApiHandler } from '@/utils/apiAuth'
import { NextResponse } from 'next/server'

// GET handler: Fetch details of a single post by ID
export const GET = safeApiHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authRes = await requireAdmin()
  if (authRes instanceof Response) return authRes

  const resolvedParams = await params
  const { id } = resolvedParams
  const { supabase } = authRes

  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[Admin API Blog ID GET] Database Error:', error)
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 })
  }

  if (!post) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  return NextResponse.json({ post })
})

// PATCH handler: Update details of a post by ID
export const PATCH = safeApiHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authRes = await requireAdmin()
  if (authRes instanceof Response) return authRes

  const resolvedParams = await params
  const { id } = resolvedParams
  const { supabase } = authRes
  const body = await request.json()

  // First fetch current post state to see if published_at is set
  const { data: currentPost, error: fetchError } = await supabase
    .from('blog_posts')
    .select('published_at, status')
    .eq('id', id)
    .single()

  if (fetchError || !currentPost) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const updateData: Record<string, any> = {}

  if (body.title !== undefined) updateData.title = body.title
  if (body.slug !== undefined) updateData.slug = body.slug
  if (body.excerpt !== undefined) updateData.excerpt = body.excerpt
  if (body.content !== undefined) updateData.content = body.content
  if (body.cover_image_url !== undefined) updateData.cover_image_url = body.cover_image_url
  if (body.category !== undefined) updateData.category = body.category
  if (body.tags !== undefined) updateData.tags = body.tags
  if (body.author_name !== undefined) updateData.author_name = body.author_name
  if (body.author_avatar_url !== undefined) updateData.author_avatar_url = body.author_avatar_url
  if (body.read_time_minutes !== undefined) updateData.read_time_minutes = parseInt(body.read_time_minutes, 10) || 1
  if (body.featured !== undefined) updateData.featured = !!body.featured
  if (body.status !== undefined) {
    updateData.status = body.status
    // Handle publishing date timestamp
    if (body.status === 'published') {
      updateData.published_at = currentPost.published_at || new Date().toISOString()
    } else if (body.status === 'draft') {
      updateData.published_at = null
    }
  }
  if (body.seo_title !== undefined) updateData.seo_title = body.seo_title
  if (body.seo_description !== undefined) updateData.seo_description = body.seo_description

  updateData.updated_at = new Date().toISOString()

  const { data: updatedPost, error } = await supabase
    .from('blog_posts')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('[Admin API Blog ID PATCH] Error updating post:', error)
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }

  // If newly transitioned to published, broadcast to newsletter subscribers
  if (currentPost.status !== 'published' && updatedPost && updatedPost.status === 'published') {
    import('@/lib/newsletter').then(({ broadcastNewBlogPost }) => {
      broadcastNewBlogPost(updatedPost).catch((err) =>
        console.error('[Admin API Blog ID PATCH] Error broadcasting newsletter:', err)
      )
    })
  }

  return NextResponse.json({ post: updatedPost })
})

// DELETE handler: Deletes a post
export const DELETE = safeApiHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authRes = await requireAdmin()
  if (authRes instanceof Response) return authRes

  const resolvedParams = await params
  const { id } = resolvedParams
  const { supabase } = authRes

  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[Admin API Blog ID DELETE] Error:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})
