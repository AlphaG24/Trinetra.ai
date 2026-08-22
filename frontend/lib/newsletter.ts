import { createClient } from '@/utils/supabase/server'
import { sendEmailTemplate } from '@/lib/email'

interface BlogPostBroadcastData {
  title: string
  slug: string
  excerpt?: string
  category?: string
  author_name?: string
  cover_image_url?: string
  read_time_minutes?: number
}

/**
 * Broadcasts a new blog post email notification to all subscribed users via Resend.
 */
export async function broadcastNewBlogPost(post: BlogPostBroadcastData): Promise<{ sent: number; total: number }> {
  try {
    const supabase = await createClient()

    // Fetch all active subscribers
    const { data: subscribers, error } = await supabase
      .from('subscribers')
      .select('email')

    if (error || !subscribers || subscribers.length === 0) {
      console.log('[NEWSLETTER] No subscribers found to broadcast.')
      return { sent: 0, total: 0 }
    }

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trinetraedu-ai.com'
    const postUrl = `${siteUrl}/blog/${post.slug}`
    const postTitle = post.title
    const postExcerpt = post.excerpt || 'Read the latest insights and engineering updates from the Trinetraedu-AI team.'
    const authorName = post.author_name || 'Trinetraedu-AI'
    const readTime = String(post.read_time_minutes || 5)
    const category = post.category || 'Engineering'

    console.log(`[NEWSLETTER] Broadcasting new blog post "${postTitle}" to ${subscribers.length} subscriber(s)...`)

    let sentCount = 0

    // Send emails in batches / loop
    for (const sub of subscribers) {
      if (!sub.email) continue
      try {
        const success = await sendEmailTemplate({
          to: sub.email,
          subject: `✨ New Article: ${postTitle}`,
          templateName: 'new-blog-post',
          variables: {
            post_title: postTitle,
            post_excerpt: postExcerpt,
            author_name: authorName,
            read_time: readTime,
            category: category,
            post_url: postUrl,
            site_url: siteUrl,
            cover_image_url: post.cover_image_url || '',
          },
        })
        if (success) sentCount++
      } catch (err) {
        console.error(`[NEWSLETTER] Failed to send broadcast to ${sub.email}:`, err)
      }
    }

    console.log(`[NEWSLETTER] Broadcast complete: ${sentCount}/${subscribers.length} sent.`)
    return { sent: sentCount, total: subscribers.length }
  } catch (err) {
    console.error('[NEWSLETTER] Fatal error during broadcast:', err)
    return { sent: 0, total: 0 }
  }
}
