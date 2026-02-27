import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import SiteVisit from '@/models/SiteVisit';

export const runtime = 'nodejs';

function getVietnamDateKey(now = new Date()) {
  // YYYY-MM-DD in Asia/Ho_Chi_Minh (UTC+7)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const vn = new Date(utc + 7 * 60 * 60000);
  const y = vn.getFullYear();
  const m = String(vn.getMonth() + 1).padStart(2, '0');
  const d = String(vn.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeFingerprint(v: unknown) {
  const s = String(v || '').trim();
  if (!s) return '';
  return s.slice(0, 128);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const fingerprint = normalizeFingerprint(body?.fingerprint);
    if (!fingerprint) {
      return NextResponse.json({ success: false, message: 'Missing fingerprint' }, { status: 400 });
    }

    await connectMongo();
    const dateKey = getVietnamDateKey();

    await SiteVisit.updateOne(
      { dateKey, fingerprint },
      { $setOnInsert: { dateKey, fingerprint } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: 'Track failed' }, { status: 500 });
  }
}
