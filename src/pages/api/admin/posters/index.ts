import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Poster from '@/models/Poster';
import { isAdminFromSession } from '@/lib/authHelpers';
import { methodNotAllowed } from '@/lib/helpers/pagesApi';

type PosterPayload = {
  imageUrl: string;
  name?: string;
  link?: string;
  order?: number;
  active?: boolean;
};

type ListResponse = {
  items: any[];
  total: number;
  page: number;
  limit: number;
};

type ErrorResponse = { message: string };

async function listPosters(query: NextApiRequest['query']): Promise<ListResponse> {
  const { page = '1', limit = '50' } = query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page || '1', 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit || '50', 10)));

  const total = await Poster.countDocuments({});
  const items = await Poster.find({})
    .sort({ order: 1, _id: 1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean();

  return { items, total, page: pageNum, limit: limitNum };
}

async function createPoster(body: PosterPayload) {
  const { imageUrl, name, link, order, active } = body;
  const urlTrim = typeof imageUrl === 'string' ? imageUrl.trim() : '';
  const nameTrim = typeof name === 'string' ? name.trim() : '';
  const linkTrim = typeof link === 'string' ? link.trim() : '';
  const orderNum = Number(order);

  if (!urlTrim) {
    const err = new Error('Vui lòng thêm ảnh poster');
    (err as any).status = 400;
    throw err;
  }

  const orderVal = Number.isNaN(orderNum) ? 0 : orderNum;
  const orderExists = await Poster.findOne({ order: orderVal });
  if (orderExists) {
    const err = new Error(`Thứ tự hiển thị "${orderVal}" đã được sử dụng, vui lòng chọn số khác`);
    (err as any).status = 409;
    throw err;
  }

  return Poster.create({
    imageUrl: urlTrim,
    name: nameTrim || undefined,
    link: linkTrim || undefined,
    order: orderVal,
    active: typeof active === 'boolean' ? active : true,
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | ErrorResponse>
) {
  if (!(await isAdminFromSession(req, res))) return res.status(401).json({ message: 'Unauthorized' });
  await dbConnect();

  try {
    if (req.method === 'GET') {
      const data = await listPosters(req.query);
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const created = await createPoster(req.body || {});
      return res.status(201).json({
        items: [created],
        total: 1,
        page: 1,
        limit: 1,
      });
    }

    return methodNotAllowed(res);
  } catch (err: any) {
    const status = err?.status || 500;
    return res.status(status).json({ message: err?.message || 'Server error' });
  }
}
