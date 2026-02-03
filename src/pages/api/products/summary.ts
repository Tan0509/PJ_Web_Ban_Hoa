import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const totalActive = await Product.countDocuments({ active: true });
  const stockAgg = await Product.aggregate([{ $group: { _id: null, total: { $sum: '$stock' } } }]);
  const totalStock = stockAgg[0]?.total || 0;
  return res.status(200).json({ success: true, data: { totalActive, totalStock } });
}
