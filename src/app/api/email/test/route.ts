import { NextRequest, NextResponse } from 'next/server';
import { getEmailConfig, sendEmail } from '@/lib/email';

export const runtime = 'nodejs';

// POST /api/email/test
// Body: { to: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const to = String(body?.to || '').trim();

    if (!to) {
      return NextResponse.json({ error: 'to is required' }, { status: 400 });
    }

    let config;
    try {
      config = getEmailConfig();
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'Email config error' },
        { status: 500 }
      );
    }

    if (!config.enabled) {
      return NextResponse.json(
        {
          error:
            'Email is disabled. Set EMAIL_ENABLED=true and configure SMTP_USER/SMTP_PASS.'
        },
        { status: 400 }
      );
    }

    const subject = 'Auto-Grader Test Email';
    const text =
      'This is a test email from Backend JS Auto-Grader.\n\nIf you received this, SMTP is configured correctly.';
    const html = `
<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;line-height:1.4;color:#111827;">
  <p><strong>This is a test email from Backend JS Auto-Grader.</strong></p>
  <p>If you received this, SMTP is configured correctly.</p>
</div>`;

    const result = await sendEmail({ to, subject, html, text });

    return NextResponse.json({ message: 'Test email sent', messageId: result.messageId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to send test email' },
      { status: 500 }
    );
  }
}
