import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const cats = await Category.find({ active: true })
    .select('name slug icon order active')
    .sort({ order: 1, name: 1 })
    .lean();

  const data = await Promise.all(
    cats.map(async (cat) => {
      // Customer-side: chỉ hiển thị sản phẩm active
      const catId = (cat as { _id?: unknown })?._id?.toString?.();
      const catSlug = (cat as { slug?: string })?.slug;
      const products = await Product.find({
        $or: [
          ...(catId ? [{ categoryId: catId }, { categoryIds: catId }] : []),
          ...(catSlug ? [{ categorySlug: catSlug }, { categorySlugs: catSlug }] : []),
        ],
        active: true,
      })
        .select('name price salePrice discountPercent images slug categorySlug')
        .limit(8)
        .lean();
      return { category: cat, products, total: products.length };
    })
  );

  return res.status(200).json({ success: true, data });
}
