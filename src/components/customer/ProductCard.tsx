'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo } from 'react';
import { formatVnd } from '@/lib/helpers/format';
import { getOptimizedImageUrl } from '@/lib/helpers/image';
import { useStore } from './StoreProvider';

type Product = {
  _id?: string;
  name: string;
  price?: number;
  salePrice?: number;
  discountPercent?: number;
  images?: string[];
  slug?: string;
};

function formatCurrency(value?: number) {
  return typeof value === 'number' && !Number.isNaN(value) ? formatVnd(value) : '';
}

export default function ProductCard({ product }: { product: Product }) {
  const { toggleFavorite, addToCart, favorites } = useStore();

  const isFavorite = useMemo(() => {
    const key = product._id?.toString?.() || product.slug || product.name;
    return favorites.some((p) => (p._id?.toString?.() || p.slug || p.name) === key);
  }, [favorites, product]);

  const { bestPrice, hasSale, discountPercent } = useMemo(() => {
    const price = product.price;
    const salePrice = product.salePrice;
    const explicit = typeof product.discountPercent === 'number' ? product.discountPercent : null;
    const computed =
      typeof price === 'number' && typeof salePrice === 'number' && salePrice < price
        ? Math.round(100 - (salePrice / price) * 100)
        : null;
    const discount = explicit ?? computed;
    const hasSalePrice = typeof price === 'number' && typeof salePrice === 'number' && salePrice < price;
    const finalPrice = hasSalePrice ? salePrice : price;
    return {
      bestPrice: finalPrice,
      hasSale: hasSalePrice,
      discountPercent: discount !== null && discount > 0 ? discount : null,
    };
  }, [product]);

  const img = product.images?.[0];
  const slugClean = (product.slug || product._id || '').toString().replace(/"/g, '');
  const href = `/product/${slugClean}`;

  return (
    <div className="group overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100 transition hover:shadow-md">
      <Link href={href} className="block">
        <div className="relative aspect-[3/4] bg-gray-100">
          {img ? (
            <Image
              src={getOptimizedImageUrl(img, { width: 400 })}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              className="object-cover transition duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">Không có ảnh</div>
          )}
          {discountPercent !== null && (
            <div className="absolute left-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-white shadow">
              -{discountPercent}%
            </div>
          )}
        </div>
      </Link>

      <div className="px-3 py-3 space-y-3">
        <Link href={href} className="block">
          <div className="text-base font-semibold text-gray-900 leading-snug line-clamp-2 min-h-[44px]">{product.name}</div>
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col leading-tight">
            {hasSale && typeof product.price === 'number' && (
              <span className="text-sm text-gray-400 line-through">{formatCurrency(product.price)}</span>
            )}
            <span className="text-lg font-bold text-gray-900">{formatCurrency(bestPrice)}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-500">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                toggleFavorite(product);
              }}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition ${
                isFavorite ? 'text-[#0f5c5c] border-[#0f5c5c]/40' : 'text-gray-500'
              }`}
              aria-label="Yêu thích"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 8.25c0-2.485-2.046-4.5-4.571-4.5-1.63 0-3.058.936-3.8 2.292-.742-1.356-2.17-2.292-3.8-2.292C6.304 3.75 4.25 5.765 4.25 8.25c0 4.28 7.371 9.189 8.371 9.939.25.189.58.189.83 0 1-0.75 8.371-5.659 8.371-9.939Z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                addToCart(product);
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 hover:text-[#0f5c5c] transition"
              aria-label="Thêm vào giỏ hàng"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M3 5h2l1.2 9h11.6L19 8H7" />
                <circle cx="9" cy="19" r="1.25" />
                <circle cx="16" cy="19" r="1.25" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
