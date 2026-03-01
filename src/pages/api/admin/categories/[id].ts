import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import { isAdminFromSession } from '@/lib/authHelpers';
import { getPublicIdFromUrl, deleteFromCloudinary } from '@/lib/cloudinary';
import { methodNotAllowed } from '@/lib/helpers/pagesApi';
import Product from '@/models/Product';
import { rebuildHomeCategoryCache } from '@/lib/data/homeCategoryCache';
import { clearHomeApiCaches } from '@/lib/data/homeApiCache';

type ErrorResponse = { message: string };

// This module is cloned 100% from Product Admin
// Keep logic and structure consistent with Product Admin
// AUTH REFACTOR: Use NextAuth session instead of cookie-based auth

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function updateCategory(id: string, body: any) {
  const { name, slug, icon, parentId, order, menuOrder, description, active } = body || {};
  const nameTrim = typeof name === 'string' ? name.trim() : '';
  const slugTrim = typeof slug === 'string' ? slug.trim() : '';
  const parentIdTrim = typeof parentId === 'string' ? parentId.trim() : '';
  const isChild = Boolean(parentIdTrim);
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
  const menuOrderNum = Number(menuOrder);

  if (parentIdTrim) {
    if (parentIdTrim === id) {
      const err = new Error('Không thể chọn chính danh mục này làm danh mục cha');
      (err as any).status = 400;
      throw err;
    }
    const parent = await Category.findById(parentIdTrim).select('_id').lean();
    if (!parent) {
      const err = new Error('Danh mục cha không tồn tại');
      (err as any).status = 400;
      throw err;
    }
  }

  if (!isChild && !Number.isNaN(orderNum) && orderNum >= 0) {
    const orderExists = await Category.findOne({ order: orderNum, _id: { $ne: id }, parentId: { $in: [null, ''] } });
    if (orderExists) {
      const err = new Error(`Thứ tự hiển thị (section) "${orderNum}" đã được sử dụng, vui lòng chọn số khác`);
      (err as any).status = 409;
      throw err;
    }
  }

  if (!isChild && !Number.isNaN(menuOrderNum) && menuOrderNum >= 0) {
    const menuOrderExists = await Category.findOne({ menuOrder: menuOrderNum, _id: { $ne: id }, parentId: { $in: [null, ''] } });
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
  payload.parentId = parentIdTrim || undefined;
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
      await rebuildHomeCategoryCache();
      clearHomeApiCaches();
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      const productCount = await Product.countDocuments({
        $or: [{ categoryId: String(id) }, { categoryIds: String(id) }],
      });
      if (productCount > 0) {
        return res.status(400).json({
          message: 'Danh mục đang có sản phẩm. Vui lòng chuyển sản phẩm sang danh mục khác trước khi xóa.',
          productCount,
        });
      }
      const childCount = await Category.countDocuments({ parentId: String(id) });
      if (childCount > 0) {
        return res.status(400).json({
          message: 'Không thể xóa danh mục cha đang có danh mục con. Vui lòng xóa danh mục con trước.',
        });
      }
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
      await rebuildHomeCategoryCache();
      clearHomeApiCaches();
      return res.status(200).json({ message: 'Đã xóa danh mục vĩnh viễn', success: true });
    }

    // Hide/Unhide endpoint
    if (req.method === 'POST') {
      const { action } = req.body || {};
      if (action === 'list_products') {
        const sourceCategoryId = String(id);
        const products: any[] = await Product.find({
          $or: [{ categoryId: sourceCategoryId }, { categoryIds: sourceCategoryId }],
        })
          .select('_id name slug')
          .sort({ name: 1 })
          .lean();
        return res.status(200).json({
          success: true,
          products: products.map((p: any) => ({
            _id: String(p?._id || ''),
            name: String(p?.name || ''),
            slug: String(p?.slug || ''),
          })),
        });
      }
      if (action === 'hide') {
        const updated = await Category.findByIdAndUpdate(id, { active: false }, { new: true });
        if (!updated) {
          const err = new Error('Not found');
          (err as any).status = 404;
          throw err;
        }
        await rebuildHomeCategoryCache();
        clearHomeApiCaches();
        return res.status(200).json({ ...updated.toObject(), message: 'Đã ẩn danh mục' });
      }
      if (action === 'unhide') {
        const updated = await Category.findByIdAndUpdate(id, { active: true }, { new: true });
        if (!updated) {
          const err = new Error('Not found');
          (err as any).status = 404;
          throw err;
        }
        await rebuildHomeCategoryCache();
        clearHomeApiCaches();
        return res.status(200).json({ ...updated.toObject(), message: 'Đã hiển thị danh mục' });
      }
      if (action === 'transfer_delete') {
        const { targetCategoryId, productIds } = req.body || {};
        const sourceCategoryId = String(id);
        const targetId = String(targetCategoryId || '').trim();

        if (!targetId || targetId === sourceCategoryId) {
          return res.status(400).json({ message: 'Danh mục đích không hợp lệ' });
        }

        const targetCategory: any = await Category.findById(targetId).select('_id slug').lean();
        if (!targetCategory) return res.status(400).json({ message: 'Danh mục đích không tồn tại' });

        const sourceCategory: any = await Category.findById(sourceCategoryId).select('_id slug icon').lean();
        if (!sourceCategory) return res.status(404).json({ message: 'Danh mục nguồn không tồn tại' });

        const childCount = await Category.countDocuments({ parentId: sourceCategoryId });
        if (childCount > 0) {
          return res.status(400).json({
            message: 'Danh mục cha đang có danh mục con. Vui lòng xử lý danh mục con trước.',
          });
        }

        const ids = Array.isArray(productIds)
          ? productIds.map((x: any) => String(x || '').trim()).filter(Boolean)
          : [];
        if (!ids.length) {
          return res.status(400).json({ message: 'Vui lòng chọn ít nhất 1 sản phẩm để chuyển' });
        }

        const products: any[] = await Product.find({
          _id: { $in: ids },
          $or: [{ categoryId: sourceCategoryId }, { categoryIds: sourceCategoryId }],
        })
          .select('_id categoryId categoryIds categorySlug categorySlugs')
          .lean();

        if (!products.length) {
          return res.status(400).json({ message: 'Không có sản phẩm hợp lệ để chuyển' });
        }

        for (const p of products) {
          const nextIds = Array.from(
            new Set(
              [targetId, ...(Array.isArray(p.categoryIds) ? p.categoryIds : []), p.categoryId]
                .map((x) => String(x || '').trim())
                .filter(Boolean)
                .filter((x) => x !== sourceCategoryId)
            )
          );

          const nextSlugs = Array.from(
            new Set(
              [targetCategory.slug, ...(Array.isArray(p.categorySlugs) ? p.categorySlugs : []), p.categorySlug]
                .map((x) => String(x || '').trim())
                .filter(Boolean)
                .filter((x) => x !== String(sourceCategory.slug || ''))
            )
          );

          await Product.updateOne(
            { _id: p._id },
            {
              $set: {
                categoryId: nextIds[0] || targetId,
                categoryIds: nextIds,
                categorySlug: nextSlugs[0] || String(targetCategory.slug || ''),
                categorySlugs: nextSlugs,
              },
            }
          );
        }

        const sourceIcon = String(sourceCategory?.icon || '');
        if (sourceIcon) {
          const publicId = getPublicIdFromUrl(sourceIcon);
          if (publicId) {
            try {
              await deleteFromCloudinary(publicId);
            } catch (e) {
              console.error('Cloudinary delete image error:', e);
            }
          }
        }

        await Category.findByIdAndDelete(sourceCategoryId);
        await rebuildHomeCategoryCache();
        clearHomeApiCaches();

        return res.status(200).json({
          success: true,
          message: 'Đã chuyển sản phẩm và xóa danh mục thành công',
          movedCount: products.length,
          targetCategoryId: targetId,
        });
      }
      return res.status(400).json({ message: 'Invalid action' });
    }

    return methodNotAllowed(res);
  } catch (err: any) {
    const status = err?.status || 500;
    return res.status(status).json({ message: err?.message || 'Server error' });
  }
}
