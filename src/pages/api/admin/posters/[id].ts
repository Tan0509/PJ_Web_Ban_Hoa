import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Poster from '@/models/Poster';
import type { IPoster } from '@/models/Poster';
import { isAdminFromSession } from '@/lib/authHelpers';
import { getPublicIdFromUrl, deleteFromCloudinary } from '@/lib/cloudinary';

type ErrorResponse = { message: string };

async function updatePoster(id: string, body: any) {
  const { imageUrl, name, link, order, active } = body || {};
  const urlTrim = typeof imageUrl === 'string' ? imageUrl.trim() : undefined;
  const nameTrim = typeof name === 'string' ? name.trim() : undefined;
  const linkTrim = typeof link === 'string' ? link.trim() : undefined;
  const orderNum = Number(order);

  if (!Number.isNaN(orderNum)) {
    const orderExists = await Poster.findOne({ order: orderNum, _id: { $ne: id } });
    if (orderExists) {
      const err = new Error(`Thứ tự hiển thị "${orderNum}" đã được sử dụng, vui lòng chọn số khác`);
      (err as any).status = 409;
      throw err;
    }
  }

  const payload: any = {};
  if (urlTrim !== undefined) payload.imageUrl = urlTrim;
  if (nameTrim !== undefined) payload.name = nameTrim || undefined;
  if (linkTrim !== undefined) payload.link = linkTrim;
  if (!Number.isNaN(orderNum)) payload.order = orderNum;
  if (typeof active === 'boolean') payload.active = active;

  const updated = await Poster.findByIdAndUpdate(id, payload, { new: true });
  if (!updated) {
    const err = new Error('Not found');
    (err as any).status = 404;
    throw err;
  }
  return updated;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | ErrorResponse>
) {
  if (!(await isAdminFromSession(req, res))) return res.status(401).json({ message: 'Unauthorized' });
  await dbConnect();

  const { id } = req.query;

  try {
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const updated = await updatePoster(id as string, req.body);
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      const doc = await Poster.findById(id).lean() as IPoster | null;
      if (!doc) {
        const err = new Error('Not found');
        (err as any).status = 404;
        throw err;
      }
      const imageUrl = doc?.imageUrl;
      if (typeof imageUrl === 'string') {
        const publicId = getPublicIdFromUrl(imageUrl);
        if (publicId) {
          try {
            await deleteFromCloudinary(publicId);
          } catch (e) {
            console.error('Cloudinary delete image error:', e);
          }
        }
      }
      await Poster.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Đã xóa poster vĩnh viễn', success: true });
    }

    if (req.method === 'POST') {
      const { action } = req.body || {};
      if (action === 'hide') {
        const updated = await Poster.findByIdAndUpdate(id, { active: false }, { new: true });
        if (!updated) {
          const err = new Error('Not found');
          (err as any).status = 404;
          throw err;
        }
        return res.status(200).json({ ...updated.toObject(), message: 'Đã ẩn poster' });
      }
      if (action === 'unhide') {
        const updated = await Poster.findByIdAndUpdate(id, { active: true }, { new: true });
        if (!updated) {
          const err = new Error('Not found');
          (err as any).status = 404;
          throw err;
        }
        return res.status(200).json({ ...updated.toObject(), message: 'Đã hiển thị poster' });
      }
      return res.status(400).json({ message: 'Invalid action' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err: any) {
    const status = err?.status || 500;
    return res.status(status).json({ message: err?.message || 'Server error' });
  }
}
