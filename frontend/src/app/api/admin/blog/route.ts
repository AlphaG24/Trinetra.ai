import { requireAdmin, safeApiHandler } from '@/utils/apiAuth'
import { NextResponse } from 'next/server'

// GET handler: Lists all posts (including drafts/archived) for the dashboard
export const GET = safeApiHandler(async (request: Request) => {
  const authRes = await requireAdmin()
  if (authRes instanceof Response) return authRes

  const { supabase } = authRes
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '10', 10)

  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })

  if (category && category !== 'All') {
    query = query.eq('category', category)
  }

  if (status && status !== 'All') {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,excerpt.ilike.%${search}%`)
  }

  const { data: posts, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('[Admin API Blog GET] Database Error:', error)
    return NextResponse.json({ error: 'Failed to query blog posts' }, { status: 500 })
  }

  return NextResponse.json({
    posts: posts || [],
    total: count || 0,
    page,
    limit,
  })
})

// POST handler: Creates a new blog post
export const POST = safeApiHandler(async (request: Request) => {
  const authRes = await requireAdmin()
  if (authRes instanceof Response) return authRes

  const { supabase } = authRes
  const body = await request.json()

  // Validate required inputs
  if (!body.title || !body.slug) {
    return NextResponse.json({ error: 'Title and Slug are required fields' }, { status: 400 })
  }

  const postData = {
    title: body.title,
    slug: body.slug,
    excerpt: body.excerpt || '',
    content: body.content || '',
    cover_image_url: body.cover_image_url || '',
    category: body.category || 'Product',
    tags: Array.isArray(body.tags) ? body.tags : [],
    author_name: body.author_name || 'Admin',
    author_avatar_url: body.author_avatar_url || '',
    read_time_minutes: parseInt(body.read_time_minutes || '1', 10) || 1,
    status: body.status || 'draft',
    published_at: body.status === 'published' ? new Date().toISOString() : null,
    seo_title: body.seo_title || body.title,
    seo_description: body.seo_description || body.excerpt || '',
    featured: !!body.featured,
  }

  const { data: newPost, error } = await supabase
    .from('blog_posts')
    .insert(postData)
    .select('*')
    .single()

  if (error) {
    console.error('[Admin API Blog POST] Error creating post:', error)
    return NextResponse.json({ error: 'Failed to create blog post: ' + error.message }, { status: 500 })
  }

  if (newPost && newPost.status === 'published') {
    // Asynchronously broadcast to all newsletter subscribers
    import('@/lib/newsletter').then(({ broadcastNewBlogPost }) => {
      broadcastNewBlogPost(newPost).catch((err) =>
        console.error('[Admin API Blog POST] Error broadcasting newsletter:', err)
      )
    })
  }

  return NextResponse.json({ post: newPost })
})
