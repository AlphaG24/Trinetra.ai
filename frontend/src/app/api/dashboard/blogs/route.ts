import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch user role and check if blocked
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_blocked, full_name, avatar_url')
      .eq('id', user.id)
      .single()

    if (profile?.is_blocked) {
      return NextResponse.json({ error: 'Your account has been blocked from submitting content.' }, { status: 403 })
    }

    // 2. Check system configs
    const { data: configRows } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', ['blog_public_creation_enabled', 'blog_require_approval'])

    const configs: Record<string, string> = {}
    configRows?.forEach(row => {
      configs[row.config_key] = row.config_value
    })

    if (configs['blog_public_creation_enabled'] !== 'true' && profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Public blog creation is currently disabled.' }, { status: 403 })
    }

    const body = await req.json()
    const { title, slug, excerpt, content, cover_image_url, category, tags } = body

    if (!title || !slug || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 3. Run Content Moderation via FastAPI backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'
    let moderationResult = { is_clean: true, violations: [], severity: 'none', is_blocked: false }
    
    try {
      const textToModerate = `${title}\n${excerpt}\n${content}`
      const modRes = await fetch(`${backendUrl}/api/ai/blog/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToModerate,
          user_id: user.id
        })
      })
      if (modRes.ok) {
        moderationResult = await modRes.json()
      }
    } catch (err) {
      console.error('Failed to connect to moderation service', err)
      // Fail open
    }

    if (moderationResult.is_blocked || moderationResult.severity === 'severe') {
      return NextResponse.json({ 
        error: 'Content violates our severe moderation policies. Your account has been flagged.',
        violations: moderationResult.violations
      }, { status: 403 })
    }

    // 4. Determine status based on configs and moderation
    let reviewStatus = 'approved'
    let postStatus = 'draft' // By default, user posts are saved as pending publish logic
    
    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      if (configs['blog_require_approval'] === 'true' || moderationResult.severity === 'mild') {
        reviewStatus = 'pending'
      }
      postStatus = reviewStatus === 'approved' ? 'published' : 'draft'
    } else {
      postStatus = body.status || 'draft'
    }

    // 5. Insert into Database
    const { data: insertedPost, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        author_id: user.id,
        author_role: profile?.role || 'user',
        title,
        slug,
        excerpt,
        content,
        cover_image_url,
        category,
        tags,
        status: postStatus,
        review_status: reviewStatus,
        moderation_result: moderationResult,
        author_name: profile?.full_name || 'Anonymous',
        author_avatar_url: profile?.avatar_url || ''
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // If mild violation, warn the user but the post is saved
    if (moderationResult.severity === 'mild') {
      return NextResponse.json({ 
        message: 'Blog submitted but flagged for mild violations. It requires admin review before publishing.',
        violations: moderationResult.violations,
        post: insertedPost
      })
    }

    return NextResponse.json({ post: insertedPost })

  } catch (error: any) {
    console.error('Blog create error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'my_blogs'

    if (type === 'my_blogs') {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return NextResponse.json({ posts: data })
    } else if (type === 'discover') {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image_url, category, tags, author_name, author_avatar_url, created_at, published_at, view_count, read_time_minutes')
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      if (error) throw error
      return NextResponse.json({ posts: data })
    }

    return NextResponse.json({ posts: [] })
  } catch (error: any) {
    console.error('Blog fetch error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
