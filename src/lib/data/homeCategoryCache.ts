import { connectMongo } from '@/lib/mongoose';
import HomeCategoryCache from '@/models/HomeCategoryCache';

const CACHE_KEY = 'home-category-preview';

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
