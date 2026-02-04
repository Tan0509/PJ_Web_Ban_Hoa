import { connectMongo } from '@/lib/mongoose';
import { serializeForClient } from '@/lib/serializeForClient';
import Category from '@/models/Category';
import Poster from '@/models/Poster';
import Product from '@/models/Product';
import CategoryProductsByCategory from '@/components/customer/CategoryProductsByCategory';
import CustomerBanner from '@/components/customer/CustomerBanner';
import CategoryCircles from '@/components/customer/CategoryCircles';
import FeaturedProductsSection from '@/components/customer/FeaturedProductsSection';

// Revalidate every 60s so home is fast for repeat visits; first request still hits DB
export const revalidate = 60;

export default async function Home() {
  let categories: unknown[] = [];
  let posters: unknown[] = [];
  let featuredProductsRaw: unknown[] = [];
  let categoryProducts: { category: unknown; products: unknown[]; hasMore: boolean }[] = [];

  try {
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

    categories = cats;
    posters = post;
    featuredProductsRaw = featured;

    const topCategories = categories.slice(0, 6);
    const hasMore = categories.length > 6;
    const featuredProducts = featuredProductsRaw.slice(0, 8);
    const featuredHasMore = featuredProductsRaw.length > 8;

    // Optimize: Fetch all products for all categories in one query, then group by category
    // This reduces N queries (one per category) to just 1 query total
    const categoryIds = categories.map((c: unknown) => {
      const cat = c as { _id?: unknown; slug?: string };
      return cat._id?.toString?.() || String(cat._id || '');
    }).filter(Boolean);
    const categorySlugs = categories.map((c: unknown) => (c as { slug?: string })?.slug).filter(Boolean) as string[];

    const allCategoryProducts = await Product.find({
      active: true,
      $or: [
        { categoryIds: { $in: categoryIds } },
        { categoryId: { $in: categoryIds } },
        { categorySlug: { $in: categorySlugs } },
      ],
    })
      .select('name price salePrice discountPercent images slug active categoryId categoryIds categorySlug createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Group products by category (maintains original logic: 9 products per category, sorted by createdAt desc)
    categoryProducts = categories.map((category: unknown) => {
      const c = category as { _id?: unknown; slug?: string };
      const catId = c._id?.toString?.() || String(c._id || '');
      const catSlug = c.slug || '';

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

    return (
      <div className="bg-white min-h-screen">
        <CustomerBanner posters={serializeForClient(posters) as any} />
        <CategoryCircles categories={serializeForClient(topCategories) as any} hasMore={hasMore} />
        <FeaturedProductsSection products={serializeForClient(featuredProducts) as any} hasMore={featuredHasMore} />
        <CategoryProductsByCategory items={serializeForClient(categoryProducts) as any} />
      </div>
    );
  } catch (err) {
    console.error('[Home] Data fetch error:', err);
    const topCategories = categories.slice(0, 6);
    const hasMore = categories.length > 6;
    const featuredProducts = featuredProductsRaw.slice(0, 8);
    const featuredHasMore = featuredProductsRaw.length > 8;
    const items = categoryProducts;

    return (
      <div className="bg-white min-h-screen">
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
          Không thể tải dữ liệu. Vui lòng kiểm tra kết nối cơ sở dữ liệu và thử lại.
        </div>
        <CustomerBanner posters={serializeForClient(posters) as any} />
        <CategoryCircles categories={serializeForClient(topCategories) as any} hasMore={hasMore} />
        <FeaturedProductsSection products={serializeForClient(featuredProducts) as any} hasMore={featuredHasMore} />
        <CategoryProductsByCategory items={serializeForClient(items) as any} />
      </div>
    );
  }
}
