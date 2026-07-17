import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { safeApiHandler, requireAuth } from '@/utils/apiAuth'

const resend = new Resend(process.env.RESEND_API_KEY)

export const POST = safeApiHandler(async (req: Request) => {
  const authResult = await requireAuth()
  if (authResult instanceof Response) {
    return authResult
  }

  const { user } = authResult
  if (!user.email) {
    return NextResponse.json({ error: 'User email is required' }, { status: 400 })
  }

  const { data, error } = await resend.emails.send({
    from: 'Trinetra AI <support@trinetraedu-ai.com>',
    to: [user.email],
    subject: 'Welcome to Trinetra AI 🎉',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background-color:#080010;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#080010;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#130224;border-radius:16px;border:1px solid #1E0A35;">
                <tr>
                  <td style="padding:40px;text-align:center;">
                    <h1 style="color:#FAF7FF;font-size:28px;margin:0 0 8px;">🎉 Welcome to Trinetra AI</h1>
                    <p style="color:#9A91B5;font-size:15px;margin:0 0 24px;">Your zero-code AI platform is ready</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 40px 30px;">
                    <p style="color:#B8B0D1;font-size:15px;line-height:1.7;margin:0 0 20px;">
                      Hi there! Your account is all set up. Here's what you can do now:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                      <tr><td style="padding:8px 0;color:#B8B0D1;font-size:14px;">🎙️ <strong style="color:#D7C4F7;">Voice Agents</strong> — Make AI-powered calls</td></tr>
                      <tr><td style="padding:8px 0;color:#B8B0D1;font-size:14px;">📄 <strong style="color:#D7C4F7;">Document Tools</strong> — Extract data from PDFs</td></tr>
                      <tr><td style="padding:8px 0;color:#B8B0D1;font-size:14px;">🏛️ <strong style="color:#D7C4F7;">MSME Navigator</strong> — Find government schemes</td></tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="https://www.trinetraedu-ai.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#8B5CF6,#6D28D9);color:#FFFFFF;font-size:15px;font-weight:600;padding:14px 36px;border-radius:10px;text-decoration:none;">
                            Go to Dashboard →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 40px;text-align:center;border-top:1px solid #1E0A35;">
                    <p style="color:#4A3D6B;font-size:11px;margin:0;">Trinetra AI • trinetraedu-ai.com</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  })

  if (error) {
    console.error('Resend error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, data })
})