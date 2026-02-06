import { connectMongo } from '@/lib/mongoose';
import HomeCategoryCache from '@/models/HomeCategoryCache';

const CACHE_KEY = 'home-category-preview';

type PreviewProduct = {
  _id?: unknown;
  name?: string;
  price?: number;
  salePrice?: number;
  discountPercent?: number;
  images?: string[];
  slug?: string;
  categorySlug?: string;
};

function toPreviewProduct(input: any): PreviewProduct {
  if (!input || typeof input !== 'object') return {};
  return {
    _id: input._id,
    name: input.name,
    price: input.price,
    salePrice: input.salePrice,
    discountPercent: input.discountPercent,
    images: Array.isArray(input.images) ? input.images : [],
    slug: input.slug,
    categorySlug: input.categorySlug,
  };
}

function toPreviewGroup(input: any) {
  if (!input || typeof input !== 'object') return null;
  const category = input.category || {};
  const products = Array.isArray(input.products) ? input.products.map(toPreviewProduct) : [];
  return {
    category: {
      _id: category._id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
    },
    products,
    hasMore: !!input.hasMore,
  };
}

export async function getHomeCategoryCache() {
  await connectMongo();
  const doc = await HomeCategoryCache.findOne({ key: CACHE_KEY }).lean() as
    | { categoryProducts?: unknown[] }
    | null;
  const raw = doc?.categoryProducts || [];
  if (!Array.isArray(raw)) return [];
  return raw.map(toPreviewGroup).filter(Boolean);
}

export async function getHomeCategoryCacheBySlugs(slugs: string[]) {
  if (!slugs.length) return [];
  const all = await getHomeCategoryCache();
  if (!Array.isArray(all)) return [];
  const wanted = new Set(slugs);
  return all.filter((g: any) => {
    const slug = g?.category?.slug;
    return slug && wanted.has(slug);
  });
}
