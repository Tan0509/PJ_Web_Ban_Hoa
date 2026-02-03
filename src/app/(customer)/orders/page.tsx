'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

type OrderLite = {
  _id: string;
  orderCode?: string;
  totalAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
  createdAt?: string;
  expiresAt?: string;
  paymentMeta?: any;
};

type OrderDetail = {
  _id: string;
  orderCode?: string;
  items?: { name: string; price: number; quantity: number; image?: string }[];
  totalAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  paidAt?: string;
  orderStatus?: string;
  shippingAddress?: string;
  createdAt?: string;
  history?: { from?: string; to: string; note?: string; createdAt?: string }[];
  expiresAt?: string;
};

function formatMoney(v?: number) {
  return (v || 0).toLocaleString('vi-VN') + ' VNĐ';
}

function formatCountdown(expiresAt?: string, now = Date.now()) {
  if (!expiresAt) return '';
  const exp = new Date(expiresAt).getTime();
  if (Number.isNaN(exp)) return '';
  const left = Math.max(0, exp - now);
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã huỷ',
};

function orderStatusLabel(code?: string) {
  if (!code) return '—';
  return ORDER_STATUS_LABELS[code] || code;
}

function paymentStatusLabel(code?: string) {
  const v = String(code || '').toUpperCase();
  if (v === 'PAID') return 'Đã thanh toán';
  if (v === 'EXPIRED') return 'Hết hạn';
  return 'Chưa thanh toán';
}

