import { NextResponse } from 'next/server';
import { getSessionForAppRouter } from '@/lib/authHelpers';
import { connectMongo } from '@/lib/mongoose';
import ProductView from '@/models/ProductView';
import Product from '@/models/Product';

export const runtime = 'nodejs';

function isAdminRole(role?: string) {
  return role === 'admin' || role === 'staff';
}

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDateKeyUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDefaultRange() {
  const today = new Date();
  const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const from = new Date(to);
  from.setUTCDate(to.getUTCDate() - 29);
  return { from, to };
}

export async function GET(req: Request) {
  try {
    const session = await getSessionForAppRouter();
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!isAdminRole(role)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const defaults = getDefaultRange();
    const fromInput = parseDate(searchParams.get('from') || undefined) || defaults.from;
    const toInput = parseDate(searchParams.get('to') || undefined) || defaults.to;
    const limitRaw = Number(searchParams.get('limit') || 10);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, Math.floor(limitRaw))) : 10;

    const from = new Date(Date.UTC(fromInput.getUTCFullYear(), fromInput.getUTCMonth(), fromInput.getUTCDate()));
    const to = new Date(Date.UTC(toInput.getUTCFullYear(), toInput.getUTCMonth(), toInput.getUTCDate()));
    if (from > to) return NextResponse.json({ message: 'Invalid date range' }, { status: 400 });

    const fromKey = toDateKeyUTC(from);
    const toKey = toDateKeyUTC(to);

    await connectMongo();

    const [totalViews, distinctProducts, topProducts] = await Promise.all([
      ProductView.countDocuments({ dateKey: { $gte: fromKey, $lte: toKey } }),
      ProductView.distinct('productSlug', { dateKey: { $gte: fromKey, $lte: toKey } }),
      ProductView.aggregate<{ _id: string; count: number; productName?: string }>([
        { $match: { dateKey: { $gte: fromKey, $lte: toKey } } },
        {
          $group: {
            _id: '$productSlug',
            count: { $sum: 1 },
            productName: { $first: '$productName' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
      ]),
    ]);

    const slugs = (topProducts || []).map((p) => p._id).filter(Boolean);
    const products = slugs.length
      ? await Product.find({ slug: { $in: slugs } })
          .select('slug name')
          .lean()
      : [];
    const nameBySlug = new Map(
      (products || []).map((p: any) => [String(p.slug || ''), String(p.name || '')])
    );

    return NextResponse.json({
      success: true,
      data: {
        totalViews,
        distinctProductCount: Array.isArray(distinctProducts) ? distinctProducts.length : 0,
        topProducts: (topProducts || []).map((p) => ({
          productSlug: p._id,
          productName: nameBySlug.get(String(p._id || '')) || p.productName || p._id,
          views: p.count || 0,
        })),
      },
    });
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
