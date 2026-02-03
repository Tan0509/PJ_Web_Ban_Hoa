import { connectMongo } from '@/lib/mongoose';
import { serializeForClient } from '@/lib/serializeForClient';
import Product from '@/models/Product';
import ProductCard from '@/components/customer/ProductCard';

type SearchParams = { q?: string };

const PAGE_SIZE = 24;

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> | SearchParams }) {
  const params = await Promise.resolve(searchParams);
  const q = String(params.q || '').trim();

  if (!q) {
    return (
      <div className="bg-white">
        <section className="container-section pt-6 pb-12 md:pt-8 md:pb-14">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 md:p-7 space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#0f5c5c]/10 text-[#0f5c5c]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Tìm kiếm sản phẩm</h1>
                <p className="text-sm md:text-base text-gray-600 mt-1">
                  Vui lòng nhập từ khoá ở thanh tìm kiếm phía trên để bắt đầu.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
              Gợi ý: nhập tên sản phẩm (ví dụ: <span className="font-semibold text-gray-900">bó hoa</span>,{' '}
              <span className="font-semibold text-gray-900">hồng</span>, <span className="font-semibold text-gray-900">lan hồ điệp</span>…)
            </div>
          </div>
        </section>
      </div>
    );
  }

  await connectMongo();
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  // Customer-side: chỉ hiển thị sản phẩm active
  const filters: any = {
    active: true,
    $or: [{ name: regex }, { slug: regex }, { metaDescription: regex }],
  };

  const [items, total] = await Promise.all([
    Product.find(filters).sort({ createdAt: -1 }).limit(PAGE_SIZE).lean(),
    Product.countDocuments(filters),
  ]);

  const plainItems = serializeForClient(items as any[]);

  return (
    <div className="bg-white">
      <section className="container-section pt-6 pb-12 md:pt-8 md:pb-14 space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Kết quả tìm kiếm</h1>
              <div className="text-sm text-gray-600">
                Tìm thấy <span className="font-semibold text-gray-900">{total}</span> sản phẩm phù hợp
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">Từ khoá</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#0f5c5c]/20 bg-[#0f5c5c]/5 px-3 py-1 text-sm font-semibold text-[#0f5c5c]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {q}
              </span>
            </div>
          </div>
        </div>

        {plainItems.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-7">
            {plainItems.map((product: any) => (
              <ProductCard key={product._id?.toString?.() || product.slug || product.name} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 md:p-10 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-200/70 text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="mt-3 text-lg font-semibold text-gray-900">Không tìm thấy sản phẩm phù hợp</div>
            <div className="mt-1 text-sm text-gray-600">
              Hãy thử từ khoá khác hoặc kiểm tra chính tả. Ví dụ: <span className="font-semibold text-gray-900">hồng</span>,{' '}
              <span className="font-semibold text-gray-900">bó hoa</span>, <span className="font-semibold text-gray-900">giỏ hoa</span>.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

