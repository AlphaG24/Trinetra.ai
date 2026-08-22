import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const exclude = searchParams.get('exclude')

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    const supabase = await createClient()
    let query = supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, cover_image_url, category, tags, author_name, author_avatar_url, read_time_minutes, created_at, published_at')
      .eq('status', 'published')
      .eq('category', category)

    if (exclude) {
      query = query.neq('id', exclude)
    }

    const { data: posts, error } = await query
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(3)

    if (error) {
      console.error('[Public API Blog Related GET] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch related posts' }, { status: 500 })
    }

    return NextResponse.json({ posts: posts || [] })
  } catch (error: any) {
    console.error('[Public API Blog Related GET] Catch Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
