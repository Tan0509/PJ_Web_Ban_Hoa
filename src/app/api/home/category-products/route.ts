import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { json500 } from '@/lib/helpers/apiResponse';

export const runtime = 'nodejs';

type CacheEntry = { expiresAt: number; data: unknown };
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CACHE = new Map<string, CacheEntry>();
/**
 * GET /api/home/category-products?categoryIds=id1,id2&categorySlugs=slug1,slug2
 * Returns products grouped by category for the given category IDs/slugs (load-more for home).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slugsParam = searchParams.get('categorySlugs') || '';
    const categorySlugs = slugsParam.split(',').map((s) => s.trim()).filter(Boolean);

    if (!categorySlugs.length) {
      return NextResponse.json({ message: 'Missing categoryIds or categorySlugs' }, { status: 400 });
    }

    const cacheKey = `slugs:${categorySlugs.join(',')}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(
        { success: true, data: cached.data },
        {
          headers: {
            // Cache at the edge to speed up repeated home loads
            'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
          },
        }
      );
    }

    await connectMongo();

    const categories = await Category.find({
      active: { $ne: false },
      $or: [
        ...(categorySlugs.length ? [{ slug: { $in: categorySlugs } }] : []),
      ].filter(Boolean),
    })
      .select('name slug icon order active _id')
      .sort({ order: 1, name: 1 })
      .lean();

    const categoryProducts = await Promise.all(
      categories.map(async (category: any) => {
        const catId = category._id?.toString?.() || '';
        const catSlug = category.slug || '';

        if (!catSlug) {
          return { category, products: [], hasMore: false };
        }

        const productsRaw = await Product.find({
          active: true,
          categorySlug: catSlug,
        })
          .select('name price salePrice discountPercent images slug active categorySlug')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();

        const hasMore = productsRaw.length > 8;
        const products = productsRaw.slice(0, 8).map((p: any) => {
          const { images, categorySlug, ...rest } = p;
          const thumb = Array.isArray(images) ? images.slice(0, 1) : images;
          return { ...rest, images: thumb, categorySlug };
        });

        return { category, products, hasMore };
      })
    );

    CACHE.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data: categoryProducts });

    return NextResponse.json(
      { success: true, data: categoryProducts },
      {
        headers: {
          // Cache at the edge to speed up repeated home loads
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      }
    );
  } catch (err) {
    return json500(err);
  }
}
