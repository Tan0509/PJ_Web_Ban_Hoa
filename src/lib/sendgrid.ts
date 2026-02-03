type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
};

function normalizeEmail(v: string) {
  return v.toLowerCase().trim();
}

export async function sendEmailSendGrid(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.SENDGRID_API_KEY || '';
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || '';
  const fromName = process.env.SENDGRID_FROM_NAME || 'Hoa Tươi NyNa';

  if (!apiKey) return { ok: false, error: 'Missing SENDGRID_API_KEY' };
  if (!fromEmail) return { ok: false, error: 'Missing SENDGRID_FROM_EMAIL' };

  const toList = Array.isArray(input.to) ? input.to : [input.to];
  const personalizations = [
    {
      to: toList.filter(Boolean).map((e) => ({ email: normalizeEmail(String(e)) })),
      subject: input.subject,
    },
  ];

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations,
        from: { email: normalizeEmail(fromEmail), name: fromName },
        content: [{ type: 'text/html', value: input.html }],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: `SendGrid error ${res.status}: ${text || res.statusText}` };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'SendGrid request failed' };
  }
}

