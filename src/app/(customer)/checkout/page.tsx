'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useStore } from '@/components/customer/StoreProvider';
import { useToast } from '@/components/ToastProvider';

// NOTE: Stripe is replaced by Banking (admin-confirmed transfer)
type PaymentMethod = 'cod' | 'stripe' | 'vnpay' | 'momo';

type CheckoutFormState = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  note: string;
  giftMessage: string;
  deliveryTime: string;
  paymentMethod: PaymentMethod;
};

const INITIAL_FORM: CheckoutFormState = {
  fullName: '',
  phone: '',
  email: '',
  address: '',
  note: '',
  giftMessage: '',
  deliveryTime: '',
  paymentMethod: 'cod',
};

export default function CheckoutPage() {
  const router = useRouter();
  const { status: authStatus } = useSession();
  const { cart, hydrated, clearCart } = useStore();
  const { addToast } = useToast();
  const gatedGuestRef = useRef(false);

  const [form, setForm] = useState<CheckoutFormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  // Banking flow: prevent auto-redirect to /cart while navigating to /checkout/banking
  const [skipEmptyCartRedirect, setSkipEmptyCartRedirect] = useState(false);
  
  // Payment methods visibility
  const [paymentMethodsEnabled, setPaymentMethodsEnabled] = useState({
    cod: true,
    banking: true,
    vnpay: true,
    momo: true,
  });

  // Load payment methods and user profile in parallel to reduce total load time
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch payment methods and user profile in parallel
        const [paymentRes, userRes] = await Promise.all([
          fetch('/api/payment-methods'), // Use default cache (respects Cache-Control header from API)
          fetch('/api/user/me', { cache: 'no-store' }), // User data should not be cached
        ]);

        // Process payment methods
        if (paymentRes.ok) {
          const paymentData = await paymentRes.json().catch(() => ({}));
          if (paymentData?.paymentMethods) {
            const enabled = paymentData.paymentMethods;
            // Only update state if payment methods actually changed
            setPaymentMethodsEnabled((prev) => {
              if (
                prev.cod === enabled.cod &&
                prev.banking === enabled.banking &&
                prev.vnpay === enabled.vnpay &&
                prev.momo === enabled.momo
              ) {
                return prev; // No change, return previous state to avoid re-render
              }
              return enabled;
            });
            // Auto-select first enabled payment method if current one is disabled
            const current = form.paymentMethod;
            if (
              (current === 'cod' && !enabled.cod) ||
              (current === 'stripe' && !enabled.banking) ||
              (current === 'vnpay' && !enabled.vnpay) ||
              (current === 'momo' && !enabled.momo)
            ) {
              if (enabled.cod) {
                setForm((prev) => (prev.paymentMethod === 'cod' ? prev : { ...prev, paymentMethod: 'cod' }));
              } else if (enabled.banking) {
                setForm((prev) => (prev.paymentMethod === 'stripe' ? prev : { ...prev, paymentMethod: 'stripe' }));
              } else if (enabled.vnpay) {
                setForm((prev) => (prev.paymentMethod === 'vnpay' ? prev : { ...prev, paymentMethod: 'vnpay' }));
              } else if (enabled.momo) {
                setForm((prev) => (prev.paymentMethod === 'momo' ? prev : { ...prev, paymentMethod: 'momo' }));
              }
            }
          }
        }

        // Process user profile (prefill form)
        if (userRes.ok) {
          const userData = await userRes.json().catch(() => null);
          const user = userData?.data || {};
          const addresses = Array.isArray(user.address) ? user.address : [];
          const defaultAddr = addresses.find((a: any) => a?.isDefault) || addresses[0] || null;

          const defaultAddrFormatted = defaultAddr
            ? [defaultAddr?.detail, defaultAddr?.ward, defaultAddr?.district, defaultAddr?.city].filter(Boolean).join(', ')
            : '';

          setForm((prev) => ({
            ...prev,
            fullName: prev.fullName || defaultAddr?.recipient || user.name || '',
            phone: prev.phone || defaultAddr?.phone || user.phone || '',
            email: prev.email || user.email || '',
            address: prev.address || defaultAddrFormatted || '',
          }));
        }
      } catch (err) {
        // Keep default values
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guest must login before accessing checkout
  useEffect(() => {
    if (authStatus !== 'unauthenticated') return;
    if (gatedGuestRef.current) return;
    gatedGuestRef.current = true;
    addToast('Bạn vui lòng đăng nhập trước khi đặt hàng', 'info');
    router.replace('/auth/signin?redirect=/checkout');
  }, [authStatus, addToast, router]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + ((item.product.salePrice ?? item.product.price ?? 0) * item.quantity), 0),
    [cart]
  );

  // Redirect if cart empty once hydrated
  useEffect(() => {
    if (!hydrated) return;
    if (skipEmptyCartRedirect) return;
    if (cart.length === 0) {
      router.replace('/cart');
    }
  }, [hydrated, cart, router, skipEmptyCartRedirect]);

  // User profile prefill is now handled in loadData() above (parallel with payment methods)

  const update = (field: keyof CheckoutFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (!form.fullName.trim()) return 'Vui lòng nhập họ và tên';
    if (!form.phone.trim()) return 'Vui lòng nhập số điện thoại';
    if (!form.email.trim()) return 'Vui lòng nhập email';
    if (!form.address.trim()) return 'Vui lòng nhập địa chỉ giao hàng';
    if (cart.length === 0) return 'Giỏ hàng trống';
    return '';
  };

  const handleSubmit = async () => {
    // Guest: force login
    if (authStatus !== 'authenticated') {
      addToast('Bạn vui lòng đăng nhập trước khi đặt hàng', 'info');
      router.push('/auth/signin?redirect=/checkout');
      return;
    }

    const err = validate();
    if (err) {
      addToast(err, 'error');
      return;
    }
    setSubmitting(true);
    try {
      // Prevent creating multiple pending payable orders
      try {
        const pendingRes = await fetch('/api/orders', { cache: 'no-store' });
        const pendingData = await pendingRes.json().catch(() => ({}));
        if (pendingRes.ok) {
          const orders = Array.isArray(pendingData?.data) ? pendingData.data : [];
          const hasBlockingPending = orders.some((o: any) => {
            const os = String(o?.orderStatus || '').toUpperCase();
            const ps = String(o?.paymentStatus || '').toUpperCase();
            const pm = String(o?.paymentMethod || '').toUpperCase();
            const isPayable = pm === 'MOMO' || pm === 'VNPAY' || pm === 'BANKING';
            return isPayable && os === 'PENDING' && ps === 'UNPAID';
          });
          if (hasBlockingPending) {
            addToast(
              'Bạn đang có đơn hàng chờ thanh toán. Vui lòng tiếp tục thanh toán hoặc huỷ đơn để tạo đơn hàng mới',
              'error'
            );
            return;
          }
        }
      } catch {
        // ignore: server will still enforce
      }

      // Create order in MongoDB (source of truth)
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: form.paymentMethod,
          items: cart,
          customer: {
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            address: form.address.trim(),
            note: form.note.trim(),
            giftMessage: form.giftMessage.trim(),
            deliveryTime: form.deliveryTime.trim(),
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || data?.error || 'Không tạo được đơn hàng');
      }

      const createdOrderId = data?.data?._id || data?.data?.id;

      if (form.paymentMethod === 'cod') {
        addToast('Đặt hàng thành công (COD). Bạn có thể theo dõi trạng thái trong mục Đơn hàng.', 'success');
      } else if (form.paymentMethod === 'stripe') {
        addToast('Đặt hàng thành công. Vui lòng chuyển khoản theo hướng dẫn.', 'success');
      } else if (form.paymentMethod === 'momo') {
        addToast('Đang chuyển tới MoMo để thanh toán...', 'success');
      } else if (form.paymentMethod === 'vnpay') {
        addToast('Đang chuyển tới VNPay để thanh toán...', 'success');
      } else {
        addToast('Đặt hàng thành công. Đơn đang chờ thanh toán (10 phút).', 'success');
      }
      if (form.paymentMethod === 'stripe') {
        // Clear cart after creating order
        setSkipEmptyCartRedirect(true);
        clearCart();
        router.push(`/checkout/banking?orderId=${encodeURIComponent(String(createdOrderId || ''))}`);
      } else if (form.paymentMethod === 'cod') {
        // COD: go straight to "My Orders" with success message
        setSkipEmptyCartRedirect(true);
        clearCart();
        router.push(
          `/orders?success=1&source=cod&orderId=${encodeURIComponent(String(createdOrderId || ''))}`
        );
      } else if (form.paymentMethod === 'momo') {
        // Create MoMo payment and redirect to payUrl
        const momoRes = await fetch('/api/payments/momo/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: String(createdOrderId || '') }),
        });
        const momoData = await momoRes.json().catch(() => ({}));
        const payUrl = momoData?.data?.payUrl;
        if (!momoRes.ok || !payUrl) {
          throw new Error(momoData?.message || 'Không tạo được thanh toán MoMo');
        }
        // Clear cart ONLY after payUrl is ready
        clearCart();
        window.location.href = String(payUrl);
      } else if (form.paymentMethod === 'vnpay') {
        // Create VNPay payment and redirect to paymentUrl
        const vnpRes = await fetch('/api/payments/vnpay/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: String(createdOrderId || '') }),
        });
        const vnpData = await vnpRes.json().catch(() => ({}));
        const paymentUrl = vnpData?.data?.paymentUrl;
        if (!vnpRes.ok || !paymentUrl) {
          throw new Error(vnpData?.message || 'Không tạo được thanh toán VNPay');
        }
        // Clear cart ONLY after paymentUrl is ready
        clearCart();
        window.location.href = String(paymentUrl);
      } else {
        // Clear cart after creating order
        clearCart();
        router.push('/checkout/success');
      }
    } catch (err: any) {
      addToast(err?.message || 'Thanh toán thất bại. Vui lòng thử lại.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const shippingFee = 0; // placeholder, sẽ cấu hình sau
  const grandTotal = cartTotal + shippingFee;

  return (
    <div className="container-section my-8 md:my-12 lg:my-14">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Thanh toán</h1>
      <div className="grid lg:grid-cols-[1.05fr,0.95fr] gap-8">
        {/* Cột trái - Thông tin khách hàng */}
        <div className="space-y-4 rounded-lg border border-gray-200 p-5 shadow-sm bg-white">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-800">Họ và tên *</label>
              <input
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-800">Số điện thoại *</label>
              <input
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Email *</label>
            <input
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Địa chỉ giao hàng *</label>
            <input
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Ghi chú đơn hàng</label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
              value={form.note}
              onChange={(e) => update('note', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Lời nhắn kèm hoa</label>
            <textarea
              rows={2}
              placeholder="VD: Chúc mừng sinh nhật"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
              value={form.giftMessage}
              onChange={(e) => update('giftMessage', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Ngày/giờ giao hoa</label>
            <input
              type="datetime-local"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5c5c]"
              value={form.deliveryTime}
              onChange={(e) => update('deliveryTime', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Phương thức thanh toán</label>
            <div className="space-y-3">
              {[
                { value: 'cod', label: 'Thanh toán khi nhận hàng (COD)', enabled: paymentMethodsEnabled.cod },
                { value: 'stripe', label: 'Chuyển khoản (Banking)', enabled: paymentMethodsEnabled.banking },
                { value: 'vnpay', label: 'VNPay', enabled: paymentMethodsEnabled.vnpay },
                { value: 'momo', label: 'MoMo', enabled: paymentMethodsEnabled.momo },
              ]
                .filter((opt) => opt.enabled)
                .map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      value={opt.value}
                      checked={form.paymentMethod === opt.value}
                      onChange={() => update('paymentMethod', opt.value as PaymentMethod)}
                      className="h-4 w-4 text-[#0f5c5c] focus:ring-[#0f5c5c]"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
            </div>
          </div>

          {authStatus === 'unauthenticated' && (
            <div className="text-sm text-gray-600">
              Chưa có tài khoản?{' '}
              <Link href="/auth/signin" className="text-[#0f5c5c] font-semibold hover:underline">
                Đăng nhập
              </Link>
              {' / '}
              <Link href="/auth/signup" className="text-[#0f5c5c] font-semibold hover:underline">
                tạo tài khoản
              </Link>{' '}
              để quản lý đơn hàng dễ hơn.
            </div>
          )}
        </div>

        {/* Cột phải - Tóm tắt đơn hàng */}
        <div className="space-y-4 rounded-lg border border-gray-200 p-5 shadow-sm bg-white">
          <h2 className="text-lg font-bold text-gray-900">Đơn hàng của bạn</h2>
          <div className="divide-y border border-gray-100 rounded-lg overflow-hidden">
            {cart.map((item) => (
              <div key={item.product._id || item.product.slug || item.product.name} className="flex items-center gap-3 p-3">
                <div className="h-16 w-16 rounded-md bg-gray-100 overflow-hidden">
                  {item.product.images?.[0] ? (
                    <img src={item.product.images[0]} alt={item.product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">Không có ảnh</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">{item.product.name}</div>
                  <div className="text-xs text-gray-500">Số lượng: {item.quantity}</div>
                  {item.note && <div className="text-xs text-gray-500">Ghi chú: {item.note}</div>}
                </div>
                <div className="text-right text-sm text-gray-900 font-semibold">
                  {((item.product.salePrice ?? item.product.price ?? 0) * item.quantity).toLocaleString('vi-VN')} VNĐ
                  {item.product.salePrice && item.product.salePrice < (item.product.price ?? 0) && (
                    <div className="text-[11px] text-gray-400 line-through">
                      {(item.product.price ?? 0).toLocaleString('vi-VN')} VNĐ
                    </div>
                  )}
                </div>
              </div>
            ))}
            {cart.length === 0 && <div className="p-4 text-center text-sm text-gray-500">Giỏ hàng trống.</div>}
          </div>

          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Tạm tính</span>
              <span className="font-semibold text-gray-900">{cartTotal.toLocaleString('vi-VN')} VNĐ</span>
            </div>
            <div className="flex justify-between">
              <span>Phí giao hàng</span>
              <span className="font-semibold text-gray-900">{shippingFee.toLocaleString('vi-VN')} VNĐ</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t">
              <span>Tổng thanh toán</span>
              <span>{grandTotal.toLocaleString('vi-VN')} VNĐ</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center rounded-md bg-[#0f5c5c] px-4 py-2 text-white font-semibold shadow hover:bg-[#0c4d4d] transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? 'Đang xử lý...' : 'Đặt hàng / Thanh toán'}
          </button>
        </div>
      </div>
    </div>
  );
}
