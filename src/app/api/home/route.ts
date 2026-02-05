import { NextResponse } from 'next/server';
import { getHomeData } from '@/lib/data/homeData';
import { json500 } from '@/lib/helpers/apiResponse';

/**
 * GET /api/home – data cho trang home (cache client TTL 30p).
 */
export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await getHomeData();
    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          // Cache at the edge to speed up public home data
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err) {
    return json500(err);
  }
}
