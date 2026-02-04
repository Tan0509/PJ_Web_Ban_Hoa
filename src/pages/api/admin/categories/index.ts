import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import { isAdminFromSession } from '@/lib/authHelpers';
import { methodNotAllowed } from '@/lib/helpers/pagesApi';

type CategoryPayload = {
  name: string;
  slug: string;
  icon?: string;
  order?: number;
  menuOrder?: number;
  description?: string;
  active?: boolean;
};

type ListResponse = {
  items: any[];
  total: number;
  page: number;
  limit: number;
};

type ErrorResponse = { message: string };

// This module is cloned 100% from Product Admin
// Keep logic and structure consistent with Product Admin
// AUTH REFACTOR: Use NextAuth session instead of cookie-based auth

async function listCategories(query: NextApiRequest['query']): Promise<ListResponse> {
  const {
    page = '1',
    limit = '10',
    search = '',
    status,
  } = query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page || '1', 10));
  const limitNum = Math.max(1, Math.min(50, parseInt(limit || '10', 10)));

  const filter: any = {};
  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }
  if (status === 'active') filter.active = true;
  if (status === 'inactive') filter.active = false;

  const total = await Category.countDocuments(filter);
  const items = await Category.find(filter)
    .sort({ order: 1, createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .select('name slug icon order menuOrder description active createdAt');

  return { items, total, page: pageNum, limit: limitNum };
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function createCategory(body: CategoryPayload) {
  const { name, slug, icon, order, menuOrder, description, active } = body;
  const nameTrim = typeof name === 'string' ? name.trim() : '';
  const slugTrim = typeof slug === 'string' ? slug.trim() : '';
  const orderNum = Number(order);
  const menuOrderNum = Number(menuOrder);

  if (!nameTrim) {
    const err = new Error('Vui lòng nhập tên danh mục');
    (err as any).status = 400;
    throw err;
  }
  if (!slugTrim) {
    const err = new Error('Vui lòng nhập slug (hoặc để tự sinh từ tên)');
    (err as any).status = 400;
    throw err;
  }
  if (!icon || !String(icon).trim()) {
    const err = new Error('Vui lòng thêm ảnh danh mục');
    (err as any).status = 400;
    throw err;
  }
  if (Number.isNaN(orderNum) || orderNum < 0) {
    const err = new Error('Vui lòng nhập thứ tự hiển thị (section) hợp lệ');
    (err as any).status = 400;
    throw err;
  }
  if (Number.isNaN(menuOrderNum) || menuOrderNum < 0) {
    const err = new Error('Vui lòng nhập thứ tự menu hợp lệ');
    (err as any).status = 400;
    throw err;
  }

  const nameExists = await Category.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(nameTrim)}$`, 'i') },
  });
  if (nameExists) {
    const err = new Error('Tên danh mục đã tồn tại, vui lòng nhập tên khác');
    (err as any).status = 409;
    throw err;
  }

  const slugExists = await Category.findOne({ slug: slugTrim });
  if (slugExists) {
    const err = new Error('Slug đã tồn tại, vui lòng nhập slug khác');
    (err as any).status = 409;
    throw err;
  }

  const orderExists = await Category.findOne({ order: orderNum });
  if (orderExists) {
    const err = new Error(`Thứ tự hiển thị (section) "${orderNum}" đã được sử dụng, vui lòng chọn số khác`);
    (err as any).status = 409;
    throw err;
  }

  const menuOrderExists = await Category.findOne({ menuOrder: menuOrderNum });
  if (menuOrderExists) {
    const err = new Error(`Thứ tự menu "${menuOrderNum}" đã được sử dụng, vui lòng chọn số khác`);
    (err as any).status = 409;
    throw err;
  }

  return Category.create({
    name: nameTrim,
    slug: slugTrim,
    icon: String(icon).trim(),
    order: orderNum,
    menuOrder: menuOrderNum,
    description,
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
      const data = await listCategories(req.query);
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const created = await createCategory(req.body || {});
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
