'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ProductCard from './ProductCard';

type Category = {
  _id?: string;
  name: string;
  slug?: string;
  icon?: string;
};

type Product = {
  _id?: string;
  name: string;
  price?: number;
  salePrice?: number;
  discountPercent?: number;
  images?: string[];
  slug?: string;
};

type Group = {
  category: Category;
  products: Product[];
  hasMore: boolean;
};

type Props = {
  items: Group[];
};

const BATCH_SIZE = 2;

export default function CategoryProductsByCategory({ items }: Props) {
  const [loaded, setLoaded] = useState<Record<string, { products: Product[]; hasMore: boolean }>>({});
  const [loading, setLoading] = useState(false);

  const pending = items.filter((g) => g.products.length === 0 && g.category._id && !loaded[String(g.category._id)]);
  const hasPending = pending.length > 0;

  const loadNext = useCallback(async () => {
    if (loading || !hasPending) return;
    const batch = pending.slice(0, BATCH_SIZE);
    const slugs = batch.map((g) => g.category.slug).filter(Boolean).join(',');
    if (!slugs) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (slugs) params.set('categorySlugs', slugs);
      const res = await fetch(`/api/home/category-products?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Avoid hammering the API on failures
        await new Promise((r) => setTimeout(r, 3000));
        return;
      }

      const data = Array.isArray(json?.data) ? json.data : [];
      setLoaded((prev) => {
        const next = { ...prev };
        data.forEach((g: Group) => {
          const id = g.category?._id?.toString?.();
          if (id) next[id] = { products: g.products || [], hasMore: !!g.hasMore };
        });
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [loading, hasPending, pending]);

  useEffect(() => {
    if (!hasPending || loading) return;
    loadNext();
  }, [hasPending, loading, loadNext]);

  const displayGroups: Group[] = items.map((g) => {
    const id = g.category._id?.toString?.();
    if (g.products.length > 0) return g;
    const l = id ? loaded[id] : undefined;
    return { category: g.category, products: l?.products ?? [], hasMore: l?.hasMore ?? false };
  });

  if (!displayGroups?.length) return null;

  return (
    <section className="container-section pb-12 md:pb-16 space-y-10">
      {displayGroups.map((group) => (
        <div key={group.category.slug || group.category._id || group.category.name} className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="flex-1 h-px bg-gray-200" />
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 text-center whitespace-nowrap">
              {group.category.name}
            </h3>
            <span className="flex-1 h-px bg-gray-200" />
          </div>

          {group.products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-7">
                {group.products.slice(0, 8).map((product) => (
                  <ProductCard key={product._id || product.slug || product.name} product={product} />
                ))}
              </div>
              {group.hasMore && group.category.slug && (
                <div className="text-center">
                  <Link
                    href={`/danh-muc/${group.category.slug}`}
                    className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-[#0f5c5c] text-white font-semibold shadow hover:bg-[#0c4d4d] transition"
                  >
                    Xem thêm
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="min-h-[200px] flex items-center justify-center bg-gray-50 rounded-lg">
              {loading ? (
                <span className="text-gray-500">Đang tải...</span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>
          )}
        </div>
      ))}
      {hasPending && <div className="min-h-[120px]" aria-hidden />}
    </section>
  );
}
