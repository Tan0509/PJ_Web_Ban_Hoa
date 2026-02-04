'use client';

import { useEffect, useState } from 'react';
import { getPageCache, setPageCache } from '@/lib/pageCache';
import ProductDetail from '@/components/customer/ProductDetail';

type ProductData = { product: any; related: any[] };

function productCacheKey(slug: string) {
  return `product:${slug}`;
}

export default function ProductClient({ slug }: { slug: string }) {
  const [data, setData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = productCacheKey(slug);
    const cached = getPageCache<ProductData>(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/product/${encodeURIComponent(slug)}`, { cache: 'no-store' })
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
          setError(json?.message || 'Không tải được sản phẩm');
          setLoading(false);
          return;
        }
        const d = json.data as ProductData;
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
  }, [slug]);

  if (loading && !data) {
    return (
      <div className="container-section py-10 min-h-[60vh] flex items-center justify-center">
        <div className="grid lg:grid-cols-2 gap-8 w-full max-w-4xl">
          <div className="aspect-square rounded-xl skeleton-shimmer" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 rounded-lg skeleton-shimmer" />
            <div className="h-6 w-1/2 rounded skeleton-shimmer" />
            <div className="h-4 w-full rounded skeleton-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || (error && !data)) {
    return (
      <div className="container-section py-20 text-center">
        <p className="text-gray-500">{notFound ? 'Không tìm thấy sản phẩm.' : error}</p>
      </div>
    );
  }

  if (!data?.product) return null;

  return <ProductDetail product={data.product} related={data.related || []} />;
}
