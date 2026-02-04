import { connectMongo } from '@/lib/mongoose';
import Category from '@/models/Category';
import Poster from '@/models/Poster';
import Product from '@/models/Product';

const INITIAL_CATEGORY_COUNT = 2;

export async function getHomeData() {
  await connectMongo();

  const [cats, post, featured] = await Promise.all([
    Category.find({ active: { $ne: false } })
      .select('name slug icon order active')
      .sort({ order: 1, name: 1 })
      .lean(),
    Poster.find({ active: { $ne: false } })
      .select('imageUrl link order active')
      .sort({ order: 1, _id: 1 })
      .limit(6)
      .lean(),
    Product.find({ active: true })
      .select('name price salePrice discountPercent images slug isFeatured soldCount active')
      .sort({ soldCount: -1, createdAt: -1 })
      .limit(9)
      .lean(),
  ]);

  const categories = cats;
  const posters = post;
  const featuredProductsRaw = featured;
  const topCategories = categories.slice(0, 6);
  const hasMore = categories.length > 6;
  const featuredProducts = featuredProductsRaw.slice(0, 8);
  const featuredHasMore = featuredProductsRaw.length > 8;

  const categoryIds = categories.map((c: unknown) => {
    const cat = c as { _id?: unknown; slug?: string };
    return cat._id?.toString?.() || String(cat._id || '');
  }).filter(Boolean);
  const categorySlugs = categories.map((c: unknown) => (c as { slug?: string })?.slug).filter(Boolean) as string[];

  const firstIds = categoryIds.slice(0, INITIAL_CATEGORY_COUNT);
  const firstSlugs = categorySlugs.slice(0, INITIAL_CATEGORY_COUNT);

  const allCategoryProducts = await Product.find({
    active: true,
    $or: [
      { categoryIds: { $in: firstIds } },
      { categoryId: { $in: firstIds } },
      { categorySlug: { $in: firstSlugs } },
    ],
  })
    .select('name price salePrice discountPercent images slug active categoryId categoryIds categorySlug createdAt')
    .sort({ createdAt: -1 })
    .limit(25)
    .lean();

  const categoryProducts = categories.map((category: unknown, idx: number) => {
    const c = category as { _id?: unknown; slug?: string };
    const catId = c._id?.toString?.() || String(c._id || '');
    const catSlug = c.slug || '';

    if (idx >= INITIAL_CATEGORY_COUNT) {
      return { category, products: [], hasMore: false };
    }

    const products = allCategoryProducts
      .filter((p: any) => {
        const pCategoryIds = Array.isArray(p.categoryIds) ? p.categoryIds.map((id: unknown) => String(id)) : [];
        const pCategoryId = p.categoryId ? String(p.categoryId) : '';
        const pCategorySlug = p.categorySlug || '';
        return (
          pCategoryIds.includes(catId) ||
          pCategoryId === catId ||
          pCategorySlug === catSlug
        );
      })
      .slice(0, 9)
      .map((p: any) => {
        const { categoryId, categoryIds, categorySlug, createdAt, ...rest } = p;
        return rest;
      });

    return { category, products, hasMore: products.length > 8 };
  });

  return {
    categories,
    posters,
    featuredProductsRaw,
    topCategories,
    hasMore,
    featuredProducts,
    featuredHasMore,
    categoryProducts,
  };
}
