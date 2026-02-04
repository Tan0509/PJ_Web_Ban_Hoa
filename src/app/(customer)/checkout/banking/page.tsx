'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

type OrderLite = {
  _id: string;
  orderCode?: string;
  totalAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
  shippingAddress?: string;
  expiresAt?: string;
};

type BankingConfig = {
  bankId?: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  qrImageDataUrl: string;
  note?: string;
} | null;

function copyText(text: string) {
  return navigator.clipboard.writeText(text);
}

export default function BankingCheckoutPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();

  const orderId = params?.get('orderId') || '';
  const [order, setOrder] = useState<OrderLite | null>(null);
  const [banking, setBanking] = useState<BankingConfig>(null);
  const [loading, setLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [nowTick, setNowTick] = useState(0);
  const didAutoRefreshExpiredRef = useRef(false);

  const load = async (opts?: { silent?: boolean }): Promise<OrderLite | null> => {
    if (!orderId) return null;
    setLoading(true);
    let loadedOrder: OrderLite | null = null;
    try {
      // Fetch banking config even if order fetch fails
      const bankRes = await fetch('/api/banking/default', { cache: 'no-store' });
      const bankData = await bankRes.json().catch(() => ({}));
      if (bankRes.ok) setBanking(bankData?.data || null);

      // Fetch order (with timeout to avoid hanging "Đang tải..." forever)
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      try {
        const orderRes = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
          cache: 'no-store',
          signal: ctrl.signal,
        });
        const orderData = await orderRes.json().catch(() => ({}));
        if (!orderRes.ok) throw new Error(orderData?.message || orderData?.error || 'Không tải được đơn hàng');
        loadedOrder = orderData?.data || null;
        setOrder(loadedOrder);
      } finally {
        clearTimeout(t);
      }
    } catch (err: any) {
      if (!opts?.silent) {
        addToast(err?.message || 'Không tải được đơn hàng', 'error');
      }
      setOrder(null);
      loadedOrder = null;
    } finally {
      setLoading(false);
    }
    return loadedOrder;
  };

  useEffect(() => {
    load();
  }, [orderId, addToast]);

  const transferContent = order?.orderCode || order?._id || '';
  const amount = order?.totalAmount || 0;
  const expiresAt = order?.expiresAt;
  const expMs = expiresAt ? new Date(expiresAt).getTime() : NaN;
  const os = String(order?.orderStatus || '').toUpperCase();
  const ps = String(order?.paymentStatus || '').toUpperCase();
  const isPendingPayable = os === 'PENDING' && ps === 'UNPAID' && !Number.isNaN(expMs);
  const leftMs = isPendingPayable ? Math.max(0, expMs - nowTick) : 0;
  const mm = Math.floor(leftMs / 60000);
  const ss = Math.floor((leftMs % 60000) / 1000);
  const countdownLabel =
    isPendingPayable ? (nowTick === 0 ? '00:00' : `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`) : '';

  const bankName = banking?.bankName || '';
  const accountNo = banking?.accountNo || '';
  const accountName = banking?.accountName || '';
  const qrImage = banking?.qrImageDataUrl || '';
  const note = banking?.note || '';

  const copy = async (label: string, value: string) => {
    if (!value) return;
    try {
      await copyText(value);
      addToast(`Đã copy ${label}`, 'success');
    } catch {
      addToast('Không thể copy. Vui lòng copy thủ công.', 'error');
    }
  };

  useEffect(() => {
    setNowTick(Date.now());
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto refresh once when countdown reaches 0, so UI shows "Hết hạn" correctly.
  useEffect(() => {
    if (!orderId || !isPendingPayable) return;
    if (leftMs > 0) return;
    if (didAutoRefreshExpiredRef.current) return;
    didAutoRefreshExpiredRef.current = true;
    load({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, isPendingPayable, leftMs]);

  const handleGoBackToOrders = () => {
    router.push('/orders');
  };

  const handleCancelPayment = async () => {
    if (!orderId) return;
    if (canceling) return;
    setCanceling(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || 'Không thể huỷ thanh toán');
      router.push(`/orders?fail=1&source=banking&reason=cancelled&orderId=${encodeURIComponent(String(orderId || ''))}`);
    } catch (err: any) {
      addToast(err?.message || 'Không thể huỷ thanh toán', 'error');
    } finally {
      setCanceling(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    // Re-check latest order status from server
    const latest = await load({ silent: true });
    const status = String(latest?.paymentStatus || '').toUpperCase();
    if (status === 'PAID') {
      addToast('Đơn hàng đã được xác nhận thanh toán.', 'success');
      router.push(`/orders?success=1&source=banking&orderId=${encodeURIComponent(String(orderId || ''))}`);
      return;
    }
    if (status === 'EXPIRED') {
      router.push(`/orders?fail=1&source=banking&reason=expired&orderId=${encodeURIComponent(String(orderId || ''))}`);
      return;
    }
    const latestOs = String(latest?.orderStatus || '').toUpperCase();
    if (latestOs === 'CANCELLED') {
      router.push(`/orders?fail=1&source=banking&reason=cancelled&orderId=${encodeURIComponent(String(orderId || ''))}`);
      return;
    }
    addToast('Đơn hàng chưa được xác nhận thanh toán. Vui lòng thử lại sau.', 'info');
  };

  return (
    <div className="container-section my-10 md:my-12 lg:my-16 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Thanh toán chuyển khoản</h1>
        <p className="text-gray-600 text-sm md:text-base">
          Vui lòng chuyển khoản đúng <span className="font-semibold">nội dung chuyển khoản</span> để hệ thống đối soát nhanh.
        </p>
      </div>

      {!orderId ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-600">
          Thiếu mã đơn hàng.
        </div>
      ) : loading ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-600">
          Đang tải...
        </div>
      ) : !order ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-600">
          Không tìm thấy đơn hàng.
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr,1fr] gap-6">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <div className="font-semibold text-gray-900">Quét mã QR để chuyển khoản</div>
            {qrImage ? (
              <img src={qrImage} alt="QR" className="w-full max-w-sm mx-auto rounded-md border border-gray-200 bg-white" />
            ) : (
              <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-600 text-sm">
                Chưa có cấu hình Banking mặc định (Admin → Cài đặt → Banking).
              </div>
            )}
            <div className="text-xs text-gray-500 text-center">
              Sau khi chuyển khoản, admin sẽ xác nhận và cập nhật trạng thái đơn hàng.
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3 text-sm text-gray-600">
              <div className="min-w-0">
                Mã đơn: <span className="font-semibold text-gray-900">{transferContent}</span>
              </div>
              {isPendingPayable ? (
                <div className="shrink-0 inline-flex items-center gap-2 rounded-md border border-pink-200 bg-pink-50 px-3 py-1 text-pink-700">
                  <span className="text-xs font-semibold">Hết hạn sau</span>
                  <span className="font-bold tabular-nums">{countdownLabel}</span>
                </div>
              ) : ps === 'EXPIRED' ? (
                <div className="shrink-0 inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700">
                  Hết hạn
                </div>
              ) : os === 'CANCELLED' ? (
                <div className="shrink-0 inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700">
                  Đã huỷ
                </div>
              ) : null}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">Ngân hàng</div>
                  <div className="font-semibold text-gray-900 truncate">{bankName || '—'}</div>
                </div>
                <button onClick={() => copy('ngân hàng', bankName)} className="text-sm font-semibold text-[#0f5c5c] hover:underline">
                  Copy
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">Số tài khoản</div>
                  <div className="font-semibold text-gray-900 truncate">{accountNo || '—'}</div>
                </div>
                <button onClick={() => copy('số tài khoản', accountNo)} className="text-sm font-semibold text-[#0f5c5c] hover:underline">
                  Copy
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">Chủ tài khoản</div>
                  <div className="font-semibold text-gray-900 truncate">{accountName || '—'}</div>
                </div>
                <button onClick={() => copy('chủ tài khoản', accountName)} className="text-sm font-semibold text-[#0f5c5c] hover:underline">
                  Copy
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">Số tiền</div>
                  <div className="font-semibold text-gray-900 truncate">{(amount || 0).toLocaleString('vi-VN')} VNĐ</div>
                </div>
                <button
                  onClick={() => copy('số tiền', String(Math.max(0, Math.round(Number(amount || 0)))))}
                  className="text-sm font-semibold text-[#0f5c5c] hover:underline"
                >
                  Copy
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">Nội dung chuyển khoản</div>
                  <div className="font-semibold text-gray-900 truncate">{transferContent}</div>
                </div>
                <button onClick={() => copy('nội dung', transferContent)} className="text-sm font-semibold text-[#0f5c5c] hover:underline">
                  Copy
                </button>
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <div className="font-semibold mb-1">Lưu ý</div>
                <div>
                  Vui lòng nhập <span className="font-semibold">đúng nội dung chuyển khoản</span> là{' '}
                  <span className="font-semibold">{transferContent}</span> để admin xác nhận nhanh.
                </div>
                {note ? <div className="mt-1">{note}</div> : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGoBackToOrders}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Quay về
                </button>
                <button
                  type="button"
                  onClick={handleCancelPayment}
                  disabled={canceling || !isPendingPayable}
                  className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {canceling ? 'Đang huỷ...' : 'Huỷ thanh toán'}
                </button>
              </div>
              <button
                type="button"
                onClick={handleCheckPaymentStatus}
                disabled={!orderId}
                className="rounded-md bg-[#0f5c5c] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#0c4d4d] transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                Kiểm tra trạng thái chuyển khoản
              </button>
            </div>
            <div className="text-sm font-semibold text-gray-900 text-right">
              Tổng tiền: {(amount || 0).toLocaleString('vi-VN')} VNĐ
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

