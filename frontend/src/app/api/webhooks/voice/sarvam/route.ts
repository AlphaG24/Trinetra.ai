import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: any = {};
    if (contentType.includes('application/json')) {
      body = await request.json().catch(() => ({}));
    } else {
      const form = await request.formData().catch(() => null);
      if (form) {
        body = Object.fromEntries(form.entries());
      }
    }

    const backendUrl = process.env.INTERNAL_BACKEND_URL || 'https://trinetra-ai-1-6f2n.onrender.com';
    const res = await fetch(`${backendUrl}/webhooks/voice/sarvam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);

    if (res && res.ok) {
      const data = await res.json().catch(() => ({ status: 'success' }));
      return NextResponse.json(data);
    }

    return NextResponse.json({
      status: 'success',
      provider: 'sarvam',
      message: 'Webhook received by proxy',
    });
  } catch (err: any) {
    return NextResponse.json({ status: 'success', message: 'Accepted' }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'success',
    provider: 'sarvam',
    message: 'Sarvam voice webhook endpoint active',
  });
}
