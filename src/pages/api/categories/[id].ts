import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import { methodNotAllowed } from '@/lib/helpers/pagesApi';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === 'PUT') {
    const updated = await Category.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });
    return res.status(200).json({ success: true, data: updated });
  }

  if (req.method === 'DELETE') {
    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Not found' });
    return res.status(200).json({ success: true, data: deleted });
  }

  return methodNotAllowed(res, 'successError');
}
