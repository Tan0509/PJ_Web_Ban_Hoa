import { connectMongo } from '@/lib/mongoose';
import Category from '@/models/Category';
import Product from '@/models/Product';
import HomeCategoryCache from '@/models/HomeCategoryCache';

const CACHE_KEY = 'home-category-preview';
const PREVIEW_LIMIT = 8;

export async function getHomeCategoryCache() {
  await connectMongo();
  const doc = await HomeCategoryCache.findOne({ key: CACHE_KEY }).lean() as
    | { categoryProducts?: unknown[] }
    | null;
  return doc?.categoryProducts || [];
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

export async function rebuildHomeCategoryCache() {
  await connectMongo();

  const categories = await Category.find({ active: { $ne: false } })
    .select('name slug icon order active')
    .sort({ order: 1, name: 1 })
    .lean();

  const categoryProducts = await Promise.all(
    categories.map(async (category: unknown) => {
      const c = category as { slug?: string };
      const catSlug = c.slug || '';
      if (!catSlug) {
        return { category, products: [], hasMore: false };
      }

      const productsRaw = await Product.find({
        active: true,
        categorySlug: catSlug,
      })
        .select('name price salePrice discountPercent images slug active categorySlug')
        .sort({ createdAt: -1 })
        .limit(PREVIEW_LIMIT)
        .lean();

      const products = productsRaw.map((p: any) => {
        const { images, ...rest } = p;
        const thumb = Array.isArray(images) ? images.slice(0, 1) : images;
        return { ...rest, images: thumb };
      });

      return { category, products, hasMore: products.length >= PREVIEW_LIMIT };
    })
  );

  await HomeCategoryCache.findOneAndUpdate(
    { key: CACHE_KEY },
    { $set: { categoryProducts, updatedAt: new Date() } },
    { upsert: true }
  );

  return categoryProducts;
}
