import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const cats = await Category.find({ active: true }).sort({ order: 1, name: 1 });

  const data = await Promise.all(
    cats.map(async (cat) => {
      // Customer-side: chỉ hiển thị sản phẩm active
      const products = await Product.find({
        $or: [{ categoryId: cat._id.toString() }, { categoryId: cat.slug }],
        active: true,
      }).limit(8);
      return { category: cat, products, total: products.length };
    })
  );

  return res.status(200).json({ success: true, data });
}
