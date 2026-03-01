import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Category from '@/models/Category';

export const runtime = 'nodejs';
// Cache API response for 5 minutes (categories don't change frequently)
export const revalidate = 300;

export async function GET(req: Request) {
  await connectMongo();
  const { searchParams } = new URL(req.url);
  const includeChildren = searchParams.get('includeChildren') === '1';
  const cats = await Category.find({ active: { $ne: false } })
    .select('name slug icon parentId order menuOrder active')
    .sort({ order: 1, name: 1 })
    .lean();
  const topLevel = cats.filter((c: any) => !c.parentId);
  const data = includeChildren ? cats : topLevel;
  return NextResponse.json(
    { success: true, data },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  );
}

export async function POST(req: Request) {
  await connectMongo();
  const { name, slug, icon, order = 0, active = true } = await req.json() || {};
  if (!name || !slug) {
    return NextResponse.json({ success: false, error: 'name and slug required' }, { status: 400 });
  }
  const created = await Category.create({ name, slug, icon, order, active });
  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
