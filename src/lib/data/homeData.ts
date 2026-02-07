import { connectMongo } from '@/lib/mongoose';
import Category from '@/models/Category';
import Poster from '@/models/Poster';
import Product from '@/models/Product';

export async function getHomeData() {
  await connectMongo();

  const categoriesPromise = Category.find({ active: { $ne: false } })
    .select('name slug icon order active')
    .sort({ order: 1, name: 1 })
    .lean()
    .then((r) => r);

  const postersPromise = Poster.find({ active: { $ne: false } })
    .select('imageUrl link order active')
    .sort({ order: 1, _id: 1 })
    .limit(6)
    .lean()
    .then((r) => r);

  const featuredPromise = Product.find({ active: true })
    .select('name price salePrice discountPercent images slug isFeatured soldCount active')
    .sort({ soldCount: -1, createdAt: -1 })
    .limit(9)
    .lean()
    .then((r) => r);

  const [cats, post, featured] = await Promise.all([
    categoriesPromise,
    postersPromise,
    featuredPromise,
  ]);

  const categories = cats;
  const posters = post;
  const featuredProductsRaw = featured;
  const topCategories = categories.slice(0, 6);
  const hasMore = categories.length > 6;
  const featuredProducts = featuredProductsRaw.slice(0, 8);
  const featuredHasMore = featuredProductsRaw.length > 8;

  const categoryProducts: unknown[] = [];

  return {
    categories,
    posters,
    topCategories,
    hasMore,
    featuredProducts,
    featuredHasMore,
    categoryProducts,
  };
}
