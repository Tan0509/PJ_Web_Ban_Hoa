import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import ProductView from '@/models/ProductView';

export const runtime = 'nodejs';

function getVietnamDateKey(now = new Date()) {
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

function normalizeSlug(v: unknown) {
  const s = String(v || '').trim().replace(/"/g, '');
  if (!s) return '';
  return s.slice(0, 200);
}

function normalizeName(v: unknown) {
  const s = String(v || '').trim();
  if (!s) return '';
  return s.slice(0, 300);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const fingerprint = normalizeFingerprint(body?.fingerprint);
    const productSlug = normalizeSlug(body?.productSlug);
    const productName = normalizeName(body?.productName);

    if (!fingerprint || !productSlug) {
      return NextResponse.json({ success: false, message: 'Missing fingerprint or productSlug' }, { status: 400 });
    }

    await connectMongo();
    const dateKey = getVietnamDateKey();

    await ProductView.updateOne(
      { dateKey, fingerprint, productSlug },
      { $setOnInsert: { dateKey, fingerprint, productSlug, productName: productName || undefined } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: 'Track product view failed' }, { status: 500 });
  }
}
