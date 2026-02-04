'use client';

import { useEffect, useState } from 'react';
import { getPageCache, setPageCache } from '@/lib/pageCache';
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

type HomeData = {
  categories: unknown[];
  posters: unknown[];
  featuredProductsRaw: unknown[];
  topCategories: unknown[];
  hasMore: boolean;
  featuredProducts: unknown[];
  featuredHasMore: boolean;
  categoryProducts: { category: unknown; products: unknown[]; hasMore: boolean }[];
};

export default function HomeClient() {
  usePreloadHomeChunks();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = getPageCache<HomeData>(CACHE_KEY_HOME);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetch('/api/home', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json?.success || !json?.data) {
          setError(json?.message || 'Không tải được dữ liệu');
          setLoading(false);
          return;
        }
        const d = json.data as HomeData;
        setPageCache(CACHE_KEY_HOME, d);
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
  }, []);

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
      <div className="bg-white min-h-screen">
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
          {error}
        </div>
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
