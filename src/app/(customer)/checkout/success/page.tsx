'use client';

import Link from 'next/link';

export default function CheckoutSuccessPage() {
  return (
    <div className="container-section my-12 md:my-16 space-y-6 text-center">
      <div className="text-3xl font-bold text-[#0f5c5c]">Đặt hàng thành công</div>
      <p className="text-gray-700">Cảm ơn bạn đã đặt hàng. Bạn có thể theo dõi trạng thái trong mục Đơn hàng.</p>
      <div className="flex items-center justify-center gap-4">
        <Link
          href="/"
          className="rounded-md bg-[#0f5c5c] px-5 py-2 text-white font-semibold shadow hover:bg-[#0c4d4d] transition"
        >
          Tiếp tục mua sắm
        </Link>
        <Link
          href="/orders"
          className="rounded-md border border-gray-300 px-5 py-2 text-gray-700 font-semibold hover:bg-gray-50 transition"
        >
          Xem đơn hàng
        </Link>
      </div>
    </div>
  );
}
