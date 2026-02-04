import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import { isAdminFromSession } from '@/lib/authHelpers';
import { getPublicIdFromUrl, deleteFromCloudinary } from '@/lib/cloudinary';
import { methodNotAllowed } from '@/lib/helpers/pagesApi';

type ErrorResponse = { message: string };

// This module is cloned 100% from Product Admin
// Keep logic and structure consistent with Product Admin
// AUTH REFACTOR: Use NextAuth session instead of cookie-based auth

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function updateCategory(id: string, body: any) {
  const { name, slug, icon, order, menuOrder, description, active } = body || {};
  const nameTrim = typeof name === 'string' ? name.trim() : '';
  const slugTrim = typeof slug === 'string' ? slug.trim() : '';
  if (!nameTrim) {
    const err = new Error('Vui lòng nhập tên danh mục');
    (err as any).status = 400;
    throw err;
  }
  if (!slugTrim) {
    const err = new Error('Vui lòng nhập slug');
    (err as any).status = 400;
    throw err;
  }

  const slugExists = await Category.findOne({ slug: slugTrim, _id: { $ne: id } });
  if (slugExists) {
    const err = new Error('Slug đã tồn tại, vui lòng nhập slug khác');
    (err as any).status = 409;
    throw err;
  }

  const nameExists = await Category.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(nameTrim)}$`, 'i') },
    _id: { $ne: id },
  });
  if (nameExists) {
    const err = new Error('Tên danh mục đã tồn tại, vui lòng nhập tên khác');
    (err as any).status = 409;
    throw err;
  }

  const orderNum = Number(order);
  if (!Number.isNaN(orderNum) && orderNum >= 0) {
    const orderExists = await Category.findOne({ order: orderNum, _id: { $ne: id } });
    if (orderExists) {
      const err = new Error(`Thứ tự hiển thị (section) "${orderNum}" đã được sử dụng, vui lòng chọn số khác`);
      (err as any).status = 409;
      throw err;
    }
  }

  const menuOrderNum = Number(menuOrder);
  if (!Number.isNaN(menuOrderNum) && menuOrderNum >= 0) {
    const menuOrderExists = await Category.findOne({ menuOrder: menuOrderNum, _id: { $ne: id } });
    if (menuOrderExists) {
      const err = new Error(`Thứ tự menu "${menuOrderNum}" đã được sử dụng, vui lòng chọn số khác`);
      (err as any).status = 409;
      throw err;
    }
  }

  const payload: any = {
    name: nameTrim,
    slug: slugTrim,
    active: typeof active === 'boolean' ? active : true,
  };
  if (description !== undefined) payload.description = description;
  if (icon !== undefined) payload.icon = icon;
  if (!Number.isNaN(orderNum)) payload.order = orderNum;
  if (!Number.isNaN(menuOrderNum)) payload.menuOrder = menuOrderNum;
  const updated = await Category.findByIdAndUpdate(id, payload, { new: true });
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
      const updated = await updateCategory(id as string, req.body);
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      const doc = await Category.findById(id).lean();
      if (!doc) {
        const err = new Error('Not found');
        (err as any).status = 404;
        throw err;
      }
      const icon = (doc as any)?.icon;
      if (typeof icon === 'string') {
        const publicId = getPublicIdFromUrl(icon);
        if (publicId) {
          try {
            await deleteFromCloudinary(publicId);
          } catch (e) {
            console.error('Cloudinary delete image error:', e);
          }
        }
      }
      await Category.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Đã xóa danh mục vĩnh viễn', success: true });
    }

    // Hide/Unhide endpoint
    if (req.method === 'POST') {
      const { action } = req.body || {};
      if (action === 'hide') {
        const updated = await Category.findByIdAndUpdate(id, { active: false }, { new: true });
        if (!updated) {
          const err = new Error('Not found');
          (err as any).status = 404;
          throw err;
        }
        return res.status(200).json({ ...updated.toObject(), message: 'Đã ẩn danh mục' });
      }
      if (action === 'unhide') {
        const updated = await Category.findByIdAndUpdate(id, { active: true }, { new: true });
        if (!updated) {
          const err = new Error('Not found');
          (err as any).status = 404;
          throw err;
        }
        return res.status(200).json({ ...updated.toObject(), message: 'Đã hiển thị danh mục' });
      }
      return res.status(400).json({ message: 'Invalid action' });
    }

    return methodNotAllowed(res);
  } catch (err: any) {
    const status = err?.status || 500;
    return res.status(status).json({ message: err?.message || 'Server error' });
  }
}
