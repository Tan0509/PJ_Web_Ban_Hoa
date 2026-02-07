import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import AppSetting from '@/models/AppSetting';
import { isAdminFromSession } from '@/lib/authHelpers';
import { methodNotAllowed } from '@/lib/helpers/pagesApi';
import { slugify } from '@/lib/helpers/string';

type ListResponse = {
  items: any[];
  total: number;
  page: number;
  limit: number;
  categories: { _id: string; name: string; slug?: string }[];
};

type ErrorResponse = { 
  message: string;
  errors?: Array<{ field: string; message: string }>;
};

// Product admin CRUD – do not affect other admin modules
// Sync data directly with MongoDB
// AUTH REFACTOR: Use NextAuth session instead of cookie-based auth

// FIX: Increase body size limit to 10MB for image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

function sanitizeList(v: any) {
  const list = Array.isArray(v) ? v : [];
  return Array.from(new Set(list.map((x) => String(x || '').trim()).filter(Boolean)));
}

async function getFilterOptions() {
  const doc: any = (await AppSetting.findOne({ key: 'singleton' }).lean()) || null;
  const types: string[] = Array.isArray(doc?.productFilters?.types?.items)
    ? doc.productFilters.types.items.map((x: any) => String(x?.label || '').trim()).filter(Boolean)
    : [];
  const colors: string[] = Array.isArray(doc?.productFilters?.colors?.items)
    ? doc.productFilters.colors.items.map((x: any) => String(x?.label || '').trim()).filter(Boolean)
    : [];
  return { types, colors };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | ErrorResponse>
) {
  if (!(await isAdminFromSession(req, res))) return res.status(401).json({ message: 'Unauthorized' });

  await dbConnect();

  if (req.method === 'GET') {
    const {
      page = '1',
      limit = '10',
      search = '',
      status,
      categoryId,
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit || '10', 10)));

    const filter: any = {};
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    if (status === 'active') filter.active = true;
    if (status === 'inactive') filter.active = false;
    if (categoryId) {
      filter.$or = [{ categoryId }, { categoryIds: categoryId }];
    }

    const total = await Product.countDocuments(filter);
    const isLite = String(req.query.lite || '') === '1';
    const baseQuery = Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
    const items = await (isLite
      ? baseQuery.select('name slug price salePrice saleInputType saleInputValue images categoryId categoryIds active createdAt').lean()
      : baseQuery
          .select('name slug price salePrice saleInputType saleInputValue images categoryId categoryIds colors flowerTypes active createdAt metaDescription description note specialOffers')
          .lean());
    // Lite list payload reduces response size; full data still available via /api/admin/products/[id]

    const categories = await Category.find({}, 'name slug')
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      items,
      total,
      page: pageNum,
      limit: limitNum,
      categories: categories.map((c: any) => ({ _id: String(c._id), name: c.name, slug: c.slug })),
    });
  }

  if (req.method === 'POST') {
    const { name, slug, price, salePrice, saleInputType, saleInputValue, description, metaDescription, images, categoryId, categoryIds, colors, flowerTypes, active, note, specialOffers } =
      req.body || {};

    // Validate required fields
    const errors: Array<{ field: string; message: string }> = [];

    if (!name || !name.trim()) {
      errors.push({ field: 'name', message: 'CHƯA NHẬP TÊN SẢN PHẨM' });
    }
    if (typeof price !== 'number' || Number.isNaN(price) || price <= 0) {
      errors.push({ field: 'price', message: 'CHƯA NHẬP GIÁ CHO SẢN PHẨM' });
    }
    if (!metaDescription || !metaDescription.trim()) {
      errors.push({ field: 'metaDescription', message: 'CHƯA NHẬP MÔ TẢ NGẮN' });
    }
    if (!Array.isArray(images) || images.length === 0 || !images[0]) {
      errors.push({ field: 'images', message: 'CHƯA CHỌN ẢNH CHÍNH CHO SẢN PHẨM' });
    }
    
    // Support both categoryId (single) and categoryIds (array) for backward compatibility
    const finalCategoryIds = categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0
      ? categoryIds
      : categoryId ? [categoryId] : [];
    
    if (finalCategoryIds.length === 0) {
      errors.push({ field: 'categoryId', message: 'CHƯA CHỌN DANH MỤC CHO SẢN PHẨM' });
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        message: 'Vui lòng nhập đầy đủ thông tin bắt buộc',
        errors 
      });
    }

    const opts = await getFilterOptions();
    const pickedColors = sanitizeList(colors);
    const pickedTypes = sanitizeList(flowerTypes);
    const invalidColor = pickedColors.find((c) => opts.colors.length && !opts.colors.includes(c));
    const invalidType = pickedTypes.find((t) => opts.types.length && !opts.types.includes(t));
    if (invalidColor) {
      return res.status(400).json({
        message: 'Màu sắc không hợp lệ (không nằm trong Bộ lọc sản phẩm)',
        errors: [{ field: 'colors', message: `Màu không hợp lệ: ${invalidColor}` }],
      });
    }
    if (invalidType) {
      return res.status(400).json({
        message: 'Loại hoa không hợp lệ (không nằm trong Bộ lọc sản phẩm)',
        errors: [{ field: 'flowerTypes', message: `Loại không hợp lệ: ${invalidType}` }],
      });
    }

    // Generate slug from name if not provided
    const finalSlug = slug && slug.trim() ? slug.trim() : slugify(name.trim());

    // Check slug uniqueness
    const exists = await Product.findOne({ slug: finalSlug });
    if (exists) {
      return res.status(409).json({ 
        message: 'Slug đã tồn tại',
        errors: [{ field: 'slug', message: 'SLUG ĐÃ TỒN TẠI' }]
      });
    }

    const payload: any = {
      name: name.trim(),
      slug: finalSlug,
      price,
      salePrice: salePrice ?? undefined,
      saleInputType: saleInputType === 'percent' ? 'percent' : saleInputType === 'amount' ? 'amount' : undefined,
      saleInputValue: typeof saleInputValue === 'number' && !Number.isNaN(saleInputValue) ? saleInputValue : undefined,
      description: description?.trim() || '',
      metaDescription: metaDescription.trim(),
      images,
      categoryId: finalCategoryIds[0], // Legacy field
      categoryIds: finalCategoryIds,
      colors: pickedColors,
      flowerTypes: pickedTypes,
      active: typeof active === 'boolean' ? active : true,
      note: note?.trim() || undefined,
      specialOffers: specialOffers?.trim() || undefined,
    };

    const created = await Product.create(payload);
    return res.status(201).json({
      items: [created],
      total: 1,
      page: 1,
      limit: 1,
      categories: [],
    });
  }

  return methodNotAllowed(res);
}
