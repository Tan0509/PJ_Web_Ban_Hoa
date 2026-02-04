import { NextResponse } from 'next/server';
import { getCategoryPageData, type SearchParams } from '@/lib/data/categoryData';
import { json500 } from '@/lib/helpers/apiResponse';

/**
 * GET /api/category/[slug]?page=1&sort=...&minPrice=... (cache client TTL 30p).
 * Chỉ xem; không dùng cho checkout/thanh toán.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;
    const cleanSlug = slug?.replace(/"/g, '') || '';
    if (!cleanSlug) {
      return NextResponse.json({ message: 'Missing slug' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const normalized: SearchParams = {
      page: searchParams.get('page') || undefined,
      minPrice: searchParams.get('minPrice') || undefined,
      maxPrice: searchParams.get('maxPrice') || undefined,
      color: searchParams.get('color') || undefined,
      type: searchParams.get('type') || undefined,
      sort: searchParams.get('sort') || undefined,
    };

    const data = await getCategoryPageData(cleanSlug, normalized);
    if (!data) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return json500(err);
  }
}
