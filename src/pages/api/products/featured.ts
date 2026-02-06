import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const products = await Product.find({ active: true })
    .select('name price salePrice discountPercent images slug categorySlug')
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();
  return res.status(200).json({ success: true, data: products });
}
