'use client';

import { useEffect, useState } from 'react';
import { getPageCache, setPageCache, clearPageCacheKey } from '@/lib/pageCache';
import CustomerBanner from '@/components/customer/CustomerBanner';
import CategoryCircles from '@/components/customer/CategoryCircles';
import nextDynamic from 'next/dynamic';

// Preload chunks sớm: above-the-fold trước, phần dưới sau (giữ dynamic, không đổi UI/API/layout)
function usePreloadHomeChunks() {
  useEffect(() => {
    import('@/components/customer/FeaturedProductsSection');
    const t = setTimeout(() => {
      import('@/components/customer/CategoryProductsByCategory');
    }, 80);
    return () => clearTimeout(t);
  }, []);
}

const FeaturedProductsSectionDynamic = nextDynamic(
  () => import('@/components/customer/FeaturedProductsSection'),
  {
    loading: () => (
      <section className="container-section pb-12 md:pb-16">
        <div className="h-9 w-52 rounded-lg skeleton-shimmer mx-auto mb-8 max-w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-7">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[3/4] rounded-xl skeleton-shimmer" />
              <div className="h-4 w-3/4 rounded-lg skeleton-shimmer" />
              <div className="h-5 w-1/2 rounded-lg skeleton-shimmer" />
            </div>
          ))}
        </div>
      </section>
    ),
  }
);

const CategoryProductsByCategoryDynamic = nextDynamic(
  () => import('@/components/customer/CategoryProductsByCategory'),
  {
    loading: () => (
      <section className="container-section pb-12 md:pb-16 space-y-8">
        <div className="space-y-4">
          <div className="h-7 w-64 rounded-lg skeleton-shimmer" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[3/4] rounded-xl skeleton-shimmer" />
                <div className="h-4 w-3/4 rounded skeleton-shimmer" />
                <div className="h-5 w-1/2 rounded skeleton-shimmer" />
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
  }
);

const CACHE_KEY_HOME = 'home';

type CategoryGroup = { category: unknown; products: unknown[]; hasMore: boolean };

type HomeData = {
  categories: unknown[];
  posters: unknown[];
  topCategories: unknown[];
  hasMore: boolean;
  featuredProducts: unknown[];
  featuredHasMore: boolean;
  categoryProducts: CategoryGroup[];
};

export default function HomeClient() {
  usePreloadHomeChunks();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    const cached = getPageCache<HomeData>(CACHE_KEY_HOME);
    if (cached && Array.isArray(cached.categoryProducts)) {
      setData(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const mergeCategoryGroups = (current: CategoryGroup[], incoming: CategoryGroup[]) => {
      const nextMap = new Map<string, { products: unknown[]; hasMore: boolean }>();
      incoming.forEach((g) => {
        const id = (g as any)?.category?._id?.toString?.();
        if (id) nextMap.set(id, { products: g.products || [], hasMore: !!g.hasMore });
      });
      return current.map((g) => {
        const id = (g as any)?.category?._id?.toString?.();
        const hit = id ? nextMap.get(id) : undefined;
        return hit ? { ...g, products: hit.products, hasMore: hit.hasMore } : g;
      });
    };

    const prefetchCategoryProducts = async (categories: unknown[]) => {
      const first = categories.slice(0, 4) as any[];
      const ids = first.map((c) => c?._id).filter(Boolean).join(',');
      const slugs = first.map((c) => c?.slug).filter(Boolean).join(',');
      if (!ids && !slugs) return;
      const params = new URLSearchParams();
      if (ids) params.set('categoryIds', ids);
      if (slugs) params.set('categorySlugs', slugs);
      const res = await fetch(`/api/home/category-products?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || cancelled) return;
      const incoming = Array.isArray(json?.data) ? (json.data as CategoryGroup[]) : [];
      setData((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          categoryProducts: mergeCategoryGroups(prev.categoryProducts, incoming),
        };
        setPageCache(CACHE_KEY_HOME, next);
        return next;
      });
    };

    fetch('/api/home', { cache: 'no-store' })
      .then(async (res) => {
        if (cancelled) return;
        const raw = await res.text();
        let json: any = null;
        if (raw) {
          try {
            json = JSON.parse(raw);
          } catch {
            json = null;
          }
        }
        if (!res.ok) {
          const msg = res.status === 502
            ? 'Máy chủ tạm lỗi (502). Kiểm tra biến môi trường trên Netlify hoặc thử lại.'
            : `Lỗi ${res.status}. Thử lại sau.`;
          setError(msg);
          setLoading(false);
          return;
        }
        if (cancelled) return;
        if (!json?.success || !json?.data) {
          setError((json as { message?: string })?.message || 'Không tải được dữ liệu');
          setLoading(false);
          return;
        }
        const base = json.data as Omit<HomeData, 'categoryProducts'> & { categories: unknown[] };
        const categoryProducts: CategoryGroup[] = Array.isArray(base?.categories)
          ? base.categories.map((category) => ({ category, products: [], hasMore: false }))
          : [];
        const d: HomeData = { ...base, categoryProducts };
        setPageCache(CACHE_KEY_HOME, d);
        setData(d);
        setLoading(false);
        if (Array.isArray(base?.categories) && base.categories.length) {
          prefetchCategoryProducts(base.categories);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Lỗi kết nối');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryTrigger]);

  const handleRetry = () => {
    clearPageCacheKey(CACHE_KEY_HOME);
    setError(null);
    setLoading(true);
    setRetryTrigger((t) => t + 1);
  };

  if (loading && !data) {
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center py-20">
        <div className="h-10 w-56 rounded-lg skeleton-shimmer mb-4" />
        <div className="h-2 w-32 rounded skeleton-shimmer" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center py-20 px-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-center text-sm text-amber-800 max-w-md">
          {error}
        </div>
        <button
          type="button"
          onClick={handleRetry}
          className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white min-h-screen">
      <CustomerBanner posters={data.posters as any} />
      <CategoryCircles categories={data.topCategories as any} hasMore={data.hasMore} />
      <FeaturedProductsSectionDynamic products={data.featuredProducts as any} hasMore={data.featuredHasMore} />
      <CategoryProductsByCategoryDynamic items={data.categoryProducts as any} />
    </div>
  );
}
