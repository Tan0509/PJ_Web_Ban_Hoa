import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { SortOrder } from 'mongoose';
import { connectMongo } from '@/lib/mongoose';
import { serializeForClient } from '@/lib/serializeForClient';
import Category from '@/models/Category';
import Product from '@/models/Product';
import AppSetting from '@/models/AppSetting';
import CategoryFilterSidebar from '@/components/customer/CategoryFilterSidebar';
import ProductCard from '@/components/customer/ProductCard';
import styles from './CategoryPage.module.css';

type SearchParams = {
  page?: string;
  minPrice?: string;
  maxPrice?: string;
  color?: string;
  type?: string;
  sort?: string;
};

type CategoryLean = { _id: unknown; name: string; slug?: string };

const PAGE_SIZE = 24; // 4 columns * 6 rows

function buildFilters(slug: string, searchParams: SearchParams, categoryId: string) {
  // Customer-side: chỉ hiển thị sản phẩm active
  const filters: any = {
    active: true,
    $or: [
      { categorySlug: slug },
      { categoryId: categoryId },
      { categoryIds: categoryId },
    ],
  };

  const minPrice = Number(searchParams.minPrice);
  const maxPrice = Number(searchParams.maxPrice);
  if (!Number.isNaN(minPrice)) filters.price = { ...(filters.price || {}), $gte: minPrice };
  if (!Number.isNaN(maxPrice)) filters.price = { ...(filters.price || {}), $lte: maxPrice };

  const colors = (searchParams.color || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (colors.length) {
    filters.colors = { $in: colors };
  }

  const types = (searchParams.type || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (types.length) {
    filters.flowerTypes = { $in: types };
  }

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

function buildPageLink(path: string, searchParams: SearchParams, page: number) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([k, v]) => {
    if (typeof v !== 'string') return;
    params.set(k, v);
  });
  params.set('page', String(page));
  return `${path}?${params.toString()}`;
}

type PageProps = {
  params: Promise<{ slug?: string }> | { slug?: string };
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
};

export default async function CategoryPage({ params, searchParams }: PageProps) {
  await connectMongo();

  const p = await Promise.resolve(params);
  const slug = typeof p?.slug === 'string' ? p.slug : '';
  if (!slug) return notFound();

  const sp = await Promise.resolve(searchParams);
  const pageRaw = sp?.page;
  const pageStr = Array.isArray(pageRaw) ? pageRaw[0] : pageRaw;
  const page = Math.max(parseInt(typeof pageStr === 'string' ? pageStr : '1', 10) || 1, 1);

  const normalized: SearchParams = {
    page: String(page),
    minPrice: Array.isArray(sp?.minPrice) ? sp.minPrice[0] : sp?.minPrice,
    maxPrice: Array.isArray(sp?.maxPrice) ? sp.maxPrice[0] : sp?.maxPrice,
    color: Array.isArray(sp?.color) ? sp.color[0] : sp?.color,
    type: Array.isArray(sp?.type) ? sp.type[0] : sp?.type,
    sort: Array.isArray(sp?.sort) ? sp.sort[0] : sp?.sort,
  };

  const category = await Category.findOne({ slug, active: { $ne: false } }).lean<CategoryLean | null>();
  if (!category || !category._id) return notFound();

  const categoryId = String(category._id);
  const filters = buildFilters(slug, normalized, categoryId);
  const sort = getSort(normalized.sort);

  const [products, total, productFiltersDoc] = await Promise.all([
    Product.find(filters).sort(sort).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
    Product.countDocuments(filters),
    AppSetting.findOne({ key: 'singleton' }).select('productFilters').lean(),
  ]);

  const plainProducts = serializeForClient(products as any[]);

  // Extract product filters for CategoryFilterSidebar (reduce client-side fetch)
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
  const currentPath = `/category/${slug}`;

  return (
    <div className={`bg-white ${styles.categoryPage}`}>
      <section className="container-section pt-6 pb-10">
        <div className="grid lg:grid-cols-[280px,1fr] gap-8">
          <Suspense
            fallback={
              <aside className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
                <div className="space-y-4">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{category.name}</div>
                    <div className="text-sm text-gray-500">Tổng sản phẩm: {total}</div>
                  </div>
                  <div className="text-sm text-gray-500">Đang tải bộ lọc...</div>
                </div>
              </aside>
            }
          >
            <CategoryFilterSidebar categoryName={category.name} totalProducts={total} slug={slug} productFilters={productFilters} />
          </Suspense>

          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {plainProducts.map((product: any) => (
                <ProductCard key={product._id?.toString?.() || product.slug || product.name} product={product} />
              ))}
              {!plainProducts.length && (
                <div className="col-span-full text-center text-gray-500 py-10">Chưa có sản phẩm trong danh mục này.</div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <a
                  href={page > 1 ? buildPageLink(currentPath, normalized, page - 1) : '#'}
                  className={`px-3 py-2 rounded-md border text-sm ${
                    page > 1 ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                  aria-disabled={page <= 1}
                >
                  Trước
                </a>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const p = idx + 1;
                  const active = p === page;
                  return (
                    <a
                      key={p}
                      href={buildPageLink(currentPath, normalized, p)}
                      className={`px-3 py-2 rounded-md border text-sm ${
                        active ? 'bg-[#0f5c5c] text-white border-[#0f5c5c]' : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </a>
                  );
                })}
                <a
                  href={page < totalPages ? buildPageLink(currentPath, normalized, page + 1) : '#'}
                  className={`px-3 py-2 rounded-md border text-sm ${
                    page < totalPages ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                  aria-disabled={page >= totalPages}
                >
                  Sau
                </a>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