export default function OrdersPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const consumedToastRef = useRef(false);
  const loadRef = useRef<null | (() => Promise<void>)>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [mounted, setMounted] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const [showDetail, setShowDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || 'Không tải được đơn hàng');
      setOrders(Array.isArray(data?.data) ? data.data : []);
    } catch (err: any) {
      addToast(err?.message || 'Không tải được đơn hàng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => setMounted(true), []);

  // Show success/fail toast when redirected from checkout/payment flows, then clean URL
  useEffect(() => {
    if (consumedToastRef.current || !searchParams) return;
    const success = searchParams.get('success');
    const fail = searchParams.get('fail');
    if (success !== '1' && fail !== '1') return;

    consumedToastRef.current = true;
    const source = (searchParams.get('source') || '').toLowerCase();
    const reason = (searchParams.get('reason') || '').toLowerCase(); // cancelled | failed
    const orderId = searchParams.get('orderId') || '';

    const showAndClean = (msg: string, type: 'success' | 'error' | 'info') => {
      addToast(msg, type);
      const next = new URLSearchParams(searchParams.toString());
      next.delete('success');
      next.delete('fail');
      next.delete('source');
      next.delete('reason');
      next.delete('orderId');
      const qs = next.toString();
      router.replace(qs ? `/orders?${qs}` : '/orders');
    };

    // If possible, derive toast from real order state to avoid mismatch
    const run = async () => {
      // COD: always "order created" toast
      if (success === '1' && source === 'cod') {
        showAndClean('Tạo đơn thành công (COD). Bạn có thể bấm vào mã đơn tại mục đơn hàng của tôi để xem chi tiết.', 'success');
        return;
      }

      // Try fetch order status to decide message
      if (orderId) {
        try {
          const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: 'no-store' });
          const data = await res.json().catch(() => ({}));
          const o = data?.data || null;
          if (res.ok && o) {
            const ps = String(o.paymentStatus || '').toUpperCase();
            const os = String(o.orderStatus || '').toUpperCase();

            if (ps === 'PAID') {
              // User requested copy
              showAndClean('Thanh toán thành công. Bạn có thể bấm vào mã đơn tại mục đơn hàng của tôi để xem chi tiết.', 'success');
              return;
            }
            if (ps === 'EXPIRED') {
              showAndClean('Đơn hàng đã hết hạn thanh toán. Vui lòng tạo đơn mới nếu muốn mua tiếp.', 'error');
              return;
            }
            if (os === 'CANCELLED') {
              const pm = String(o.paymentMethod || '').trim() || (source === 'momo' ? 'MoMo' : source === 'vnpay' ? 'VNPay' : '');
              showAndClean(`Bạn đã huỷ thanh toán ${pm}. Đơn hàng đã được chuyển sang “Đã huỷ”.`, 'error');
              return;
            }
            if (os === 'PENDING' && ps === 'UNPAID') {
              // User requested copy
              showAndClean('Giao dịch chưa hoàn tất. Bạn có thể bấm “Tiếp tục thanh toán” ở mục đơn hàng của tôi.', 'info');
              return;
            }
          }
        } catch {
          // fall back below
        }
      }

      // Fallback (no order state available)
      if (success === '1') {
        if (source === 'banking') {
          showAndClean('Thanh toán chuyển khoản đã được xác nhận. Bạn có thể bấm vào mã đơn tại mục đơn hàng của tôi để xem chi tiết.', 'success');
          return;
        }
        if (source === 'momo' || source === 'vnpay') {
          showAndClean('Thanh toán thành công. Bạn có thể bấm vào mã đơn tại mục đơn hàng của tôi để xem chi tiết.', 'success');
          return;
        }
        showAndClean('Thành công. Bạn có thể bấm vào mã đơn tại mục đơn hàng của tôi để xem chi tiết.', 'success');
        return;
      }

      const cancelled = reason === 'cancelled';
      if (source === 'momo') {
        showAndClean(
          cancelled
            ? 'Bạn đã huỷ thanh toán MoMo. Đơn hàng đã được chuyển sang “Đã huỷ”.'
            : 'Giao dịch chưa hoàn tất. Bạn có thể bấm “Tiếp tục thanh toán” ở mục đơn hàng của tôi.',
          cancelled ? 'error' : 'info'
        );
        return;
      }
      if (source === 'vnpay') {
        showAndClean(
          cancelled
            ? 'Bạn đã huỷ thanh toán VNPay. Đơn hàng đã được chuyển sang “Đã huỷ”.'
            : 'Giao dịch chưa hoàn tất. Bạn có thể bấm “Tiếp tục thanh toán” ở mục đơn hàng của tôi.',
          cancelled ? 'error' : 'info'
        );
        return;
      }

      showAndClean('Giao dịch chưa hoàn tất. Bạn có thể bấm “Tiếp tục thanh toán” ở mục đơn hàng của tôi.', 'info');
    };

    run();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-refresh orders when the next pending order expires,
  // so "Chờ thanh toán" transitions to "Hết hạn" without needing a manual reload.
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    const now = Date.now();
    const expMsList = orders
      .filter((o) => String(o.orderStatus || '').toUpperCase() === 'PENDING' && String(o.paymentStatus || '').toUpperCase() === 'UNPAID')
      .map((o) => (o.expiresAt ? new Date(o.expiresAt).getTime() : NaN))
      .filter((ms) => !Number.isNaN(ms) && ms > now) as number[];

    if (!expMsList.length) return;

    const nextExp = Math.min(...expMsList);
    const waitMs = Math.max(1000, nextExp - now + 1100);
    refreshTimerRef.current = setTimeout(() => {
      loadRef.current?.();
    }, waitMs);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [orders]);

  const grouped = useMemo(() => {
    const pending = orders.filter((o) => o.orderStatus === 'PENDING' && (o.paymentStatus || '').toUpperCase() === 'UNPAID');
    const paid = orders.filter((o) => (o.paymentStatus || '').toUpperCase() === 'PAID');
    const expired = orders.filter((o) => (o.paymentStatus || '').toUpperCase() === 'EXPIRED');
    const cancelled = orders.filter(
      (o) => (o.orderStatus || '').toUpperCase() === 'CANCELLED' && (o.paymentStatus || '').toUpperCase() !== 'EXPIRED'
    );
    return { pending, paid, cancelled, expired };
  }, [orders]);

  const renderStatus = (o: OrderLite) => {
    const ps = String(o.paymentStatus || '').toUpperCase();
    const os = String(o.orderStatus || '').toUpperCase();
    if (ps === 'EXPIRED') return 'Hết hạn';
    if (os === 'CANCELLED') return 'Đã huỷ';
    if (ps === 'PAID') return 'Đã thanh toán';
    return 'Chờ thanh toán';
  };

  const canContinuePayment = (o: OrderLite) => {
    const ps = String(o.paymentStatus || '').toUpperCase();
    const os = String(o.orderStatus || '').toUpperCase();
    if (ps !== 'UNPAID') return false;
    if (os !== 'PENDING') return false;
    if (!o.expiresAt) return false;
    const exp = new Date(o.expiresAt).getTime();
    if (Number.isNaN(exp) || exp <= Date.now()) return false;
    const pm = String(o.paymentMethod || '').toLowerCase();
    if (pm === 'banking' || pm === 'stripe') return true;
    if (pm === 'momo') return !!o.paymentMeta?.momo?.payUrl;
    if (pm === 'vnpay') return !!o.paymentMeta?.vnpay?.paymentUrl;
    return false;
  };

  const handleContinuePayment = async (o: OrderLite) => {
    try {
      if (payingId) return;
      setPayingId(o._id);
      const pm = String(o.paymentMethod || '').toLowerCase();
      if (pm === 'banking' || pm === 'stripe') {
        router.push(`/checkout/banking?orderId=${encodeURIComponent(String(o._id || ''))}`);
        return;
      }
      if (pm === 'momo') {
        const payUrl = o.paymentMeta?.momo?.payUrl;
        if (!payUrl) throw new Error('Không tìm thấy link thanh toán MoMo đang dang dở.');
        window.location.href = String(payUrl);
        return;
      }
      if (pm === 'vnpay') {
        const paymentUrl = o.paymentMeta?.vnpay?.paymentUrl;
        if (!paymentUrl) throw new Error('Không tìm thấy link thanh toán VNPay đang dang dở.');
        window.location.href = String(paymentUrl);
        return;
      }
    } catch (err: any) {
      addToast(err?.message || 'Không thể tiếp tục thanh toán', 'error');
    } finally {
      setPayingId(null);
    }
  };

  const openDetail = async (id: string) => {
    setShowDetail(true);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || 'Không tải được chi tiết đơn hàng');
      setDetail(data?.data || null);
    } catch (err: any) {
      setDetailError(err?.message || 'Không tải được chi tiết đơn hàng');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setShowDetail(false);
    setDetail(null);
    setDetailError(null);
  };

  return (
    <div className="container-section my-10 md:my-12 lg:my-16 space-y-6 md:space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 uppercase">Đơn hàng của tôi</h1>
        <p className="text-gray-600 text-sm md:text-base">Kiểm tra và theo dõi các đơn hàng của bạn.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-3 text-sm">
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 space-y-1">
          <div className="font-semibold text-gray-900">Chờ thanh toán</div>
          <div className="text-gray-600">{grouped.pending.length} đơn</div>
        </div>
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 space-y-1">
          <div className="font-semibold text-gray-900">Đã thanh toán</div>
          <div className="text-gray-600">{grouped.paid.length} đơn</div>
        </div>
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 space-y-1">
          <div className="font-semibold text-gray-900">Đã huỷ</div>
          <div className="text-gray-600">{grouped.cancelled.length} đơn</div>
        </div>
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 space-y-1">
          <div className="font-semibold text-gray-900">Hết hạn</div>
          <div className="text-gray-600">{grouped.expired.length} đơn</div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-600">
          Đang tải...
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-600">
          Bạn chưa có đơn hàng nào.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white divide-y">
          {orders.map((o) => {
            const os = String(o.orderStatus || '').toUpperCase();
            const ps = String(o.paymentStatus || '').toUpperCase();
            const countdown = os === 'PENDING' && ps === 'UNPAID' ? formatCountdown(o.expiresAt, nowTick) : '';
            return (
              <div key={o._id} className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => openDetail(o._id)}
                    className="font-semibold text-gray-900 hover:underline"
                    title="Xem chi tiết đơn hàng"
                  >
                    {o.orderCode || `#${o._id.slice(-6)}`}
                  </button>
                  <div className="text-xs text-gray-500">
                    {o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : ''}
                    {countdown ? ` • Còn lại: ${countdown}` : ''}
                  </div>
                  <div className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-2">
                    <span>{renderStatus(o)}</span>
                    {canContinuePayment(o) ? (
                      <button
                        type="button"
                        onClick={() => handleContinuePayment(o)}
                        disabled={payingId === o._id}
                        className="text-[#0f5c5c] font-semibold hover:underline disabled:opacity-60"
                      >
                        {payingId === o._id ? 'Đang mở...' : 'Tiếp tục thanh toán'}
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatMoney(o.totalAmount)}</div>
                  <div className="text-xs text-gray-500">{o.paymentMethod || ''}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-sm">
        <Link className="text-[#0f5c5c] font-semibold hover:underline" href="/profile">
          Quay lại trang cá nhân
        </Link>
      </div>

      {showDetail && mounted
        ? createPortal(
            <div className="fixed top-0 left-0 w-[100vw] h-[100vh] bg-[rgba(0,0,0,0.45)] backdrop-blur-sm flex items-center justify-center z-[999]">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto z-[1000]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">Chi tiết đơn hàng</div>
                    <div className="text-sm text-gray-500">{detail?.orderCode || detail?._id || '—'}</div>
                  </div>
                  <button onClick={closeDetail} className="text-gray-500 hover:text-gray-700 text-sm">
                    Đóng
                  </button>
                </div>

                {detailLoading ? (
                  <div className="p-6 text-center text-gray-500">Đang tải...</div>
                ) : detailError ? (
                  <div className="p-6 text-center text-red-600">{detailError}</div>
                ) : !detail ? (
                  <div className="p-6 text-center text-gray-500">Không tìm thấy đơn hàng.</div>
                ) : (
                  <div className="p-6 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="font-semibold mb-2">Trạng thái</div>
                        <div className="text-sm text-gray-700">
                          Đơn hàng: <span className="font-semibold">{orderStatusLabel(detail.orderStatus)}</span>
                        </div>
                        <div className="text-sm text-gray-700">
                          Thanh toán: <span className="font-semibold">{paymentStatusLabel(detail.paymentStatus)}</span>
                        </div>
                        <div className="text-sm text-gray-700">
                          Phương thức: <span className="font-semibold">{detail.paymentMethod || '—'}</span>
                        </div>
                        {detail.createdAt ? (
                          <div className="text-xs text-gray-500 mt-2">
                            Tạo lúc: {new Date(detail.createdAt).toLocaleString('vi-VN')}
                          </div>
                        ) : null}
                        {detail.paidAt ? (
                          <div className="text-xs text-gray-500 mt-1">
                            Thanh toán lúc: {new Date(detail.paidAt).toLocaleString('vi-VN')}
                          </div>
                        ) : null}
                        {detail.paymentStatus === 'UNPAID' && detail.expiresAt ? (
                          <div className="text-xs text-gray-500 mt-1">
                            Còn lại: {formatCountdown(detail.expiresAt, nowTick)}
                          </div>
                        ) : null}
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="font-semibold mb-2">Địa chỉ giao hàng</div>
                        <div className="text-sm text-gray-700">{detail.shippingAddress || '—'}</div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="font-semibold mb-2">Sản phẩm</div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                          <thead>
                            <tr className="border-b border-gray-200 text-gray-600">
                              <th className="py-2 px-2">Sản phẩm</th>
                              <th className="py-2 px-2">Giá</th>
                              <th className="py-2 px-2">SL</th>
                              <th className="py-2 px-2">Tạm tính</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(detail.items || []).map((it, idx) => (
                              <tr key={idx} className="border-b border-gray-100">
                                <td className="py-2 px-2 text-gray-800">
                                  <div className="flex items-center gap-3">
                                    {it.image ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={it.image} alt="" className="h-10 w-10 rounded-md border border-gray-200 object-cover" />
                                    ) : (
                                      <div className="h-10 w-10 rounded-md border border-gray-200 bg-gray-50" />
                                    )}
                                    <div className="min-w-0">
                                      <div className="font-medium truncate">{it.name}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-gray-700">{formatMoney(it.price || 0)}</td>
                                <td className="py-2 px-2 text-gray-700">{it.quantity}</td>
                                <td className="py-2 px-2 text-gray-900 font-semibold">{formatMoney((it.price || 0) * (it.quantity || 0))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="pt-3 text-right text-sm font-semibold text-gray-900">
                        Tổng tiền: {formatMoney(detail.totalAmount || 0)}
                      </div>
                    </div>

                    {detail.history && detail.history.length ? (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="font-semibold mb-2">Lịch sử trạng thái</div>
                        <div className="space-y-2">
                          {detail.history
                            .slice()
                            .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
                            .map((h, idx) => (
                              <div key={idx} className="text-sm text-gray-700">
                                <span className="text-xs text-gray-500">
                                  {h.createdAt ? new Date(h.createdAt).toLocaleString('vi-VN') : '—'}
                                </span>{' '}
                                • <span className="font-semibold">{orderStatusLabel(h.to)}</span>
                                {h.note ? <span className="text-gray-500"> — {h.note}</span> : null}
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
