'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getPageCache, setPageCache } from '@/lib/pageCache';
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

function buildPageLink(path: string, searchParams: SearchParams, page: number) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([k, v]) => {
    if (typeof v === 'string') params.set(k, v);
  });
  params.set('page', String(page));
  return `${path}?${params.toString()}`;
}

function categoryCacheKey(slug: string, params: SearchParams) {
  return `category:${slug}:${params.page || '1'}:${params.sort || ''}:${params.minPrice || ''}:${params.maxPrice || ''}:${params.color || ''}:${params.type || ''}`;
}

type CategoryData = {
  category: any;
  products: any[];
  total: number;
  productFilters: any;
  totalPages: number;
  currentPath: string;
  normalized: SearchParams;
};

export default function CategoryClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const normalized: SearchParams = useMemo(() => ({
    page: searchParams?.get('page') || undefined,
    minPrice: searchParams?.get('minPrice') || undefined,
    maxPrice: searchParams?.get('maxPrice') || undefined,
    color: searchParams?.get('color') || undefined,
    type: searchParams?.get('type') || undefined,
    sort: searchParams?.get('sort') || undefined,
  }), [searchParams]);

  const [data, setData] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paramsString = useMemo(() => JSON.stringify(normalized), [normalized]);

  useEffect(() => {
    const key = categoryCacheKey(slug, normalized);
    const cached = getPageCache<CategoryData>(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const qs = new URLSearchParams();
    Object.entries(normalized).forEach(([k, v]) => {
      if (v) qs.set(k, v);
    });
    const url = `/api/category/${encodeURIComponent(slug)}${qs.toString() ? `?${qs.toString()}` : ''}`;

    fetch(url, { cache: 'no-store' })
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          setLoading(false);
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (json === null) return;
        if (!json?.success || !json?.data) {
          setError(json?.message || 'Không tải được danh mục');
          setLoading(false);
          return;
        }
        const d = json.data as CategoryData;
        setPageCache(key, d);
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Lỗi kết nối');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, paramsString]);

  if (loading && !data) {
    return (
      <div className={`bg-white ${styles.categoryPage}`}>
        <section className="container-section pt-6 pb-10">
          <div className="grid lg:grid-cols-[280px,1fr] gap-8">
            <aside className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="h-7 w-32 rounded skeleton-shimmer mb-2" />
              <div className="h-4 w-24 rounded skeleton-shimmer" />
            </aside>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-[3/4] rounded-xl skeleton-shimmer" />
                  <div className="h-4 w-3/4 rounded skeleton-shimmer" />
                  <div className="h-5 w-1/2 rounded skeleton-shimmer" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (notFound || (error && !data)) {
    return (
      <div className="container-section py-20 text-center">
        <p className="text-gray-500">{notFound ? 'Không tìm thấy danh mục.' : error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { category, products, total, productFilters, totalPages, currentPath, normalized: norm } = data;
  const page = parseInt(norm.page || '1', 10) || 1;

  return (
    <div className={`bg-white ${styles.categoryPage}`}>
      <section className="container-section pt-6 pb-10">
        <div className="grid lg:grid-cols-[280px,1fr] gap-8">
          <CategoryFilterSidebar
            categoryName={category.name}
            totalProducts={total}
            slug={slug}
            productFilters={productFilters}
          />
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product: any) => (
                <ProductCard key={product._id?.toString?.() || product.slug || product.name} product={product} />
              ))}
              {!products.length && (
                <div className="col-span-full text-center text-gray-500 py-10">Chưa có sản phẩm trong danh mục này.</div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <a
                  href={page > 1 ? buildPageLink(currentPath, norm, page - 1) : '#'}
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
                      href={buildPageLink(currentPath, norm, p)}
                      className={`px-3 py-2 rounded-md border text-sm ${
                        active ? 'bg-[#0f5c5c] text-white border-[#0f5c5c]' : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </a>
                  );
                })}
                <a
                  href={page < totalPages ? buildPageLink(currentPath, norm, page + 1) : '#'}
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
