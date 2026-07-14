import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SECURITY: Broadcast Email Route
//
// This route is called by Supabase database webhooks when a blog post is
// published. It requires a secret header for authentication.
//
// Required env vars:
//   BROADCAST_WEBHOOK_SECRET  — shared secret for webhook verification
//   RESEND_API_KEY             — (optional) Resend API key for email delivery
//   FORMSPREE_ENDPOINT         — (optional) Formspree fallback endpoint
// ============================================================================

export async function POST(request) {
  try {
    // SECURITY: Verify webhook secret before processing
    const secret = request.headers.get('x-webhook-secret');
    const expectedSecret = process.env.BROADCAST_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error('[Broadcast] BROADCAST_WEBHOOK_SECRET is not configured');
      return NextResponse.json(
        { error: 'Service misconfigured' },
        { status: 500 }
      );
    }

    if (!secret || secret !== expectedSecret) {
      console.warn('[Broadcast] Unauthorized access attempt', {
        ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        hasSecret: !!secret,
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = await request.json();

    // Check if this is a Supabase webhook payload
    const postRecord = payload.record || payload;

    // Only send if the post is published
    if (!postRecord || postRecord.status !== 'published') {
      return NextResponse.json({ message: 'Ignored: Not a published post' });
    }

    // SECURITY: Validate required fields before processing
    if (!postRecord.title || typeof postRecord.title !== 'string') {
      return NextResponse.json(
        { error: 'Invalid payload: missing title' },
        { status: 400 }
      );
    }

    // Setup Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Broadcast] Missing Supabase credentials');
      return NextResponse.json(
        { error: 'Service misconfigured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all blog subscribers
    const { data: subscribers, error } = await supabase
      .from('partner_waitlist')
      .select('email, name')
      .eq('source', 'blog');

    if (error) throw error;
    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({ message: 'No subscribers found' });
    }

    const emails = subscribers.map(s => s.email);

    // SECURITY: Sanitize post content before embedding in email HTML
    const safeTitle = postRecord.title.replace(/[<>&"']/g, (c) => {
      const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
      return entities[c] || c;
    });
    const safeExcerpt = (postRecord.excerpt || '').replace(/[<>&"']/g, (c) => {
      const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
      return entities[c] || c;
    });
    const safeSlug = encodeURIComponent(postRecord.slug || '');

    if (process.env.RESEND_API_KEY) {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const { data, error: sendError } = await resend.emails.send({
        from: 'Trinetra AI Blog <blog@trinetra.ai>',
        to: process.env.NODE_ENV === 'development' ? [emails[0]] : emails,
        subject: `New Post: ${safeTitle}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${safeTitle}</h2>
            <p>${safeExcerpt}</p>
            <a href="https://trinetraedu-ai.com/blog/${safeSlug}" style="display: inline-block; background: #18181b; color: #fafafa; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
              Read Full Article
            </a>
          </div>
        `
      });

      if (sendError) throw sendError;
      return NextResponse.json({
        success: true,
        message: `Sent to ${emails.length} subscribers via Resend`
      });

    } else if (process.env.FORMSPREE_ENDPOINT) {
      const response = await fetch(process.env.FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          subject: `New Post: ${safeTitle}`,
          message: `Check out our new post: https://trinetraedu-ai.com/blog/${safeSlug}\n\n${safeExcerpt}`,
          bcc: emails.join(',')
        })
      });

      if (!response.ok) throw new Error('Formspree failed');
      return NextResponse.json({
        success: true,
        message: `Sent via Formspree to ${emails.length} subscribers`
      });
    }

    return NextResponse.json(
      { success: false, message: 'No email service configured' },
      { status: 500 }
    );
  } catch (error) {
    console.error('[Broadcast] Internal error:', error);
    // SECURITY: Never expose internal error details
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
