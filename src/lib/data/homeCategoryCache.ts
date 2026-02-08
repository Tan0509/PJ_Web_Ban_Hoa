import { connectMongo } from '@/lib/mongoose';
import HomeCategoryCache from '@/models/HomeCategoryCache';
import Category from '@/models/Category';
import Product from '@/models/Product';

const CACHE_KEY_PREFIX = 'home-category-preview:';

const toKey = (slug: string) => `${CACHE_KEY_PREFIX}${slug}`;

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
  const docs = await HomeCategoryCache.find({
    key: { $regex: `^${CACHE_KEY_PREFIX}` },
  })
    .select('categoryProducts')
    .lean();
  const merged: unknown[] = [];
  docs.forEach((d: any) => {
    const raw = d?.categoryProducts;
    if (raw && typeof raw === 'object') merged.push(raw);
  });
  return merged.map(toPreviewGroup).filter(Boolean);
}

async function buildCacheForSlug(slug: string) {
  const category = await Category.findOne({ slug, active: { $ne: false } })
    .select('name slug icon')
    .lean() as { _id?: unknown; name?: string; slug?: string; icon?: string } | null;
  if (!category) return null;

  const products = await Product.find({
    active: true,
    $or: [{ categorySlug: slug }, { categorySlugs: slug }],
  })
    .select('name price salePrice discountPercent images slug categorySlug createdAt')
    .sort({ createdAt: -1 })
    .limit(9)
    .lean();

  const hasMore = products.length > 8;
  const group = {
    category: {
      _id: (category as any)._id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
    },
    products: products.slice(0, 8).map(toPreviewProduct),
    hasMore,
  };

  await HomeCategoryCache.updateOne(
    { key: toKey(slug) },
    { $set: { key: toKey(slug), categoryProducts: group, updatedAt: new Date() } },
    { upsert: true }
  );

  return group;
}

export async function getHomeCategoryCacheBySlugs(slugs: string[]) {
  if (!slugs.length) return [];
  await connectMongo();
  const keys = slugs.map(toKey);
  const docs = await HomeCategoryCache.find({ key: { $in: keys } })
    .select('key categoryProducts')
    .lean();

  const map = new Map<string, any>();
  docs.forEach((d: any) => {
    const key = String(d?.key || '');
    const slug = key.startsWith(CACHE_KEY_PREFIX) ? key.slice(CACHE_KEY_PREFIX.length) : '';
    if (slug) map.set(slug, toPreviewGroup(d?.categoryProducts));
  });

  const missing = slugs.filter((s) => !map.has(s));
  if (missing.length) {
    const built = await Promise.all(missing.map((s) => buildCacheForSlug(s)));
    missing.forEach((s, idx) => {
      const g = built[idx];
      if (g) map.set(s, g);
    });
  }

  return slugs.map((s) => map.get(s)).filter(Boolean);
}
