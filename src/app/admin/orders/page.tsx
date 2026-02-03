'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

type OrderItemRow = {
  _id: string;
  orderCode?: string;
  customerName?: string;
  customerEmail?: string;
  totalAmount: number;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
  createdAt: string;
};

type OrderDetail = {
  order: any;
  customer: { name?: string; email?: string; phone?: string } | null;
  history?: {
    from?: string;
    to: string;
    by?: { id?: string; role?: string; name?: string };
    note?: string;
    createdAt?: string;
  }[];
  allowedNext?: string[];
};

type FetchResponse = {
  items: OrderItemRow[];
  total: number;
  page: number;
  limit: number;
};

const pageSize = 10;
const ORDER_STATUS = ['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED'] as const;
const PAYMENT_METHODS = ['COD', 'Banking', 'VNPay', 'MoMo'];

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

function paymentStatusLabel(s?: string) {
  const v = (s || '').toUpperCase();
  if (v === 'PAID') return 'Đã thanh toán';
  if (v === 'EXPIRED') return 'Hết hạn';
  return 'Chưa thanh toán';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN');
}

function AdminOrdersContent() {
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoOpenedRef = useRef<string | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('all');
  const [paymentMethod, setPaymentMethod] = useState<string>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [minTotal, setMinTotal] = useState('');
  const [maxTotal, setMaxTotal] = useState('');
  const [sort, setSort] = useState('createdAt_desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [productView, setProductView] = useState<{ item: any; orderDetail: OrderDetail } | null>(null);
  const [productViewProduct, setProductViewProduct] = useState<any | null>(null);
  const [productViewLoading, setProductViewLoading] = useState(false);
  const [imageLightbox, setImageLightbox] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: 'payment' | 'status'; orderId: string; next: string } | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  useEffect(() => setMounted(true), []);

  // Deep-link: /admin/orders?open=<orderId> will auto-open order detail modal
  useEffect(() => {
    if (!searchParams) return;
    const openId = searchParams.get('open');
    if (!openId) return;
    if (autoOpenedRef.current === openId) return;
    autoOpenedRef.current = openId;
    fetchDetail(openId);

    // Clean URL (remove open param) to avoid reopening on state changes
    const next = new URLSearchParams(searchParams.toString());
    next.delete('open');
    const qs = next.toString();
    router.replace(qs ? `/admin/orders?${qs}` : '/admin/orders');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (status !== 'all') params.set('status', status);
      if (paymentMethod !== 'all') params.set('paymentMethod', paymentMethod);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (search) params.set('search', search);
      if (minTotal) params.set('minTotal', minTotal.replace(/\D+/g, ''));
      if (maxTotal) params.set('maxTotal', maxTotal.replace(/\D+/g, ''));
      if (sort) params.set('sort', sort);
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Fetch error');
      }
      const data: FetchResponse = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Lỗi tải đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, paymentMethod, from, to, search, minTotal, maxTotal, sort]);

  const fetchDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      setDetailError(null);
      const res = await fetch(`/api/admin/orders/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Lỗi tải chi tiết đơn hàng');
      }
      const data = await res.json();
      setDetail(data);
      setShowModal(true);
    } catch (err: any) {
      setDetailError(err?.message || 'Lỗi tải chi tiết đơn hàng');
      setShowModal(true);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdatePaymentStatus = async (id: string, next: 'PAID' | 'UNPAID') => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Lỗi cập nhật thanh toán');
      }
      addToast(next === 'PAID' ? 'Đã cập nhật trạng thái thanh toán: Đã thanh toán' : 'Đã cập nhật trạng thái thanh toán: Chưa thanh toán', 'success');
      setConfirmModal(null);
      fetchOrders();
      fetchDetail(id);
    } catch (err: any) {
      addToast(err?.message || 'Lỗi cập nhật thanh toán', 'error');
    }
  };

  const handleUpdateStatus = async (id: string, next: string) => {
    if (next === 'CANCELLED' && !statusNote.trim()) {
      addToast('Vui lòng nhập ghi chú khi huỷ đơn', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextStatus: next, note: statusNote }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Lỗi cập nhật trạng thái');
      }
      addToast(`Đã cập nhật trạng thái đơn hàng: ${orderStatusLabel(next)}`, 'success');
      setConfirmModal(null);
      fetchOrders();
      if (detail && detail.order?._id === id) {
        fetchDetail(id);
      }
      setStatusNote('');
    } catch (err: any) {
      addToast(err?.message || 'Lỗi cập nhật trạng thái', 'error');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setDetail(null);
    setDetailError(null);
  };

  const openProductView = (item: any) => {
    if (!detail) return;
    setProductView({ item, orderDetail: detail });
    setProductViewProduct(null);
    if (item.productId) {
      setProductViewLoading(true);
      fetch(`/api/admin/products/${item.productId}`, { credentials: 'include' })
        .then((r) => r.ok ? r.json() : null)
        .then((p) => setProductViewProduct(p || null))
        .catch(() => setProductViewProduct(null))
        .finally(() => setProductViewLoading(false));
    }
  };

  const confirmAction = () => {
    if (!confirmModal) return;
    if (confirmModal.type === 'payment') {
      handleUpdatePaymentStatus(confirmModal.orderId, confirmModal.next as 'PAID' | 'UNPAID');
    } else {
      if (confirmModal.next === 'CANCELLED' && !statusNote.trim()) {
        addToast('Vui lòng nhập ghi chú khi huỷ đơn', 'error');
        return;
      }
      handleUpdateStatus(confirmModal.orderId, confirmModal.next);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Quản lý đơn hàng</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4 mb-4">
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Tìm mã đơn / email / người nhận / SĐT"
            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white md:col-span-2"
          />
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
          >
            <option value="all">Tất cả trạng thái</option>
            {ORDER_STATUS.map((s) => (
              <option key={s} value={s}>
                {orderStatusLabel(s)}
              </option>
            ))}
          </select>

          <select
            value={paymentMethod}
            onChange={(e) => {
              setPage(1);
              setPaymentMethod(e.target.value);
            }}
            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
          >
            <option value="all">Tất cả phương thức</option>
            {PAYMENT_METHODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
          />
          <input
            inputMode="numeric"
            value={minTotal}
            onChange={(e) => setMinTotal(e.target.value.replace(/\D+/g, ''))}
            placeholder="Tổng tiền từ"
            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
          />
          <input
            inputMode="numeric"
            value={maxTotal}
            onChange={(e) => setMaxTotal(e.target.value.replace(/\D+/g, ''))}
            placeholder="Tổng tiền đến"
            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="border border-gray-200 rounded-md px-3 h-11 text-sm bg-white"
          >
            <option value="createdAt_desc">Mới nhất</option>
            <option value="createdAt_asc">Cũ nhất</option>
            <option value="total_desc">Tổng tiền giảm dần</option>
            <option value="total_asc">Tổng tiền tăng dần</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600">
                <th className="py-3 px-2">Mã đơn</th>
                <th className="py-3 px-2">Khách hàng</th>
                <th className="py-3 px-2">Tổng tiền</th>
                <th className="py-3 px-2">Thanh toán</th>
                <th className="py-3 px-2">Trạng thái</th>
                <th className="py-3 px-2">Ngày tạo</th>
                <th className="py-3 px-2 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    Không có đơn hàng.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="border-b border-gray-100">
                    <td className="py-3 px-2 font-semibold text-gray-900">{item.orderCode || item._id}</td>
                    <td className="py-3 px-2 text-gray-700">
                      <div>{item.customerName || '—'}</div>
                      <div className="text-xs text-gray-500">{item.customerEmail || '—'}</div>
                    </td>
                    <td className="py-3 px-2 text-gray-900 font-semibold">{formatCurrency(item.totalAmount)}</td>
                    <td className="py-3 px-2 text-gray-700">
                      <div>{item.paymentMethod || '—'}</div>
                      <div className="text-xs text-gray-500">{paymentStatusLabel(item.paymentStatus)}</div>
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          item.orderStatus === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : item.orderStatus === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}
                      >
                        {orderStatusLabel(item.orderStatus)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-600">{formatDate(item.createdAt)}</td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => fetchDetail(item._id)}
                        className="px-3 py-1 rounded-md border border-gray-200 text-sm hover:bg-gray-50"
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-4 text-sm text-gray-600">
          <div>
            Trang {page} / {totalPages}
          </div>
          <div className="space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 rounded-md border border-gray-200 disabled:opacity-50"
            >
              Trước
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-2 rounded-md border border-gray-200 disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {showModal && mounted
        ? createPortal(
            // FIX: Ensure modal overlay covers entire viewport
            // IMPORTANT: Do not move modal back into admin layout
            <div className="fixed top-0 left-0 w-[100vw] h-[100vh] bg-[rgba(0,0,0,0.45)] backdrop-blur-sm flex items-center justify-center z-[999]">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto z-[1000]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">Chi tiết đơn hàng</div>
                    <div className="text-sm text-gray-500">
                    {detail?.order?.orderCode || detail?.order?._id || '—'}
                    </div>
                  </div>
                  <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-sm">
                    Đóng
                  </button>
                </div>

                {detailLoading ? (
                  <div className="p-6 text-center text-gray-500">Đang tải...</div>
                ) : detailError ? (
                  <div className="p-6 text-center text-red-600">{detailError}</div>
                ) : detail ? (
                  <div className="p-6 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="font-semibold mb-2">Thông tin khách hàng</div>
                        <div className="text-sm text-gray-700">Tên: {detail.customer?.name || detail.order?.customerName || '—'}</div>
                        <div className="text-sm text-gray-700">Email: {detail.customer?.email || detail.order?.customerEmail || '—'}</div>
                        <div className="text-sm text-gray-700">SĐT: {detail.customer?.phone || detail.order?.customerPhone || '—'}</div>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="font-semibold mb-2">Địa chỉ giao hàng</div>
                        <div className="text-sm text-gray-700">
                          {detail.order?.shippingAddress || '—'}
                        </div>
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
                              <th className="py-2 px-2 text-right">Hành động</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.order?.items?.map((it: any, idx: number) => (
                              <tr key={idx} className="border-b border-gray-100">
                                <td className="py-2 px-2 text-gray-800">{it.name}</td>
                                <td className="py-2 px-2 text-gray-700">{formatCurrency(it.price || 0)}</td>
                                <td className="py-2 px-2 text-gray-700">{it.quantity}</td>
                                <td className="py-2 px-2 text-gray-900 font-semibold">
                                  {formatCurrency((it.price || 0) * (it.quantity || 0))}
                                </td>
                                <td className="py-2 px-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => openProductView(it)}
                                    className="px-2 py-1 rounded-md border border-gray-200 text-sm hover:bg-gray-50"
                                  >
                                    Xem
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="font-semibold mb-2">Thanh toán</div>
                        <div className="text-sm text-gray-700">
                          Phương thức: {detail.order?.paymentMethod || '—'}
                        </div>
                        <div className="text-sm text-gray-700">
                          Trạng thái: {paymentStatusLabel(detail.order?.paymentStatus)}
                        </div>
                        {(() => {
                          const pmRaw = String(detail.order?.paymentMethod || '').trim().toLowerCase();
                          // Backward-compatible: some older data may still store "stripe" for banking
                          const isCod = pmRaw === 'cod';
                          const isBanking = pmRaw === 'banking' || pmRaw === 'stripe';
                          if (!isCod && !isBanking) return null;
                          const label = isBanking ? 'Banking' : 'COD';
                          return (
                            <div className="mt-3">
                              <div className="text-xs text-gray-500 mb-1">Cập nhật thanh toán ({label})</div>
                              <select
                                value={(detail.order?.paymentStatus || 'UNPAID').toUpperCase() === 'PAID' ? 'PAID' : 'UNPAID'}
                                onChange={(e) => {
                                  const next = e.target.value as 'PAID' | 'UNPAID';
                                  const current = (detail.order?.paymentStatus || 'UNPAID').toUpperCase() === 'PAID' ? 'PAID' : 'UNPAID';
                                  if (next === current) return;
                                  setConfirmModal({ type: 'payment', orderId: detail.order._id, next });
                                }}
                                className="border border-gray-200 rounded-md px-3 h-10 text-sm bg-white"
                              >
                                <option value="UNPAID">Chưa thanh toán</option>
                                <option value="PAID">Đã thanh toán</option>
                              </select>
                            </div>
                          );
                        })()}
                        <div className="text-sm text-gray-900 font-semibold">
                          Tổng tiền: {formatCurrency(detail.order?.totalAmount || 0)}
                        </div>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-4 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold mb-1">Trạng thái đơn hàng</div>
                            <div className="text-sm text-gray-500">
                              Chỉ cho phép chuyển tiếp đúng quy tắc, không quay ngược.
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <select
                              value={detail.order?.orderStatus || 'PENDING'}
                              onChange={(e) => {
                                const next = e.target.value;
                                const current = detail.order?.orderStatus || 'PENDING';
                                if (next === current) return;
                                setConfirmModal({ type: 'status', orderId: detail.order._id, next });
                              }}
                              className="border border-gray-200 rounded-md px-3 h-10 text-sm bg-white"
                            >
                              <option value={detail.order?.orderStatus || 'PENDING'}>
                                {orderStatusLabel(detail.order?.orderStatus || 'PENDING')}
                              </option>
                              {(detail.allowedNext || []).map((s) => (
                                <option key={s} value={s}>
                                  {orderStatusLabel(s)}
                                </option>
                              ))}
                            </select>
                            <input
                              value={statusNote}
                              onChange={(e) => setStatusNote(e.target.value)}
                              placeholder="Ghi chú (tuỳ chọn)"
                              className="border border-gray-200 rounded-md px-3 h-10 text-sm bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="font-semibold mb-2">Lịch sử trạng thái</div>
                      {detail.history && detail.history.length > 0 ? (
                        <div className="space-y-2">
                          {detail.history.map((h, idx) => (
                            <div key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-xs text-gray-500">
                                {formatDate(h.createdAt)}{' '}
                                {h.createdAt ? new Date(h.createdAt).toLocaleTimeString('vi-VN') : ''}
                              </span>
                              <span className="font-semibold">
                                {orderStatusLabel(h.from || '—')} → {orderStatusLabel(h.to)}
                              </span>
                              <span className="text-gray-500">({h.by?.role || 'system'})</span>
                              {h.note ? <span className="text-gray-600">- {h.note}</span> : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Chưa có lịch sử.</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}

      {productView && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[1001] bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80 rounded-t-xl">
                  <h2 className="text-lg font-semibold text-gray-900">Chi tiết sản phẩm</h2>
                  <button
                    type="button"
                    onClick={() => { setProductView(null); setProductViewProduct(null); setImageLightbox(null); }}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                    aria-label="Đóng"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="p-6 space-y-5">
                  {productViewLoading ? (
                    <div className="py-12 text-center text-gray-500">Đang tải...</div>
                  ) : (
                    <>
                      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Tên sản phẩm</div>
                        <div className="text-base font-medium text-gray-900">{productViewProduct?.name ?? productView.item?.name ?? '—'}</div>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Giá · Số lượng</div>
                        <div className="text-base text-gray-900">
                          {formatCurrency(productViewProduct?.salePrice ?? productViewProduct?.price ?? productView.item?.price ?? 0)} <span className="text-gray-500">×</span> {productView.item?.quantity ?? 1}
                        </div>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Hình ảnh</div>
                        <p className="text-xs text-gray-500 mb-2">Nhấn vào ảnh để xem phóng to</p>
                        <div className="flex flex-wrap gap-3">
                          {(productViewProduct?.images?.length ? productViewProduct.images : (productView.item?.image ? [productView.item.image] : [])).map((src: string, i: number) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setImageLightbox(src)}
                              className="block w-28 h-28 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all shadow-sm hover:shadow-md"
                            >
                              <img src={src} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                          {(!productViewProduct?.images?.length && !productView.item?.image) ? <span className="text-sm text-gray-500">Không có ảnh</span> : null}
                        </div>
                      </div>
                      {(productViewProduct?.description || productViewProduct?.metaDescription) ? (
                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Mô tả</div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{productViewProduct?.description || productViewProduct?.metaDescription || '—'}</div>
                        </div>
                      ) : null}
                      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Ghi chú đơn hàng</div>
                        <div className="text-sm text-gray-800">
                          {productView.orderDetail?.order?.customerNote ? productView.orderDetail.order.customerNote : '—'}
                        </div>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Lời nhắn kèm hoa</div>
                        <div className="text-sm text-gray-800">
                          {productView.orderDetail?.order?.giftMessage ? productView.orderDetail.order.giftMessage : '—'}
                        </div>
                      </div>
                      {productView.orderDetail?.order?.deliveryTime ? (
                        <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
                          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">Thời gian giao hàng</div>
                          <div className="text-sm font-medium text-emerald-800">{productView.orderDetail.order.deliveryTime}</div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {imageLightbox && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[1003] bg-black/90 flex items-center justify-center"
              onClick={() => setImageLightbox(null)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Escape' && setImageLightbox(null)}
              aria-label="Đóng"
            >
              <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <img
                  src={imageLightbox}
                  alt="Phóng to"
                  className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                />
                <button
                  type="button"
                  onClick={() => setImageLightbox(null)}
                  className="absolute -top-12 right-0 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  aria-label="Đóng"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>,
            document.body
          )
        : null}

      {confirmModal && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[1002] bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <div className="text-lg font-semibold text-gray-900">Thông báo</div>
                  <button
                    type="button"
                    onClick={() => setConfirmModal(null)}
                    className="text-gray-500 hover:text-gray-700 p-1"
                    aria-label="Đóng"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="p-5">
                  <p className="text-gray-700">Bạn có chắc chắn muốn thực hiện hành động này không?</p>
                </div>
                <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setConfirmModal(null)}
                    className="px-4 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50"
                  >
                    Huỷ
                  </button>
                  <button
                    type="button"
                    onClick={confirmAction}
                    className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                  >
                    Đồng ý
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export default function AdminOrders() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Quản lý đơn hàng</h1>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="py-6 text-center text-gray-500">Đang tải...</div>
        </div>
      </div>
    }>
      <AdminOrdersContent />
    </Suspense>
  );
}
