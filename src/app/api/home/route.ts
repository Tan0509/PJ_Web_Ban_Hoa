import { NextResponse } from 'next/server';
import { getHomeData } from '@/lib/data/homeData';
import { json500 } from '@/lib/helpers/apiResponse';
import { getHomeCache, setHomeCache } from '@/lib/data/homeApiCache';

/**
 * GET /api/home – data cho trang home (cache client TTL 30p).
 */
export const runtime = 'nodejs';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET() {
  try {
    const cached = getHomeCache('home');
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(
        { success: true, data: cached.data },
        {
          headers: {
            // Always serve the latest data after admin rebuild
            'Cache-Control': 'private, no-store',
          },
        }
      );
    }

    const data = await getHomeData();
    setHomeCache('home', { expiresAt: Date.now() + CACHE_TTL_MS, data });
    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (err) {
    return json500(err);
  }
}
