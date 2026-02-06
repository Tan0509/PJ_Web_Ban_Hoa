import type { SortOrder } from 'mongoose';
import { connectMongo } from '@/lib/mongoose';
import Category from '@/models/Category';
import Product from '@/models/Product';
import AppSetting from '@/models/AppSetting';

export type SearchParams = {
  page?: string;
  minPrice?: string;
  maxPrice?: string;
  color?: string;
  type?: string;
  sort?: string;
};

const PAGE_SIZE = 24;

function buildFilters(slug: string, searchParams: SearchParams, categoryId: string) {
  const filters: any = {
    active: true,
    categorySlug: slug,
  };

  const minPrice = Number(searchParams.minPrice);
  const maxPrice = Number(searchParams.maxPrice);
  if (!Number.isNaN(minPrice)) filters.price = { ...(filters.price || {}), $gte: minPrice };
  if (!Number.isNaN(maxPrice)) filters.price = { ...(filters.price || {}), $lte: maxPrice };

  const colors = (searchParams.color || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (colors.length) filters.colors = { $in: colors };

  const types = (searchParams.type || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (types.length) filters.flowerTypes = { $in: types };

  return filters;
}

function getSort(sort?: string): Record<string, SortOrder> {
  switch (sort) {
    case 'price-asc':
      return { salePrice: 1, price: 1, createdAt: -1 };
    case 'price-desc':
      return { salePrice: -1, price: -1, createdAt: -1 };
    case 'popular':
      return { soldCount: -1, createdAt: -1 };
    case 'newest':
    default:
      return { createdAt: -1 };
  }
}

export async function getCategoryPageData(slug: string, searchParams: SearchParams) {
  await connectMongo();

  const page = Math.max(parseInt(searchParams.page || '1', 10) || 1, 1);
  const normalized: SearchParams = {
    page: String(page),
    minPrice: searchParams.minPrice,
    maxPrice: searchParams.maxPrice,
    color: searchParams.color,
    type: searchParams.type,
    sort: searchParams.sort,
  };

  const category = await Category.findOne({ slug, active: { $ne: false } }).lean();
  if (!category || !(category as any)._id) return null;

  const categoryId = String((category as any)._id);
  const filters = buildFilters(slug, normalized, categoryId);
  const sort = getSort(normalized.sort);

  const [products, total, productFiltersDoc] = await Promise.all([
    Product.find(filters)
      .select('name price salePrice discountPercent images slug active categorySlug')
      .sort(sort)
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Product.countDocuments(filters),
    AppSetting.findOne({ key: 'singleton' }).select('productFilters').lean(),
  ]);

  const productFilters = (() => {
    const pf = productFiltersDoc as { productFilters?: { types?: { enabled?: boolean; items?: { id: string; label: string; enabled?: boolean }[] }; colors?: { enabled?: boolean; items?: { id: string; label: string; enabled?: boolean }[] } } } | null;
    if (!pf?.productFilters) return undefined;
    return {
      types: {
        enabled: !!pf.productFilters.types?.enabled,
        items: (pf.productFilters.types?.items || []).filter((x) => x?.enabled).map((x) => ({ id: x.id, label: x.label })),
      },
      colors: {
        enabled: !!pf.productFilters.colors?.enabled,
        items: (pf.productFilters.colors?.items || []).filter((x) => x?.enabled).map((x) => ({ id: x.id, label: x.label })),
      },
    };
  })();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const plainProducts = JSON.parse(JSON.stringify(products));

  return {
    category,
    products: plainProducts,
    total,
    productFilters,
    totalPages,
    currentPath: `/category/${slug}`,
    normalized,
  };
}
