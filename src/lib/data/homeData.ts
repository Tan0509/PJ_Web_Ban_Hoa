import { connectMongo } from '@/lib/mongoose';
import Category from '@/models/Category';
import Poster from '@/models/Poster';
import Product from '@/models/Product';

const PREVIEW_LIMIT = 8;

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
