'use client';

import Link from 'next/link';
import { useStore } from '@/components/customer/StoreProvider';
import { CONTACT_PHONE, ZALO_ORDER_LINK } from '@/lib/contact';

export default function CartPage() {
  const { cart, hydrated, removeFromCart, updateCartQuantity } = useStore();
  const empty = hydrated && cart.length === 0;

  return (
    <div className="container-section my-10 md:my-12 lg:my-16 space-y-6 md:space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 uppercase">Giỏ hàng</h1>
        <p className="text-gray-600 text-sm md:text-base">Kiểm tra và xác nhận đơn hàng của bạn.</p>
      </div>

      {empty && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-600">
          Giỏ hàng đang trống.
        </div>
      )}

      {hydrated && cart.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white divide-y">
            {cart.map((item) => (
              <div key={item.product._id || item.product.slug || item.product.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-md bg-gray-100 overflow-hidden">
                    {item.product.images?.[0] ? (
                      <img src={item.product.images[0]} alt={item.product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">Không có ảnh</div>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{item.product.name}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.product, item.quantity - 1)}
                        className="h-8 w-8 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                        aria-label="Giảm số lượng"
                      >
                        -
                      </button>
                      <div className="min-w-8 text-center text-sm font-semibold text-gray-900">{item.quantity}</div>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.product, item.quantity + 1)}
                        className="h-8 w-8 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                        aria-label="Tăng số lượng"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product)}
                        className="ml-3 text-sm font-semibold text-rose-600 hover:underline"
                      >
                        Xoá
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-base font-semibold text-[#0f5c5c]">Xem chi tiết</div>
                  {item.note && <div className="text-xs text-gray-500 mt-1">Ghi chú: {item.note}</div>}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href={ZALO_ORDER_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md bg-[#0f5c5c] px-5 py-2 text-white font-semibold shadow hover:bg-[#0c4d4d] transition"
            >
              Liên hệ đặt hàng
            </Link>
            <a
              href={`tel:${CONTACT_PHONE}`}
              className="inline-flex items-center justify-center rounded-md border border-[#0f5c5c] px-5 py-2 text-[#0f5c5c] font-semibold hover:bg-[#0f5c5c]/5 transition"
            >
              Gọi ngay: {CONTACT_PHONE}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
