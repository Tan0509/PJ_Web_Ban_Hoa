import { NextResponse } from 'next/server';
import { getHomeData } from '@/lib/data/homeData';
import { json500 } from '@/lib/helpers/apiResponse';

/**
 * GET /api/home – data cho trang home (cache client TTL 30p).
 */
export const runtime = 'nodejs';

type CacheEntry = { expiresAt: number; data: unknown };
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CACHE = new Map<string, CacheEntry>();

export async function GET() {
  try {
    const cached = CACHE.get('home');
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(
        { success: true, data: cached.data },
        {
          headers: {
            // Cache at the edge to speed up public home data
            'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
          },
        }
      );
    }

    const data = await getHomeData();
    CACHE.set('home', { expiresAt: Date.now() + CACHE_TTL_MS, data });
    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          // Cache at the edge to speed up public home data
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      }
    );
  } catch (err) {
    return json500(err);
  }
}
