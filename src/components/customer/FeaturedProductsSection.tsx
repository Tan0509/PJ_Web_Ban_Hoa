import Link from 'next/link';
import ProductCard from './ProductCard';

type Product = {
  _id?: string;
  name: string;
  price?: number;
  salePrice?: number;
  discountPercent?: number;
  images?: string[];
  slug?: string;
};

export default function FeaturedProductsSection({ products, hasMore }: { products: Product[]; hasMore: boolean }) {
  if (!products?.length) return null;

  return (
    <section className="container-section pb-12 md:pb-16">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8 uppercase">SẢN PHẨM NỔI BẬT</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-7">
        {products.slice(0, 8).map((product) => (
          <ProductCard key={product._id || product.slug || product.name} product={product} />
        ))}
      </div>

      {hasMore && (
        <div className="text-center mt-8">
          <Link
            href="/category/bo-hoa"
            className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-[#0f5c5c] text-white font-semibold shadow hover:bg-[#0c4d4d] transition"
          >
            Xem thêm
          </Link>
        </div>
      )}
    </section>
  );
}
