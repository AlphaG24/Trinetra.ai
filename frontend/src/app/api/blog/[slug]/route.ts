import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params
    const slug = resolvedParams.slug

    const supabase = await createClient()

    // 1. Fetch single post (respecting public RLS: must be published)
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()

    if (error) {
      console.error('[Public API Blog Slug GET] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 })
    }

    if (!post) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    // 2. Increment view count using the admin client to bypass RLS write restrictions
    try {
      const adminClient = createAdminClient()
      const nextViews = (post.view_count || 0) + 1
      await adminClient
        .from('blog_posts')
        .update({ view_count: nextViews })
        .eq('id', post.id)
    } catch (viewError) {
      // Log error but don't fail the request (resilient view counter)
      console.error('[Public API Blog Slug GET] View count increment failed:', viewError)
    }

    return NextResponse.json({ post })
  } catch (error: any) {
    console.error('[Public API Blog Slug GET] Catch Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
