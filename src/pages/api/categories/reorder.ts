import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import { methodNotAllowed } from '@/lib/helpers/pagesApi';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'successError');
  await dbConnect();
  const { ids } = req.body || {};
  if (!Array.isArray(ids)) return res.status(400).json({ success: false, error: 'ids array required' });

  await Promise.all(ids.map((id: string, idx: number) => Category.findByIdAndUpdate(id, { order: idx + 1 })));
  const cats = await Category.find({}).sort({ order: 1, name: 1 });
  return res.status(200).json({ success: true, data: cats });
}
