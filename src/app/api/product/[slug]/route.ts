import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Product from '@/models/Product';
import { json500 } from '@/lib/helpers/apiResponse';

export const runtime = 'nodejs';
/**
 * GET /api/product/[slug] – chi tiết sản phẩm + related (cache client TTL 30p).
 * Chỉ xem; không dùng cache cho add-to-cart / thanh toán.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;
    const cleanSlug = slug?.replace(/"/g, '') || '';
    if (!cleanSlug) {
      return NextResponse.json({ message: 'Missing slug' }, { status: 400 });
    }

    await connectMongo();

    let product = await Product.findOne({ slug: cleanSlug, active: true }).lean();
    if (!product) {
      try {
        product = await Product.findOne({ _id: cleanSlug, active: true }).lean();
      } catch {
        /* ignore */
      }
    }
    if (!product || !(product as any)._id) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const productId = (product as any)._id?.toString?.();
    const categorySlug = (product as any).categorySlug;
    const categorySlugs = (product as any).categorySlugs || [];
    const categoryId = (product as any).categoryId;
    const categoryIds = (product as any).categoryIds || [];

    const relatedFilters: any[] = [];
    if (categorySlug) relatedFilters.push({ categorySlug });
    if (Array.isArray(categorySlugs) && categorySlugs.length) {
      relatedFilters.push({ categorySlugs: { $in: categorySlugs } });
    }
    if (categoryId) relatedFilters.push({ categoryId });
    if (Array.isArray(categoryIds) && categoryIds.length) {
      relatedFilters.push({ categoryIds: { $in: categoryIds } });
    }

    const relatedQuery: any = {
      _id: { $ne: productId },
      active: true,
    };
    if (relatedFilters.length) relatedQuery.$or = relatedFilters;

    const related = await Product.find(relatedQuery)
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    const plainProduct = JSON.parse(JSON.stringify(product));
    const plainRelated = JSON.parse(JSON.stringify(related));

    return NextResponse.json(
      {
        success: true,
        data: { product: plainProduct, related: plainRelated },
      },
      {
        headers: {
          // Public cache for product detail
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err) {
    return json500(err);
  }
}
