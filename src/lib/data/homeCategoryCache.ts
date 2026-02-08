import { connectMongo } from '@/lib/mongoose';
import HomeCategoryCache from '@/models/HomeCategoryCache';
import Category from '@/models/Category';
import Product from '@/models/Product';
import Poster from '@/models/Poster';
import HomeRebuildLog from '@/models/HomeRebuildLog';

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

export async function rebuildHomeCategoryCache() {
  await connectMongo();
  const categories = await Category.find({ active: { $ne: false } })
    .select('name slug')
    .lean();
  const slugs = categories
    .map((c: any) => String(c?.slug || '').trim())
    .filter(Boolean);
  const built = await Promise.all(slugs.map((s) => buildCacheForSlug(s)));

  // Build snapshot for reporting (home cache only)
  const categoryMap = new Map<string, { _id?: string; name?: string; slug?: string }>();
  categories.forEach((c: any) => {
    const slug = String(c?.slug || '');
    if (slug) categoryMap.set(slug, { _id: String(c?._id || ''), name: c?.name, slug });
  });

  const snapshot = {
    categories: slugs.map((s) => categoryMap.get(s)).filter(Boolean),
    productsByCategory: built
      .filter(Boolean)
      .map((g: any) => ({
        slug: g?.category?.slug,
        products: (g?.products || []).map((p: any) => ({
          _id: String(p?._id || ''),
          name: p?.name,
          slug: p?.slug,
        })),
      })),
    posters: (await Poster.find({ active: { $ne: false } }).select('name imageUrl').lean()).map((p: any) => ({
      _id: String(p?._id || ''),
      name: p?.name,
      imageUrl: p?.imageUrl,
    })),
  };

  const prev = await HomeRebuildLog.findOne({ key: 'home-rebuild-snapshot' }).lean();
  const prevSnap = (prev as any)?.snapshot || {};

  const prevCatIds = new Set((prevSnap.categories || []).map((c: any) => String(c?._id || '')));
  const nextCatIds = new Set((snapshot.categories || []).map((c: any) => String(c?._id || '')));
  const categoriesAdded = (snapshot.categories || []).filter((c: any) => !prevCatIds.has(String(c?._id || '')));
  const categoriesRemoved = (prevSnap.categories || []).filter((c: any) => !nextCatIds.has(String(c?._id || '')));

  const prevPostIds = new Set((prevSnap.posters || []).map((p: any) => String(p?._id || '')));
  const nextPostIds = new Set((snapshot.posters || []).map((p: any) => String(p?._id || '')));
  const postersAdded = (snapshot.posters || []).filter((p: any) => !prevPostIds.has(String(p?._id || '')));
  const postersRemoved = (prevSnap.posters || []).filter((p: any) => !nextPostIds.has(String(p?._id || '')));

  const prevByCat = new Map<string, any[]>(
    (prevSnap.productsByCategory || []).map((g: any) => [String(g?.slug || ''), g?.products || []])
  );
  const productsAddedByCategory: Array<{ slug: string; products: any[] }> = [];
  const productsRemovedByCategory: Array<{ slug: string; products: any[] }> = [];

  (snapshot.productsByCategory || []).forEach((g: any) => {
    const slug = String(g?.slug || '');
    if (!slug) return;
    const prevItems = prevByCat.get(slug) || [];
    const prevIds = new Set(prevItems.map((p: any) => String(p?._id || '')));
    const nextItems = g?.products || [];
    const nextIds = new Set(nextItems.map((p: any) => String(p?._id || '')));
    const added = nextItems.filter((p: any) => !prevIds.has(String(p?._id || '')));
    const removed = prevItems.filter((p: any) => !nextIds.has(String(p?._id || '')));
    if (added.length) productsAddedByCategory.push({ slug, products: added });
    if (removed.length) productsRemovedByCategory.push({ slug, products: removed });
  });

  await HomeRebuildLog.updateOne(
    { key: 'home-rebuild-snapshot' },
    { $set: { key: 'home-rebuild-snapshot', snapshot } },
    { upsert: true }
  );

  return {
    count: built.filter(Boolean).length,
    slugs,
    report: {
      categoriesAdded,
      categoriesRemoved,
      postersAdded,
      postersRemoved,
      productsAddedByCategory,
      productsRemovedByCategory,
      note: 'Báo cáo chỉ dựa trên cache home (top 8 mỗi danh mục).',
    },
  };
}
