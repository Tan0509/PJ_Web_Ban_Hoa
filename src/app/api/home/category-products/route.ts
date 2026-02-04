import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { json500 } from '@/lib/helpers/apiResponse';

/**
 * GET /api/home/category-products?categoryIds=id1,id2&categorySlugs=slug1,slug2
 * Returns products grouped by category for the given category IDs/slugs (load-more for home).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('categoryIds') || '';
    const slugsParam = searchParams.get('categorySlugs') || '';
    const categoryIds = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    const categorySlugs = slugsParam.split(',').map((s) => s.trim()).filter(Boolean);

    if (!categoryIds.length && !categorySlugs.length) {
      return NextResponse.json({ message: 'Missing categoryIds or categorySlugs' }, { status: 400 });
    }

    await connectMongo();

    const categories = await Category.find({
      active: { $ne: false },
      $or: [
        ...(categoryIds.length ? [{ _id: { $in: categoryIds } }] : []),
        ...(categorySlugs.length ? [{ slug: { $in: categorySlugs } }] : []),
      ].filter(Boolean),
    })
      .select('name slug icon order active _id')
      .sort({ order: 1, name: 1 })
      .lean();

    const ids = categories.map((c: any) => c._id?.toString?.()).filter(Boolean);
    const slugs = categories.map((c: any) => c.slug).filter(Boolean);

    const allCategoryProducts = await Product.find({
      active: true,
      $or: [
        { categoryIds: { $in: ids } },
        { categoryId: { $in: ids } },
        { categorySlug: { $in: slugs } },
      ],
    })
      .select('name price salePrice discountPercent images slug active categoryId categoryIds categorySlug')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const categoryProducts = categories.map((category: any) => {
      const catId = category._id?.toString?.() || '';
      const catSlug = category.slug || '';

      const products = allCategoryProducts
        .filter((p: any) => {
          const pCategoryIds = Array.isArray(p.categoryIds) ? p.categoryIds.map((id: unknown) => String(id)) : [];
          const pCategoryId = p.categoryId ? String(p.categoryId) : '';
          const pCategorySlug = p.categorySlug || '';
          return (
            pCategoryIds.includes(catId) ||
            pCategoryId === catId ||
            pCategorySlug === catSlug
          );
        })
        .slice(0, 9)
        .map((p: any) => {
          const { categoryId, categoryIds, categorySlug, ...rest } = p;
          return rest;
        });

      return { category, products, hasMore: products.length > 8 };
    });

    return NextResponse.json({ success: true, data: categoryProducts });
  } catch (err) {
    return json500(err);
  }
}
