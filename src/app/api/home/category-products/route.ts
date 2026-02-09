import { NextResponse } from 'next/server';
import { json500 } from '@/lib/helpers/apiResponse';
import { getHomeCategoryCacheBySlugs } from '@/lib/data/homeCategoryCache';

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
            // Avoid edge cache mixing across different query params
            'Cache-Control': 'private, no-store',
          },
        }
      );
    }

    const categoryProducts = await getHomeCategoryCacheBySlugs(categorySlugs);

    CACHE.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data: categoryProducts });

    return NextResponse.json(
      { success: true, data: categoryProducts },
      {
        headers: {
          // Avoid edge cache mixing across different query params
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (err) {
    return json500(err);
  }
}
