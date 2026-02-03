 'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

export default function VnpayReturnPage() {
  const params = useSearchParams();
  const { addToast } = useToast();
  const didToastRef = useRef(false);
  const didConfirmRef = useRef(false);

  const responseCode = params?.get('vnp_ResponseCode') || '';
  const txnStatus = params?.get('vnp_TransactionStatus') || '';
  const txnRef = params?.get('vnp_TxnRef') || '';
  const amount = params?.get('vnp_Amount') || '';

  const ok = String(responseCode || '') === '00' && String(txnStatus || '') === '00';
  const amountVnd = amount ? Math.round(Number(amount) / 100) : 0;

  const reason = useMemo(() => {
    // VNPay: responseCode 24 usually means cancelled
    if (String(responseCode || '') === '24') return 'cancelled';
    return 'failed';
  }, [responseCode]);

  const ordersHref = ok
    ? `/orders?success=1&source=vnpay&orderId=${encodeURIComponent(String(txnRef || ''))}`
    : `/orders?fail=1&source=vnpay&reason=${encodeURIComponent(reason)}&orderId=${encodeURIComponent(String(txnRef || ''))}`;

  // Fallback confirmation: call our server IPN handler with the same return parameters
  useEffect(() => {
    if (didConfirmRef.current) return;
    didConfirmRef.current = true;
    if (!params) return;
    const qs = params.toString();
    if (!qs) return;
    fetch(`/api/payments/vnpay/ipn?${qs}`, { method: 'GET' })
      .then(async (res) => {
        if (res.ok) return;
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.Message || json?.message || 'Không thể xác nhận giao dịch VNPay');
      })
      .catch((e: any) => {
        // Only alert on success-return but not confirmed
        if (ok) {
          addToast(e?.message || 'Không thể xác nhận giao dịch VNPay. Vui lòng kiểm tra lại sau.', 'error');
        }
      });
  }, [params, ok, addToast]);

  useEffect(() => {
    if (didToastRef.current) return;
    if (ok) return;
    didToastRef.current = true;
    const base = reason === 'cancelled' ? 'Bạn đã huỷ thanh toán VNPay.' : 'Thanh toán VNPay thất bại.';
    const code = responseCode ? ` (Mã: ${responseCode})` : '';
    addToast(`${base}${code} Vui lòng thử lại.`, 'error');
  }, [ok, addToast, reason, responseCode]);

  return (
    <div className="container-section my-10 md:my-12">
      <div className="max-w-2xl mx-auto rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className={`text-2xl font-bold ${ok ? 'text-[#0f5c5c]' : 'text-red-600'}`}>
          {ok ? 'Thanh toán VNPay thành công' : 'Thanh toán VNPay chưa thành công'}
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {ok ? 'Cảm ơn bạn! Hệ thống sẽ xử lý đơn hàng sớm nhất.' : 'Vui lòng thử lại hoặc chọn phương thức khác.'}
        </div>

        <div className="mt-4 text-sm text-gray-700 space-y-1">
          {txnRef ? (
            <div>
              <span className="font-semibold">Mã đơn (TxnRef):</span> {txnRef}
            </div>
          ) : null}
          {amount ? (
            <div>
              <span className="font-semibold">Số tiền:</span> {amountVnd.toLocaleString('vi-VN')} VNĐ
            </div>
          ) : null}
          {responseCode ? (
            <div>
              <span className="font-semibold">Mã phản hồi:</span> {responseCode}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={ordersHref}
            className="inline-flex items-center justify-center rounded-md bg-[#0f5c5c] px-4 py-2 text-white font-semibold shadow hover:bg-[#0c4d4d] transition"
          >
            Xem đơn hàng
          </Link>
          <Link
            href="/home"
            className="inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-gray-800 font-semibold hover:bg-gray-50 transition"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

