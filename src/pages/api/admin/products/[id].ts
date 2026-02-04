import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import type { IProduct } from '@/models/Product';
import AppSetting from '@/models/AppSetting';
import { isAdminFromSession } from '@/lib/authHelpers';
import { getPublicIdFromUrl, deleteFromCloudinary } from '@/lib/cloudinary';

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

// Helper: Generate slug from name
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dash
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
}

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
  res: NextApiResponse<any | ErrorResponse>
) {
  if (!(await isAdminFromSession(req, res))) return res.status(401).json({ message: 'Unauthorized' });
  await dbConnect();

  const { id } = req.query;

  if (req.method === 'GET') {
    const product = await Product.findById(id)
      .select('name slug price salePrice images description metaDescription note specialOffers')
      .lean();
    if (!product) return res.status(404).json({ message: 'Not found' });
    return res.status(200).json(product);
  }

  if (req.method === 'PATCH') {
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

    // Check slug uniqueness (exclude current product)
    const exist = await Product.findOne({ slug: finalSlug, _id: { $ne: id } });
    if (exist) {
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

    const updated = await Product.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    return res.status(200).json(updated);
  }

  if (req.method === 'DELETE') {
    const doc = await Product.findById(id).lean() as IProduct | null;
    if (!doc) return res.status(404).json({ message: 'Not found' });
    const images: string[] = Array.isArray(doc.images) ? doc.images : [];
    for (const url of images) {
      if (typeof url !== 'string') continue;
      const publicId = getPublicIdFromUrl(url);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (e) {
          console.error('Cloudinary delete image error:', e);
        }
      }
    }
    await Product.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Đã xóa sản phẩm vĩnh viễn', success: true });
  }

  // Hide/Unhide endpoint
  if (req.method === 'POST') {
    const { action } = req.body || {};
    if (action === 'hide') {
      const updated = await Product.findByIdAndUpdate(id, { active: false }, { new: true });
      if (!updated) return res.status(404).json({ message: 'Not found' });
      return res.status(200).json({ ...updated.toObject(), message: 'Đã ẩn sản phẩm' });
    }
    if (action === 'unhide') {
      const updated = await Product.findByIdAndUpdate(id, { active: true }, { new: true });
      if (!updated) return res.status(404).json({ message: 'Not found' });
      return res.status(200).json({ ...updated.toObject(), message: 'Đã hiển thị sản phẩm' });
    }
    return res.status(400).json({ message: 'Invalid action' });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
