import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === 'PUT') {
    const updated = await Product.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });
    return res.status(200).json({ success: true, data: updated });
  }

  if (req.method === 'DELETE') {
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Not found' });
    return res.status(200).json({ success: true, data: deleted });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
