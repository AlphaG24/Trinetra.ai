import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { FALLBACK_BLOG_POSTS } from '@/src/lib/blogData'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')?.toLowerCase()
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '9', 10)

  const from = (page - 1) * limit
  const to = from + limit - 1

  try {
    const supabase = await createClient()
    let query = supabase
      .from('blog_posts')
      .select('*', { count: 'exact' })
      .eq('status', 'published')

    if (category && category !== 'All') {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,excerpt.ilike.%${search}%`)
    }

    // 2.0s timeout race against Supabase latency/522
    const fetchPromise = query
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    const timeoutPromise = new Promise<{ data: null; count: null; error: Error }>((resolve) =>
      setTimeout(() => resolve({ data: null, count: null, error: new Error('Database query timed out') }), 2000)
    )

    const result = await Promise.race([fetchPromise, timeoutPromise])

    if (result.error || !result.data || result.data.length === 0) {
      // Fallback to built-in high quality posts
      let filtered = [...FALLBACK_BLOG_POSTS]
      if (category && category !== 'All') {
        filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase())
      }
      if (search) {
        filtered = filtered.filter(p => 
          p.title.toLowerCase().includes(search) || 
          p.excerpt.toLowerCase().includes(search) || 
          (p.content && p.content.toLowerCase().includes(search))
        )
      }
      const paged = filtered.slice(from, to + 1)
      return NextResponse.json({
        posts: paged,
        total: filtered.length,
        page,
        limit,
        hasMore: filtered.length > page * limit,
        fallback: true
      })
    }

    return NextResponse.json({
      posts: result.data,
      total: result.count || 0,
      page,
      limit,
      hasMore: (result.count || 0) > page * limit
    })
  } catch (error: any) {
    console.error('[Public API Blog GET] Catch Error:', error)
    // Return fallback instead of 500
    let filtered = [...FALLBACK_BLOG_POSTS]
    const paged = filtered.slice(from, to + 1)
    return NextResponse.json({
      posts: paged,
      total: filtered.length,
      page,
      limit,
      hasMore: filtered.length > page * limit,
      fallback: true
    })
  }
}
