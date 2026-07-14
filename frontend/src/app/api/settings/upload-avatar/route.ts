import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    )

    // Verify user is authenticated first
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop()
    const filePath = `avatars/${user.id}-${Math.floor(Date.now() / 1000)}.${fileExt}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload using service role to bypass RLS policies
    const { error: uploadError } = await supabaseAdmin.storage
      .from('public_uploads')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      // SECURITY: Never expose storage error details
      return NextResponse.json({ error: 'Failed to upload avatar.' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('public_uploads')
      .getPublicUrl(filePath)

    return NextResponse.json({ publicUrl })
  } catch (err: any) {
    console.error('Upload avatar API error:', err)
    // SECURITY: Never expose internal error details
    return NextResponse.json({ error: 'Server error during upload.' }, { status: 500 })
  }
}
