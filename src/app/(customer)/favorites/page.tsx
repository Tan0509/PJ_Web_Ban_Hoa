'use client';

import ProductCard from '@/components/customer/ProductCard';
import { useStore } from '@/components/customer/StoreProvider';

export default function FavoritesPage() {
  const { favorites, hydrated } = useStore();
  const empty = hydrated && favorites.length === 0;

  return (
    <div className="container-section my-10 md:my-12 lg:my-16 space-y-6 md:space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl md:3xl font-bold text-gray-900 uppercase">Sản phẩm yêu thích</h1>
        <p className="text-gray-600 text-sm md:text-base">Bạn chưa có sản phẩm nào trong danh sách.</p>
      </div>

      {empty && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-600">
          Danh sách yêu thích đang trống.
        </div>
      )}

      {hydrated && favorites.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {favorites.map((product) => (
            <ProductCard key={product._id || product.slug || product.name} product={product as any} />
          ))}
        </div>
      )}
    </div>
  );
}
