import Link from 'next/link';
import ProductCard from './ProductCard';

type Category = {
  _id?: string;
  name: string;
  slug?: string;
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

type Props = {
  items: {
    category: Category;
    products: Product[];
    hasMore: boolean;
  }[];
};

export default function CategoryProductsByCategory({ items }: Props) {
  if (!items?.length) return null;

  return (
    <section className="container-section pb-12 md:pb-16 space-y-10">
      {items.map((group) => (
        <div key={group.category.slug || group.category._id || group.category.name} className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="flex-1 h-px bg-gray-200" />
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 text-center whitespace-nowrap">
              {group.category.name}
            </h3>
            <span className="flex-1 h-px bg-gray-200" />
          </div>

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
        </div>
      ))}
    </section>
  );
}
