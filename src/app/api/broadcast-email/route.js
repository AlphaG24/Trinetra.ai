import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase admin client to fetch all subscribers
const supabaseAdminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseAdminUrl, supabaseAdminKey);

export async function POST(request) {
  try {
    const payload = await request.json();
    
    // Check if this is a Supabase webhook payload
    const postRecord = payload.record || payload; 
    
    // Only send if the post is published
    if (!postRecord || postRecord.status !== 'published') {
      return NextResponse.json({ message: 'Ignored: Not a published post' });
    }

    // Fetch all subscribers
    const { data: subscribers, error } = await supabase
      .from('partner_waitlist')
      .select('email, name')
      .eq('source', 'blog');
      
    if (error) throw error;
    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({ message: 'No subscribers found' });
    }

    const emails = subscribers.map(s => s.email);

    // Using Resend if available, else Formspree via generic fetch
    if (process.env.RESEND_API_KEY) {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      const { data, error: sendError } = await resend.emails.send({
        from: 'Trinetra AI Blog <blog@trinetra.ai>',
        to: process.env.NODE_ENV === 'development' ? [emails[0]] : emails, // bcc would be better in prod
        subject: `New Post: ${postRecord.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${postRecord.title}</h2>
            <p>${postRecord.excerpt}</p>
            <a href="https://trinetra.ai/blog/${postRecord.slug}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
              Read Full Article
            </a>
          </div>
        `
      });
      
      if (sendError) throw sendError;
      return NextResponse.json({ success: true, message: `Sent to ${emails.length} subscribers via Resend`, data });
      
    } else if (process.env.FORMSPREE_ENDPOINT) {
      // Formspree fallback
      const response = await fetch(process.env.FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          subject: `New Post: ${postRecord.title}`,
          message: `Check out our new post: https://trinetra.ai/blog/${postRecord.slug}\n\n${postRecord.excerpt}`,
          bcc: emails.join(',')
        })
      });
      
      if (!response.ok) throw new Error('Formspree failed');
      return NextResponse.json({ success: true, message: `Sent via Formspree to ${emails.length} subscribers` });
    }

    return NextResponse.json({ success: false, message: 'No email service configured (RESEND_API_KEY or FORMSPREE_ENDPOINT missing)' }, { status: 500 });
  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
